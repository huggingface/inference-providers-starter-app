"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type StreamStatus = "idle" | "streaming" | "error";

const MODEL_NAME = "deepseek-ai/DeepSeek-V3.1:fireworks-ai";

export function ChatDemo() {
  const [prompt, setPrompt] = useState(
    "Explain how streaming responses from Hugging Face Inference Providers keeps the UI feeling real-time.",
  );
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim() || status === "streaming") {
      return;
    }

    setResponse("");
    setStatus("streaming");
    setMessage(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error("The server did not return a readable stream.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunkValue = decoder.decode(value, { stream: true });
        if (chunkValue) {
          setResponse((prev) => prev + chunkValue);
        }
      }

      setStatus("idle");
      setMessage("Streaming complete.");
    } catch (error) {
      if (controller.signal.aborted) {
        setMessage("Stream cancelled.");
        setStatus("idle");
      } else if (error instanceof Error) {
        setMessage(error.message);
        setStatus("error");
      } else {
        setMessage("Something went wrong.");
        setStatus("error");
      }
    } finally {
      abortControllerRef.current = null;
    }
  }

  function handleCancel() {
    if (status === "streaming" && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus("idle");
    }
  }

  return (
    <Card className="w-full max-w-2xl text-white">
      <CardHeader>
        <CardTitle>Streaming text with Hugging Face</CardTitle>
        <CardDescription>
          Follow the chunks as they arrive from the Inference Provider router via the OpenAI SDK.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
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

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-white/50">
              <span>Live response</span>
              <span>{MODEL_NAME}</span>
            </div>
            <div
              className={cn(
                "min-h-[160px] whitespace-pre-wrap text-sm leading-6 text-white",
                status === "idle" && !response ? "text-white/40" : undefined,
              )}
            >
              {response || "Waiting for the next generation..."}
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
