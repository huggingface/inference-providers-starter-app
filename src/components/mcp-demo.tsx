"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MODEL_NAME } from "@/config/model";
import { cn } from "@/lib/utils";
import { useStreamingRequest } from "@/hooks/useStreamingRequest";

const MCP_PROMPT = "Read the README title from the GitMCP demo.";
const MCP_TOOLS_DEFAULT = JSON.stringify(
  [
    {
      type: "mcp",
      server_label: "gitmcp",
      server_url: "https://gitmcp.io/openai/tiktoken",
      allowed_tools: ["fetch_tiktoken_documentation"],
      require_approval: "never",
    },
  ],
  null,
  2,
);
const MCP_OBJECT_DEFAULT = JSON.stringify(
  {
    servers: [
      {
        name: "gitmcp",
        version: "1.0.0",
        tools: [],
      },
    ],
  },
  null,
  2,
);

interface McpDemoProps {
  model: string;
}

export function McpDemo({ model }: McpDemoProps) {
  const [prompt, setPrompt] = useState(MCP_PROMPT);
  const [mcpToolsText, setMcpToolsText] = useState(MCP_TOOLS_DEFAULT);
  const [mcpText, setMcpText] = useState(MCP_OBJECT_DEFAULT);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { response, status, message, submit, cancel, reset } = useStreamingRequest();

  const effectiveModel = useMemo(() => (model.trim() ? model.trim() : MODEL_NAME), [model]);

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
        const parsedTools = parseJson(mcpToolsText, "tools");
        const parsedMcp = parseJson(mcpText, "mcp");
        setValidationError(null);

        await submit({
          endpoint: "/api/responses/mcp",
          body: {
            prompt: trimmedPrompt,
            model: effectiveModel,
            ...(parsedTools ? { tools: parsedTools } : undefined),
            ...(parsedMcp ? { mcp: parsedMcp } : undefined),
          },
          completionMessage: "Responses stream complete.",
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Invalid payload.";
        setValidationError(reason);
        reset();
      }
    },
    [prompt, parseJson, mcpToolsText, mcpText, submit, effectiveModel, reset],
  );

  return (
    <Card className="w-full max-w-2xl text-white">
      <CardHeader>
        <CardTitle>MCP server demo</CardTitle>
        <CardDescription>
          Attach Model Context Protocol servers so the model can invoke remote tools during streaming.
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
            <Label htmlFor="mcp-prompt">Prompt</Label>
            <Textarea
              id="mcp-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask the model to leverage an MCP server."
              className="resize-none"
            />
          </div>

          <div className="space-y-2 text-xs text-white/60">
            <Label htmlFor="mcp-tools" className="text-[10px] uppercase tracking-[0.16em]">
              MCP tools payload (JSON)
            </Label>
            <Textarea
              id="mcp-tools"
              value={mcpToolsText}
              onChange={(event) => setMcpToolsText(event.target.value)}
              className="min-h-[110px] text-xs"
            />
            <p>Expose MCP servers to the model via the shared tools array.</p>
          </div>

          <div className="space-y-2 text-xs text-white/60">
            <Label htmlFor="mcp-object" className="text-[10px] uppercase tracking-[0.16em]">
              MCP servers object (JSON)
            </Label>
            <Textarea
              id="mcp-object"
              value={mcpText}
              onChange={(event) => setMcpText(event.target.value)}
              className="min-h-[110px] text-xs"
            />
            <p>Forward server metadata, versions, and tool lists to the Responses API.</p>
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
                "Run MCP demo"
              )}
            </Button>
            <Button type="button" variant="ghost" onClick={cancel} disabled={status !== "streaming"}>
              Stop
            </Button>
          </div>
          <p className="text-xs text-white/40">
            Pair this with a local MCP server or connector to serve your own tools.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
