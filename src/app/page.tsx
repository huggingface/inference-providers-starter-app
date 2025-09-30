"use client";

import { useMemo, useState } from "react";
import { ChatDemo, ChatApiMode } from "@/components/chat-demo";
import { StructuredOutputDemo } from "@/components/structured-demo";
import { Input } from "@/components/ui/input";
import { MODEL_NAME } from "@/config/model";

export default function Home() {
  const [model, setModel] = useState<string>(MODEL_NAME);
  const [apiMode, setApiMode] = useState<ChatApiMode>("chat");
  const activeModel = useMemo(() => (model.trim() ? model.trim() : MODEL_NAME), [model]);
  const escapedModel = useMemo(() => activeModel.replace(/`/g, "\\`"), [activeModel]);

  const streamingSnippet = useMemo(() => {
    if (apiMode === "responses") {
      return `import { OpenAI } from "openai";

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

const stream = await client.responses.stream({
  model: "${escapedModel}",
  input: "Explain streaming."
});

for await (const event of stream) {
  if (event.type === "response.output_text.delta") {
    process.stdout.write(event.delta);
  }
}`;
    }

    return `import { OpenAI } from "openai";

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

const stream = await client.chat.completions.create({
  model: "${escapedModel}",
  messages: [{ role: "user", content: "Explain streaming." }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}`;
  }, [apiMode, escapedModel]);

  const structuredSnippet = useMemo(() => {
    if (apiMode === "responses") {
      return `// reuse the same client config as above
const result = await client.responses.create({
  model: "${escapedModel}",
  input: "Summarize the talk for PMs.",
  text: {
    format: {
      type: "json_schema",
      name: "summary",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          headline: { type: "string" },
          audience: { type: "string" },
          takeaways: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
        },
        required: ["headline", "audience", "takeaways"],
      },
    },
  },
  temperature: 0.2,
});

console.log(JSON.parse(result.output_text));`;
    }

    return `// reuse the same client config as above
const result = await client.chat.completions.create({
  model: "${escapedModel}",
  messages: [
    { role: "system", content: "Return JSON only." },
    { role: "user", content: "Summarize the talk for PMs." },
  ],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "summary",
      schema: {
        type: "object",
        properties: {
          headline: { type: "string" },
          takeaways: { type: "array", items: { type: "string" }, minItems: 2 },
        },
        required: ["headline", "takeaways"],
      },
      strict: true,
    },
  },
});

console.log(JSON.parse(result.choices[0].message?.content ?? "{}"));`;
  }, [apiMode, escapedModel]);

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
                  <code>{streamingSnippet}</code>
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
                  <code>{structuredSnippet}</code>
                </pre>
              </div>
            </details>
          </section>
        </div>
      </div>
    </main>
  );
}
