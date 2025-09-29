"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MODEL_NAME } from "@/config/model";

interface StructuredOutputDemoProps {
  model: string;
}

export function StructuredOutputDemo({ model }: StructuredOutputDemoProps) {
  const [prompt, setPrompt] = useState(
    "Summarize the streaming behavior for product managers, include the audience and two bullet takeaways.",
  );
  const [result, setResult] = useState<object | null>(null);
  const [raw, setRaw] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [schemaHint, setSchemaHint] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim() || status === "loading") {
      return;
    }

    setStatus("loading");
    setMessage(null);
    setResult(null);
    setRaw(null);
    setSchemaHint(null);

    try {
      const effectiveModel = model || MODEL_NAME;

      const res = await fetch("/api/structured", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, model: effectiveModel }),
      });

      if (!res.ok) {
        const payload = await res.text();
        let reason = `Request failed with status ${res.status}`;
        try {
          const parsed = JSON.parse(payload);
          if (parsed && typeof parsed.error === "string") {
            reason = parsed.error;
          }
        } catch {
          if (payload) {
            reason = payload;
          }
        }
        throw new Error(reason);
      }

      const json = await res.json();
      const data = json && typeof json === "object" ? json.data : undefined;
      const rawText = json && typeof json === "object" ? json.raw : undefined;
      const metaMessage = json?.meta?.message as string | undefined;
      const metaSchemaError = json?.meta?.schemaError as string | undefined;

      setResult(data && typeof data === "object" ? data : null);
      setRaw(typeof rawText === "string" && rawText.length ? rawText : null);
      setSchemaHint(metaSchemaError || null);
      setMessage(metaMessage || "Structured output ready.");
      setStatus("idle");
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Something went wrong.");
      }
      setStatus("error");
    }
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
            Uses the same client with `response_format` to lock the schema when supported.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
