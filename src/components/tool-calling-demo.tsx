"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MODEL_NAME } from "@/config/model";
import { cn } from "@/lib/utils";
import { useStreamingRequest } from "@/hooks/useStreamingRequest";

const TOOL_PROMPT = "Use the library tool to tell me today's hours for the Mission branch.";
const TOOLS_DEFAULT = JSON.stringify(
  [
    {
      type: "function",
      name: "get_library_details",
      description: "Look up branch information from our demo library directory.",
      parameters: {
        type: "object",
        properties: {
          branch: {
            type: "string",
            description: "One of downtown, mission, or sunset.",
          },
        },
        required: ["branch"],
      },
    },
  ],
  null,
  2,
);
const TOOL_CHOICE_DEFAULT = JSON.stringify(
  {
    type: "function",
    name: "get_library_details",
  },
  null,
  2,
);

interface ToolCallingDemoProps {
  model: string;
}

export function ToolCallingDemo({ model }: ToolCallingDemoProps) {
  const [prompt, setPrompt] = useState(TOOL_PROMPT);
  const [toolsText, setToolsText] = useState(TOOLS_DEFAULT);
  const [toolChoiceText, setToolChoiceText] = useState(TOOL_CHOICE_DEFAULT);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { response, status, message, submit, cancel, reset } = useStreamingRequest();
  const effectiveModel = model.trim() || MODEL_NAME;

  useEffect(() => {
    reset();
    setValidationError(null);
  }, [effectiveModel, reset]);

  const parseJson = useCallback((value: string, label: string) => {
    if (!value.trim()) {
      return undefined;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown parse error.";
      throw new Error(`Invalid ${label} JSON: ${reason}`);
    }
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) {
        return;
      }

      try {
        const parsedTools = parseJson(toolsText, "tools");
        const parsedToolChoice = parseJson(toolChoiceText, "tool choice");
        setValidationError(null);

        await submit({
          endpoint: "/api/responses/tool-calling",
          body: {
            prompt: trimmedPrompt,
            model: effectiveModel,
            ...(parsedTools ? { tools: parsedTools } : undefined),
            ...(parsedToolChoice ? { tool_choice: parsedToolChoice } : undefined),
          },
          completionMessage: "Responses stream complete.",
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Invalid payload.";
        setValidationError(reason);
        reset();
      }
    },
    [prompt, parseJson, toolsText, toolChoiceText, submit, effectiveModel, reset],
  );

  return (
    <Card className="w-full max-w-2xl text-white">
      <CardHeader>
        <CardTitle>Responses tool calling demo</CardTitle>
        <CardDescription>
          Stream a response, capture the function call, and submit outputs back to the model.
        </CardDescription>
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
              Responses API
            </span>
          </div>

          <div className="space-y-3">
            <Label htmlFor="tool-call-prompt">Prompt</Label>
            <Textarea
              id="tool-call-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask the model to call your function."
              className="resize-none"
            />
          </div>

          <div className="space-y-2 text-xs text-white/60">
            <Label htmlFor="tool-call-tools" className="text-[10px] uppercase tracking-[0.16em]">
              Tools payload (JSON)
            </Label>
            <Textarea
              id="tool-call-tools"
              value={toolsText}
              onChange={(event) => setToolsText(event.target.value)}
              className="min-h-[110px] text-xs"
            />
            <p>Describe the functions the model is allowed to call.</p>
          </div>

          <div className="space-y-2 text-xs text-white/60">
            <Label htmlFor="tool-call-choice" className="text-[10px] uppercase tracking-[0.16em]">
              Tool choice (JSON)
            </Label>
            <Textarea
              id="tool-call-choice"
              value={toolChoiceText}
              onChange={(event) => setToolChoiceText(event.target.value)}
              className="min-h-[80px] text-xs"
            />
            <p>Pin the call to a specific tool when you want to enforce usage.</p>
          </div>

          <div className="rounded-xl bg-[#1a1e2b] p-4">
            <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-white/40">Output</div>
            <div
              className={cn(
                "min-h-[140px] whitespace-pre-wrap text-xs leading-6",
                response ? "text-white" : "text-white/40",
              )}
            >
              {response || (status === "streaming" ? "Streaming..." : "Run the demo to stream a response.")}
            </div>
          </div>

          {[validationError, message].filter(Boolean).map((msg, index) => (
            <p
              key={index}
              className={cn(
                "text-xs",
                msg === validationError || status === "error" ? "text-[#ff8080]" : "text-white/60",
              )}
            >
              {msg}
            </p>
          ))}
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
                "Run tool calling demo"
              )}
            </Button>
            <Button type="button" variant="ghost" onClick={cancel} disabled={status !== "streaming"}>
              Stop
            </Button>
          </div>
          <p className="text-xs text-white/40">
            The server submits tool outputs automatically so the model can finish the response.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
