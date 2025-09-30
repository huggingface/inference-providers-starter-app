import { NextRequest } from "next/server";
import { APIError } from "openai/error";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getHfClient, resolveModel } from "@/server/openai";
import { readJson } from "@/server/request";
import { jsonError } from "@/server/http";
import { streamText } from "@/server/streaming";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const clientResult = getHfClient();
  if (!clientResult.ok) {
    return clientResult.response;
  }

  const payloadResult = await readJson<{ messages?: ChatCompletionMessageParam[]; model?: unknown }>(req);
  if (!payloadResult.ok) {
    return payloadResult.response;
  }

  const { messages, model } = payloadResult.data ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError(400, "The request body must include messages.");
  }

  try {
    const stream = await clientResult.client.chat.completions.create({
      model: resolveModel(model),
      messages,
      stream: true,
    });

    const readableStream = streamText({
      req,
      iterator: stream,
      cancel: () => {
        stream.controller.abort();
      },
      onChunk: (chunk, enqueue) => {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          enqueue(content);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    const status = error instanceof APIError && typeof error.status === "number" ? error.status : 500;
    const message =
      error instanceof APIError
        ? error.error?.message || error.message
        : error instanceof Error
          ? error.message
          : "Unknown error.";
    return jsonError(status, message || "Streaming request failed.");
  }
}
