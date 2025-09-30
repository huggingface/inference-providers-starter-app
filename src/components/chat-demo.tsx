"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MODEL_NAME } from "@/config/model";
import { cn } from "@/lib/utils";
import { useStreamingRequest } from "@/hooks/useStreamingRequest";

export type ChatApiMode = "chat" | "responses";

interface ChatDemoProps {
  model: string;
  mode: ChatApiMode;
}

export function ChatDemo({ model, mode }: ChatDemoProps) {
  const [prompt, setPrompt] = useState(
    "Give me a two sentence pitch for streaming via Hugging Face Inference Providers.",
  );
  const { response, status, message, submit, cancel, reset } = useStreamingRequest();
  const completionMessage = mode === "responses" ? "Responses stream complete." : "Streaming complete.";

  useEffect(() => {
    reset();
  }, [mode, reset]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim()) {
      return;
    }

    const effectiveModel = model || MODEL_NAME;
    const isResponses = mode === "responses";

    await submit({
      endpoint: isResponses ? "/api/responses" : "/api/chat",
      body: isResponses
        ? {
            prompt,
            model: effectiveModel,
          }
        : {
            messages: [
              {
                role: "user" as const,
                content: prompt,
              },
            ],
            model: effectiveModel,
          },
      completionMessage,
    });
  }
  const handleCancel = () => cancel();

  return (
    <Card className="w-full max-w-2xl text-white">
      <CardHeader>
        <CardTitle>Streaming demo</CardTitle>
        <CardDescription>Send a prompt. The response streams back token by token.</CardDescription>
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
            <Label htmlFor="prompt">Ask anything</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Try: Give me three key ideas for teaching streaming inference."
              className="resize-none"
            />
          </div>

          <div className="rounded-xl bg-[#1a1e2b] p-4">
            <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-white/40">Output</div>
            <div
              className={cn(
                "min-h-[140px] whitespace-pre-wrap text-sm leading-6 text-white",
                status === "idle" && !response ? "text-white/35" : undefined,
              )}
            >
              {response || "Waiting for tokens..."}
            </div>
          </div>

          {message ? (
            <p
              className={cn(
                "text-sm",
                status === "error" ? "text-[#ff8080]" : "text-white/60",
              )}
            >
              {message}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <Button type="submit" disabled={status === "streaming"}>
              {status === "streaming" ? (
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-[#ffb100]" />
                  Streaming...
                </span>
              ) : (
                "Generate"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={status !== "streaming"}
            >
              Stop
            </Button>
          </div>
          <p className="text-xs text-white/40">
            Set <span className="font-semibold">HF_TOKEN</span> in your environment before running locally.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
