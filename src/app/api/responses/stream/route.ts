import { NextRequest } from "next/server";

import { jsonError } from "@/server/http";
import { getHfClient, resolveModel } from "@/server/openai";
import { readJson } from "@/server/request";
import { APIError } from "openai/error";

import { coalesceOutputText } from "@/server/output";

export const runtime = "nodejs";

interface ResponsesStreamPayload {
  prompt?: unknown;
  model?: unknown;
}

const encoder = new TextEncoder();

export async function POST(req: NextRequest) {
  const clientResult = getHfClient();
  if (!clientResult.ok) {
    return clientResult.response;
  }

  const payloadResult = await readJson<ResponsesStreamPayload>(req);
  if (!payloadResult.ok) {
    return payloadResult.response;
  }

  const { prompt, model } = payloadResult.data ?? {};
  const promptText = typeof prompt === "string" ? prompt.trim() : "";

  if (!promptText) {
    return jsonError(400, "Provide a prompt string.");
  }

  try {
    const stream = await clientResult.client.responses.stream({
      model: resolveModel(model),
      input: promptText,
    });

    let latest = "";

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };

        try {
          for await (const event of stream) {
            switch (event.type) {
              case "response.output_text.delta": {
                const delta = event.delta ?? "";
                if (delta) {
                  latest += delta;
                  send({ event: event.type, data: { delta } });
                }
                break;
              }
              case "response.output_text.done": {
                const snapshot = event.snapshot ?? "";
                if (snapshot.length > latest.length) {
                  const chunk = snapshot.slice(latest.length);
                  latest = snapshot;
                  if (chunk) {
                    send({ event: "response.output_text.delta", data: { delta: chunk } });
                  }
                }
                break;
              }
              case "response.completed": {
                const text = coalesceOutputText(event.response);
                if (text && text.length > latest.length) {
                  const chunk = text.slice(latest.length);
                  latest = text;
                  if (chunk) {
                    send({ event: "response.output_text.delta", data: { delta: chunk } });
                  }
                }
                send({ event: event.type, data: event });
                break;
              }
              case "response.error": {
                send({
                  event: "response.error",
                  data: { message: event.error?.message ?? "Unknown error." },
                });
                break;
              }
              default: {
                send({ event: event.type, data: event });
                break;
              }
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
          // ignore abort errors
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
