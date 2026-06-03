'use client';

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatCenturyShort } from '@seshat/shared';
import type { ProjectionPoint, ConfidenceBand } from '@seshat/shared';

interface ComplexityChartProps {
  baseline: ProjectionPoint[];
  counterfactual?: ProjectionPoint[];
  confidenceBands?: ConfidenceBand[];
  animated?: boolean;
}

// Palette tied to the ink/brass/patina theme
const PATINA = '#5fbda9'; // historical baseline
const BRASS = '#e6bd74'; // counterfactual
const MASK = '#15120d'; // ink-850, masks the inner confidence band
const GRID = 'rgba(236,228,211,0.08)';
const AXIS = '#8d8474';

export function ComplexityChart({
  baseline,
  counterfactual,
  confidenceBands,
  animated = true,
}: ComplexityChartProps) {
  const data = baseline.map((b, i) => {
    const cf = counterfactual?.[i];
    const band = confidenceBands?.[i];
    return {
      century: b.century,
      centuryLabel: formatCenturyShort(b.century),
      baseline: round(b.pc1_composite),
      counterfactual: cf ? round(cf.pc1_composite) : undefined,
      bandLow: band ? round(band.p5) : undefined,
      bandHigh: band ? round(band.p95) : undefined,
      band25: band ? round(band.p25) : undefined,
      band75: band ? round(band.p75) : undefined,
    };
  });

  // Text alternative for assistive technology
  const first = baseline[0];
  const last = baseline[baseline.length - 1];
  const ariaLabel = counterfactual
    ? `Line chart comparing the historical social-complexity trajectory against the counterfactual projection across ${baseline.length} centuries, with a shaded confidence interval that widens over time.`
    : `Line chart of the social-complexity trajectory across ${baseline.length} centuries, from ${first?.pc1_composite.toFixed(
        2
      )} to ${last?.pc1_composite.toFixed(2)}.`;

  return (
    <div className="h-80 w-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 24, left: 4, bottom: 4 }}
        >
          <defs>
            <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRASS} stopOpacity={0.22} />
              <stop offset="100%" stopColor={BRASS} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke={GRID} vertical={false} />
          <XAxis
            dataKey="centuryLabel"
            tick={{ fontSize: 11, fill: AXIS, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: AXIS, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={false}
            width={48}
            label={{
              value: 'Complexity index',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 11, fill: AXIS, textAnchor: 'middle' },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1c1812',
              border: '1px solid rgba(236,228,211,0.18)',
              borderRadius: '10px',
              fontSize: '13px',
              color: '#ece4d3',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            }}
            labelStyle={{ color: '#8d8474', fontFamily: 'var(--font-mono)' }}
            itemStyle={{ color: '#ece4d3' }}
            cursor={{ stroke: 'rgba(236,228,211,0.2)' }}
            formatter={(value, name) => [
              Number(value).toFixed(2),
              name === 'baseline'
                ? 'Historical'
                : name === 'counterfactual'
                  ? 'Counterfactual'
                  : String(name),
            ]}
            labelFormatter={(label) => `Century: ${label}`}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: AXIS }}
            formatter={(value) => (
              <span style={{ color: '#b9b0a0' }}>
                {value === 'baseline'
                  ? 'Historical'
                  : value === 'counterfactual'
                    ? 'Counterfactual'
                    : value}
              </span>
            )}
          />

          {/* Outer confidence band (p5–p95) */}
          {confidenceBands && (
            <Area
              dataKey="bandHigh"
              stroke="none"
              fill="url(#bandGrad)"
              isAnimationActive={animated}
              name="95% confidence"
              legendType="none"
            />
          )}
          {confidenceBands && (
            <Area
              dataKey="bandLow"
              stroke="none"
              fill={MASK}
              fillOpacity={1}
              isAnimationActive={false}
              legendType="none"
            />
          )}

          {/* Inner band (p25–p75) */}
          {confidenceBands && (
            <Area
              dataKey="band75"
              stroke="none"
              fill={BRASS}
              fillOpacity={0.16}
              isAnimationActive={animated}
              name="50% confidence"
              legendType="none"
            />
          )}
          {confidenceBands && (
            <Area
              dataKey="band25"
              stroke="none"
              fill={MASK}
              fillOpacity={1}
              isAnimationActive={false}
              legendType="none"
            />
          )}

          {/* Historical baseline */}
          <Line
            type="monotone"
            dataKey="baseline"
            stroke={PATINA}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={animated}
            animationDuration={1500}
          />

          {/* Counterfactual */}
          {counterfactual && (
            <Line
              type="monotone"
              dataKey="counterfactual"
              stroke={BRASS}
              strokeWidth={2.5}
              strokeDasharray="7 5"
              dot={false}
              isAnimationActive={animated}
              animationDuration={2000}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
