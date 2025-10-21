"use client";

import { useCallback, useEffect, useState } from "react";

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
  title?: string;
  description?: string;
  initialPrompt?: string;
  promptPlaceholder?: string;
  completionMessage?: string;
}

function defaultPrompt(mode: ChatApiMode) {
  if (mode === "responses") {
    return "Give me a two sentence pitch for streaming via Hugging Face Inference Providers.";
  }
  return "Explain how streaming works for Hugging Face Inference Providers.";
}

export function ChatDemo({
  model,
  mode,
  title,
  description,
  initialPrompt,
  promptPlaceholder,
  completionMessage,
}: ChatDemoProps) {
  const [prompt, setPrompt] = useState(initialPrompt ?? defaultPrompt(mode));
  const { response, status, message, submit, cancel, reset } = useStreamingRequest();

  const effectiveModel = model.trim() || MODEL_NAME;
  const resolvedTitle = title ?? (mode === "responses" ? "Responses streaming demo" : "Chat completions streaming demo");
  const resolvedDescription =
    description ??
    (mode === "responses"
      ? "Send a prompt to the Responses API and watch the text stream back."
      : "Stream a completion from the Chat Completions API.");
  const resolvedCompletionMessage =
    completionMessage ?? (mode === "responses" ? "Responses stream complete." : "Streaming complete.");
  const placeholder =
    promptPlaceholder ??
    (mode === "responses"
      ? "Try: Give me three key ideas for teaching streaming inference."
      : "Try: Outline three benefits of streaming completions.");

  useEffect(() => {
    reset();
    setPrompt(initialPrompt ?? defaultPrompt(mode));
  }, [mode, initialPrompt, reset]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) {
        return;
      }

      const endpoint = mode === "responses" ? "/api/responses/stream" : "/api/chat/stream";

      await submit({
        endpoint,
        body:
          mode === "responses"
            ? {
                prompt: trimmedPrompt,
                model: effectiveModel,
              }
          : {
              messages: [
                {
                  role: "user" as const,
                  content: trimmedPrompt,
                },
              ],
              model: effectiveModel,
            },
        completionMessage: resolvedCompletionMessage,
      });
    },
    [mode, prompt, effectiveModel, submit, resolvedCompletionMessage],
  );

  const handleCancel = useCallback(() => cancel(), [cancel]);

  return (
    <Card className="w-full max-w-2xl text-white">
      <CardHeader>
        <CardTitle>{resolvedTitle}</CardTitle>
        <CardDescription>{resolvedDescription}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-white/40">
            <span>Model</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/60">
              {effectiveModel}
            </span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/60">
              {mode === "responses" ? "Responses API" : "Chat completions"}
            </span>
          </div>

          <div className="space-y-3">
            <Label htmlFor={`prompt-${mode}`}>Prompt</Label>
            <Textarea
              id={`prompt-${mode}`}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={placeholder}
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
            <p className={cn("text-sm", status === "error" ? "text-[#ff8080]" : "text-white/60")}>{message}</p>
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
            <Button type="button" variant="ghost" onClick={handleCancel} disabled={status !== "streaming"}>
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
