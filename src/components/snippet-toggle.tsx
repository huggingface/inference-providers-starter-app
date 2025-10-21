"use client";

interface SnippetToggleProps {
  label: string;
  code: string;
  summary?: string;
}

export function SnippetToggle({ label, code, summary }: SnippetToggleProps) {
  return (
    <details className="group rounded-xl border border-white/10 bg-[#151823] p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-white/60">
        <span>{label}</span>
        <span className="text-xs text-white/30">{summary ?? "toggle"}</span>
      </summary>
      <div className="mt-3">
        <pre className="whitespace-pre-wrap rounded-lg bg-[#10121a] p-4 text-xs leading-5 text-white/80">
          <code>{code}</code>
        </pre>
      </div>
    </details>
  );
}
