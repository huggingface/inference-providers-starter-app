"use client";

import { useMemo, useState } from "react";
import { ChatDemo } from "@/components/chat-demo";
import { StructuredOutputDemo } from "@/components/structured-demo";
import { Input } from "@/components/ui/input";
import { MODEL_NAME } from "@/config/model";

export default function Home() {
  const [model, setModel] = useState<string>(MODEL_NAME);
  const activeModel = useMemo(() => (model.trim() ? model.trim() : MODEL_NAME), [model]);
  const escapedModel = useMemo(() => activeModel.replace(/`/g, "\\`"), [activeModel]);

  const streamingSnippet = `import { OpenAI } from "openai";

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

  const structuredSnippet = `// reuse the same client config as above
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

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-10 text-center sm:text-left">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">
            Hugging Face Inference Providers
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Stream tokens and return JSON with one client
          </h1>
          <p className="text-sm text-white/60">
            Set the model once, then compare streaming text and structured output flows side by side.
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
        </div>

        <div className="space-y-12">
          <section className="mx-auto w-full max-w-2xl space-y-4 text-left">
            <ChatDemo model={activeModel} />
            <details className="group rounded-xl border border-white/10 bg-[#151823] p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-white/60">
                <span>Streaming snippet</span>
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
            <StructuredOutputDemo model={activeModel} />
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
