"use client";

import { ChangeEvent, useMemo } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildResponsesExtras } from "@/config/responses-extras";
import { ResponsesOptions } from "./chat-demo";

interface ResponsesExtrasProps {
  model: string;
  options: ResponsesOptions;
  onChange: (options: ResponsesOptions) => void;
}

export function ResponsesExtras({ model, options, onChange }: ResponsesExtrasProps) {
  const { toolCalling, mcpServer } = useMemo(() => buildResponsesExtras(model), [model]);

  const handleChange = (key: keyof ResponsesOptions) =>
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      onChange({
        ...options,
        [key]: event.target.value,
      });
    };

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6 text-left">
      <Card className="text-white">
        <CardHeader>
          <CardTitle>Tool calling with Responses API</CardTitle>
          <CardDescription>
            Detect function calls in the streamed events and execute your own tooling before returning a
            final message.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-white/60">
            The Responses API emits <code>response.tool_calls</code> events you can intercept to call
            external functions before submitting results back with <code>responses.submit_tool_outputs</code>.
          </p>
          <div className="space-y-2 text-xs text-white/60">
            <Label htmlFor="responses-tools" className="text-[10px] uppercase tracking-[0.16em]">
              Tools payload (JSON)
            </Label>
            <Textarea
              id="responses-tools"
              value={options.toolsText}
              onChange={handleChange("toolsText")}
              placeholder='[{ "type": "function", "name": "my_tool", ... }]'
              className="min-h-[92px] text-xs"
            />
            <p>Paste the array of tools you want to expose to the model.</p>
          </div>
          <div className="space-y-2 text-xs text-white/60">
            <Label htmlFor="responses-tool-choice" className="text-[10px] uppercase tracking-[0.16em]">
              Tool choice (JSON)
            </Label>
            <Textarea
              id="responses-tool-choice"
              value={options.toolChoiceText}
              onChange={handleChange("toolChoiceText")}
              placeholder='{"type": "function", "function": { "name": "my_tool" }}'
              className="min-h-[68px] text-xs"
            />
            <p>Optional. Provide a tool choice to require or disable tool calls.</p>
          </div>
          <details className="group rounded-xl border border-white/10 bg-[#151823] p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-white/60">
              <span>Tool calling snippet</span>
              <span className="text-xs text-white/30">toggle</span>
            </summary>
            <div className="mt-3">
              <pre className="whitespace-pre-wrap rounded-lg bg-[#10121a] p-4 text-xs leading-5 text-white/80">
                <code>{toolCalling}</code>
              </pre>
            </div>
          </details>
        </CardContent>
      </Card>

      <Card className="text-white">
        <CardHeader>
          <CardTitle>MCP server tools</CardTitle>
          <CardDescription>
            Attach Model Context Protocol servers so models can invoke rich tools like file browsers or
            search directly from the Responses API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-white/60">
            Register an MCP server and forward its advertised tools in your request. The Responses API
            will call them just like first-party functions.
          </p>
          <div className="space-y-2 text-xs text-white/60">
            <Label htmlFor="responses-mcp" className="text-[10px] uppercase tracking-[0.16em]">
              MCP servers (JSON)
            </Label>
            <Textarea
              id="responses-mcp"
              value={options.mcpText}
              onChange={handleChange("mcpText")}
              placeholder='{"servers": [{ "name": "local-files", "version": "2024-05-16", "tools": [] }]}'
              className="min-h-[92px] text-xs"
            />
            <p>Provide the <code>mcp</code> object with the servers you want to attach.</p>
          </div>
          <details className="group rounded-xl border border-white/10 bg-[#151823] p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-white/60">
              <span>MCP snippet</span>
              <span className="text-xs text-white/30">toggle</span>
            </summary>
            <div className="mt-3">
              <pre className="whitespace-pre-wrap rounded-lg bg-[#10121a] p-4 text-xs leading-5 text-white/80">
                <code>{mcpServer}</code>
              </pre>
            </div>
          </details>
        </CardContent>
      </Card>
    </section>
  );
}
