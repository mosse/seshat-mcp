/**
 * AI narrative generation layer.
 *
 * Calls Claude to generate counterfactual narratives based on the
 * estimation engine output and historical analogues. Returns a
 * ReadableStream for progressive rendering on the client.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  Polity,
  Scenario,
  ProjectionResult,
  PolityDetail,
} from '@seshat/shared';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a cliodynamics analyst specialising in quantitative history.
You explain counterfactual historical scenarios in an engaging, accessible way
for general audiences.

RULES:
- Ground every claim in the provided analogue societies and model outputs.
- Never state outcomes as certain. Use language like "patterns suggest", "comparable societies experienced", "the model estimates".
- Confidence fades over time — always note where projections become speculative (beyond ~300 years).
- Keep the tone curious and engaging, not academic. No jargon without explanation.
- Never exceed 500 words total.
- Always mention at least 2 specific analogue societies by name.
- Structure: immediate_effects → ripple_effects → geopolitical_response → confidence_limits
- Return valid JSON matching exactly this schema:
{
  "headline": "string — one punchy sentence summarising the key finding",
  "immediate_effects": "string — ~100 words on what changed first",
  "ripple_effects": "string — ~150 words on second-order effects",
  "geopolitical_response": "string — ~100 words on how neighbours respond",
  "confidence_limits": "string — ~80 words on where the model becomes speculative"
}`;

export interface NarrativeParams {
  polity: Polity | PolityDetail;
  scenario: Scenario;
  injectionYear: number;
  projectionResult: ProjectionResult;
}

/**
 * Generate a counterfactual narrative as a streaming response.
 *
 * Returns a ReadableStream that emits the raw text of Claude's response
 * token by token. The client should buffer until complete, then parse as JSON.
 */
export function streamNarrative(params: NarrativeParams): ReadableStream {
  const { polity, scenario, projectionResult, injectionYear } = params;

  const analogueDescriptions = projectionResult.analogues
    .slice(0, 5)
    .map(
      (a) =>
        `- ${a.polity.name}: similarity ${(a.similarity_score * 100).toFixed(0)}%, ` +
        `complexity delta ${a.delta > 0 ? '+' : ''}${a.delta.toFixed(2)}`
    )
    .join('\n');

  const baselineStart = projectionResult.baseline[0]?.pc1_composite ?? 0;
  const delta = projectionResult.delta_complexity;

  const userPrompt = `Generate a counterfactual narrative for:

POLITY: ${polity.name} (${polity.start_year}–${polity.end_year})
REGION: ${polity.region}
SCENARIO: ${scenario.label} — injected in ${injectionYear}
BASELINE COMPLEXITY AT INJECTION: ${baselineStart.toFixed(2)}
PROJECTED COMPLEXITY CHANGE: ${delta > 0 ? '+' : ''}${delta.toFixed(2)} by century 3

ANALOGUES (societies with similar characteristics):
${analogueDescriptions || 'No close analogues found — use general historical patterns.'}

REAL-WORLD EXAMPLE: ${scenario.real_world_example}

${projectionResult.notes.length > 0 ? `CAVEATS:\n${projectionResult.notes.join('\n')}` : ''}

Return the JSON response described in the system prompt.`;

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = await client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
        });

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        controller.close();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Narrative generation failed';
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              headline: 'Unable to generate narrative',
              immediate_effects: message,
              ripple_effects: '',
              geopolitical_response: '',
              confidence_limits:
                'The narrative could not be generated. The numerical results above are still valid.',
            })
          )
        );
        controller.close();
      }
    },
  });
}
