"use client";

import { useState, type ReactNode } from "react";

import { ChatDemo } from "@/components/chat-demo";
import { McpDemo } from "@/components/mcp-demo";
import { SnippetToggle } from "@/components/snippet-toggle";
import { StructuredOutputDemo } from "@/components/structured-demo";
import { ToolCallingDemo } from "@/components/tool-calling-demo";
import { Input } from "@/components/ui/input";
import { MODEL_NAME } from "@/config/model";
import { buildResponsesExtras } from "@/config/responses-extras";
import { buildSnippets } from "@/config/snippets";

interface CapabilityProps {
  title: string;
  description: string;
  snippetLabel: string;
  snippetCode: string;
  demo: ReactNode;
}

function Capability({ title, description, demo, snippetLabel, snippetCode }: CapabilityProps) {
  return (
    <article className="space-y-4 text-left">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-white/60">{description}</p>
      </div>
      <div>{demo}</div>
      <SnippetToggle label={snippetLabel} code={snippetCode} />
    </article>
  );
}

export default function Home() {
  const [model, setModel] = useState<string>(MODEL_NAME);
  const activeModel = model.trim() || MODEL_NAME;
  const chatSnippets = buildSnippets("chat", activeModel);
  const responsesSnippets = buildSnippets("responses", activeModel);
  const { toolCalling, mcpServer } = buildResponsesExtras(activeModel);

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-12 text-center sm:text-left">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">
            Hugging Face Inference Providers
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Use SoTA Open LLMs with the familiar OpenAI SDK
          </h1>
          <p className="text-sm text-white/60">
            Explore how to call Hugging Face-hosted models via the OpenAI SDK, complete with streaming, structured JSON,
            tool calls, and MCP integrations.
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

        <section className="space-y-8 text-left">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">Responses API</h2>
            <p className="text-sm text-white/60">
              Showcase the unified Responses endpoint with streaming, tooling, and MCP support.
            </p>
          </div>
          <div className="space-y-10">
            <Capability
              title="Stream Responses"
              description="Use responses.stream to deliver text as it is generated."
              snippetLabel="Responses streaming snippet"
              snippetCode={responsesSnippets.streaming}
              demo={<ChatDemo model={activeModel} mode="responses" />}
            />
            <Capability
              title="Structured Responses"
              description="Lock the output to a JSON schema and surface raw fallbacks when parsing fails."
              snippetLabel="Responses structured output snippet"
              snippetCode={responsesSnippets.structured}
              demo={<StructuredOutputDemo model={activeModel} mode="responses" />}
            />
            <Capability
              title="Responses Tool Calling"
              description="Provide function definitions and automatically submit tool outputs back to the model."
              snippetLabel="Tool calling snippet"
              snippetCode={toolCalling}
              demo={<ToolCallingDemo model={activeModel} />}
            />
            <Capability
              title="Responses with MCP"
              description="Connect Model Context Protocol servers so the model can invoke remote tools mid-stream."
              snippetLabel="MCP snippet"
              snippetCode={mcpServer}
              demo={<McpDemo model={activeModel} />}
            />
          </div>
        </section>

        <section className="space-y-8 text-left">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">Chat Completions API</h2>
            <p className="text-sm text-white/60">
              Focus on conversational flows with OpenAI-compatible chat endpoints.
            </p>
          </div>
          <div className="space-y-10">
            <Capability
              title="Stream Chat Completions"
              description="Send chat messages and watch tokens arrive incrementally over a streaming connection."
              snippetLabel="Chat completions streaming snippet"
              snippetCode={chatSnippets.streaming}
              demo={
                <ChatDemo
                  model={activeModel}
                  mode="chat"
                  title="Chat streaming demo"
                  description="Stream tokens directly from the Chat Completions API."
                  initialPrompt="Explain how streaming completions differ from Responses API streaming."
                  promptPlaceholder="Try: Summarize why you might still want chat completions."
                />
              }
            />
            <Capability
              title="Structured Chat Output"
              description="Enforce JSON responses from chat completions using response_format."
              snippetLabel="Chat structured output snippet"
              snippetCode={chatSnippets.structured}
              demo={
                <StructuredOutputDemo
                  model={activeModel}
                  mode="chat"
                />
              }
            />
          </div>
        </section>
      </div>
    </main>
  );
}
