import { NextRequest } from "next/server";

import { APIError } from "openai/error";

import { jsonError } from "@/server/http";
import { getHfClient, resolveModel } from "@/server/openai";
import { readJson } from "@/server/request";
import { parseJsonField } from "@/server/parsing";

export const runtime = "nodejs";

interface McpPayload {
  prompt?: unknown;
  model?: unknown;
  tools?: unknown;
  mcp?: unknown;
}

const encoder = new TextEncoder();

export async function POST(req: NextRequest) {
  const clientResult = getHfClient();
  if (!clientResult.ok) {
    return clientResult.response;
  }

  const payloadResult = await readJson<McpPayload>(req);
  if (!payloadResult.ok) {
    return payloadResult.response;
  }

  const { prompt, model, tools, mcp } = payloadResult.data ?? {};
  const promptText = typeof prompt === "string" ? prompt.trim() : "";

  if (!promptText) {
    return jsonError(400, "Provide a prompt string.");
  }

  let parsedTools: unknown;
  let parsedMcp: unknown;

  try {
    parsedTools = parseJsonField(tools, "tools");
    parsedMcp = parseJsonField(mcp, "mcp");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request payload.";
    return jsonError(400, message);
  }

  try {
    const stream = await clientResult.client.responses.stream({
      model: resolveModel(model),
      input: promptText,
      ...(parsedTools ? { tools: parsedTools } : undefined),
      ...(parsedMcp ? { mcp: parsedMcp } : undefined),
    });

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };

        try {
          for await (const event of stream) {
            if (event.type === "response.output_text.delta" && event.delta) {
              send({ event: event.type, data: { delta: event.delta } });
            } else if (event.type === "response.error") {
              send({
                event: "response.error",
                data: { message: event.error?.message ?? "Unknown error." },
              });
            } else {
              send({ event: event.type, data: event });
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Streaming request failed.";
          send({
            event: "error",
            data: { message },
          });
        } finally {
          controller.close();
        }
      },
      cancel() {
        try {
          stream.controller.abort();
        } catch {
          // ignore abort failures
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const status = error instanceof APIError && typeof error.status === "number" ? error.status : 500;
    const message =
      error instanceof APIError
        ? error.error?.message || error.message
        : error instanceof Error
          ? error.message
          : "Streaming request failed.";
    return jsonError(status, message);
  }
}
