"use client";

import { useMemo, useState } from "react";
import { ChatDemo, ChatApiMode } from "@/components/chat-demo";
import { StructuredOutputDemo } from "@/components/structured-demo";
import { Input } from "@/components/ui/input";
import { MODEL_NAME } from "@/config/model";
import { buildSnippets } from "@/config/snippets";

export default function Home() {
  const [model, setModel] = useState<string>(MODEL_NAME);
  const [apiMode, setApiMode] = useState<ChatApiMode>("chat");
  const activeModel = useMemo(() => (model.trim() ? model.trim() : MODEL_NAME), [model]);

  const snippets = useMemo(() => buildSnippets(apiMode, activeModel), [apiMode, activeModel]);

  const toggleClass = (target: ChatApiMode) =>
    `rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] transition ${
      apiMode === target ? "bg-[#ffb100] text-[#1c1c1c]" : "text-white/50 hover:text-white"
    }`;

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-10 text-center sm:text-left">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">
            Hugging Face Inference Providers
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Use SoTA Open LLMs with the familiar OpenAI SDK
          </h1>
          <p className="text-sm text-white/60">
            Choose an open LLM, then compare streaming text and structured output flows side by side.
          </p>
          <div className="text-left">
            <label
              htmlFor="model-input"
              className="flex items-center gap-3 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-left text-white/60 transition focus-within:border-[#ffb100] focus-within:text-white"
            >
              <span className="text-[10px] uppercase tracking-[0.16em]">Model</span>
              <Input
                id="model-input"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder={MODEL_NAME}
                aria-label="Model"
                className="flex-1"
              />
            </label>
          </div>
          <div className="flex flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[10px] uppercase tracking-[0.14em] text-white/40">API mode</span>
            <div className="inline-flex rounded-full bg-white/10 p-1">
              <button type="button" className={toggleClass("chat")} onClick={() => setApiMode("chat")}>
                Chat completions
              </button>
              <button type="button" className={toggleClass("responses")} onClick={() => setApiMode("responses")}>
                Responses
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-12">
          <section className="mx-auto w-full max-w-2xl space-y-4 text-left">
            <ChatDemo model={activeModel} mode={apiMode} />
            <details className="group rounded-xl border border-white/10 bg-[#151823] p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-white/60">
                <span>{apiMode === "responses" ? "Responses snippet" : "Chat completions snippet"}</span>
                <span className="text-xs text-white/30">toggle</span>
              </summary>
              <div className="mt-3">
                <pre className="whitespace-pre-wrap rounded-lg bg-[#10121a] p-4 text-xs leading-5 text-white/80">
                  <code>{snippets.streaming}</code>
                </pre>
              </div>
            </details>
          </section>

          <section className="mx-auto w-full max-w-2xl space-y-4 text-left">
            <StructuredOutputDemo model={activeModel} mode={apiMode} />
            <details className="group rounded-xl border border-white/10 bg-[#151823] p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-white/60">
                <span>Structured snippet</span>
                <span className="text-xs text-white/30">toggle</span>
              </summary>
              <div className="mt-3">
                <pre className="whitespace-pre-wrap rounded-lg bg-[#10121a] p-4 text-xs leading-5 text-white/80">
                  <code>{snippets.structured}</code>
                </pre>
              </div>
            </details>
          </section>
        </div>
      </div>
    </main>
  );
}
