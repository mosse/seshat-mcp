'use client';

import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  /** Optional short label shown in the block's top bar (e.g. "bash", "json") */
  label?: string;
}

export function CodeBlock({ code, label }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — fail silently.
    }
  };

  return (
    <div className="not-prose group relative my-6 overflow-hidden rounded-xl border border-rule bg-ink-900">
      <div className="flex items-center justify-between border-b border-rule px-4 py-2">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-parchment-faint">
          {label ?? 'code'}
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs text-parchment-dim transition-colors hover:text-brass-300"
        >
          <span aria-hidden="true">{copied ? '✓' : '⧉'}</span>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-parchment-dim">
        <code className="font-mono">{code}</code>
      </pre>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </div>
  );
}
