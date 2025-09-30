"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MODEL_NAME } from "@/config/model";
import type { ChatApiMode } from "@/components/chat-demo";
import { useStructuredRequest } from "@/hooks/useStructuredRequest";

interface StructuredOutputDemoProps {
  model: string;
  mode: ChatApiMode;
}

export function StructuredOutputDemo({ model, mode }: StructuredOutputDemoProps) {
  const [prompt, setPrompt] = useState(
    "Summarize the streaming behavior for product managers, include the audience and two bullet takeaways.",
  );
  const { result, raw, status, message, schemaHint, submit, reset } = useStructuredRequest();

  useEffect(() => {
    reset();
  }, [mode, reset]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim()) {
      return;
    }

    const effectiveModel = model || MODEL_NAME;
    await submit({
      endpoint: "/api/structured",
      body: { prompt, model: effectiveModel, mode },
    });
  }

  const displayText = result
    ? JSON.stringify(result, null, 2)
    : raw ?? "Waiting for structured output...";

  return (
    <Card className="w-full max-w-2xl text-white">
      <CardHeader>
        <CardTitle>Structured output demo</CardTitle>
        <CardDescription>Ask for JSON. The server enforces a schema and returns a typed object.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-white/40">
            <span>Model</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/60">
              {model || MODEL_NAME}
            </span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/60">
              {mode === "responses" ? "Responses API" : "Chat completions"}
            </span>
          </div>

          <div className="space-y-3">
            <Label htmlFor="structured-prompt">Prompt</Label>
            <Textarea
              id="structured-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="resize-none"
              placeholder="Explain streaming for engineers and include a next action."
            />
          </div>

          <div className="rounded-xl bg-[#1a1e2b] p-4">
            <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-white/40">JSON</div>
            <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-left text-xs leading-6 text-white/80">
              {displayText}
            </pre>
          </div>

          {message ? (
            <p className={`text-sm ${status === "error" ? "text-[#ff8080]" : "text-white/60"}`}>{message}</p>
          ) : null}
          {schemaHint ? (
            <p className="text-xs text-white/40">
              {schemaHint} — try a schema-aware provider like <code>meta-llama/Meta-Llama-3-8B-Instruct</code>.
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Generating JSON..." : "Generate JSON"}
          </Button>
          <p className="text-xs text-white/40">
            {mode === "responses"
              ? "Uses the Responses API with a JSON schema format when supported."
              : "Uses the Chat Completions API with response_format for schema locking."}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
