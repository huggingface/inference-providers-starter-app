"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function StructuredOutputDemo() {
  const [prompt, setPrompt] = useState(
    "Summarize the streaming behavior for product managers, include the audience and two bullet takeaways.",
  );
  const [result, setResult] = useState<object | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim() || status === "loading") {
      return;
    }

    setStatus("loading");
    setMessage(null);
    setResult(null);

    try {
      const res = await fetch("/api/structured", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
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
      if (json && typeof json.data === "object") {
        setResult(json.data);
        setMessage("Structured output ready.");
        setStatus("idle");
      } else {
        throw new Error("Unexpected response payload.");
      }
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Something went wrong.");
      }
      setStatus("error");
    }
  }

  return (
    <Card className="w-full max-w-2xl text-white">
      <CardHeader>
        <CardTitle>Structured output demo</CardTitle>
        <CardDescription>Ask for JSON. The server enforces a schema and returns a typed object.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
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
            <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-white/40">JSON</p>
            <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-left text-xs leading-6 text-white/80">
              {result ? JSON.stringify(result, null, 2) : "Waiting for structured output..."}
            </pre>
          </div>

          {message ? (
            <p className={`text-sm ${status === "error" ? "text-[#ff8080]" : "text-white/60"}`}>{message}</p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Generating JSON..." : "Generate JSON"}
          </Button>
          <p className="text-xs text-white/40">
            Uses the same client with `response_format` to lock the schema.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
