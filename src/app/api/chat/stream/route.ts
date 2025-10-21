import { NextRequest } from "next/server";

import { APIError } from "openai/error";

import { jsonError } from "@/server/http";
import { getHfClient, resolveModel } from "@/server/openai";
import { readJson } from "@/server/request";

export const runtime = "nodejs";

interface ChatStreamPayload {
  messages?: unknown;
  model?: unknown;
}

const encoder = new TextEncoder();

export async function POST(req: NextRequest) {
  const clientResult = getHfClient();
  if (!clientResult.ok) {
    return clientResult.response;
  }

  const payloadResult = await readJson<ChatStreamPayload>(req);
  if (!payloadResult.ok) {
    return payloadResult.response;
  }

  const { messages, model } = payloadResult.data ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError(400, "Provide an array of chat messages.");
  }

  try {
    const stream = await clientResult.client.chat.completions.create({
      model: resolveModel(model),
      messages,
      stream: true,
    });

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              send({ event: "chat.completions.delta", data: { delta: content } });
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Streaming request failed.";
          send({ event: "error", data: { message } });
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
