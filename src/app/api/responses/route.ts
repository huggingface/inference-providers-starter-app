import { NextRequest } from "next/server";
import { APIError } from "openai/error";
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

  const payloadResult = await readJson<{ prompt?: unknown; model?: unknown }>(req);
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
    let latestSnapshot = "";
    let emittedAny = false;

    const readableStream = streamText({
      req,
      iterator: stream,
      cancel: () => {
        stream.controller.abort();
      },
      onChunk: (event, enqueue) => {
        if (event.type === "response.output_text.delta") {
          const snapshot = typeof (event as { snapshot?: unknown }).snapshot === "string"
            ? (event as { snapshot: string }).snapshot
            : null;
          const delta = typeof (event as { delta?: unknown }).delta === "string"
            ? (event as { delta: string }).delta
            : null;

          let chunk = delta ?? "";
          if (!chunk && snapshot !== null) {
            chunk = snapshot.slice(latestSnapshot.length);
          }

          if (snapshot !== null) {
            latestSnapshot = snapshot;
          } else if (delta) {
            latestSnapshot += delta;
          }

          if (chunk) {
            enqueue(chunk);
            emittedAny = true;
          }
        } else if (event.type === "response.output_text.done") {
          const snapshot = typeof (event as { snapshot?: unknown }).snapshot === "string"
            ? (event as { snapshot: string }).snapshot
            : null;
          if (snapshot && snapshot.length > latestSnapshot.length) {
            const chunk = snapshot.slice(latestSnapshot.length);
            enqueue(chunk);
            latestSnapshot = snapshot;
            emittedAny = true;
          }
        } else if (event.type === "response.error") {
          const message = event.error?.message ?? "Streaming error.";
          enqueue(`\n[Stream error] ${message}`);
        }
      },
      onComplete: async (enqueue) => {
        if (emittedAny) {
          return;
        }
        try {
          const finalResponse = await stream.finalResponse();
          const fallbackText = finalResponse && typeof finalResponse === "object"
            ? (finalResponse as { output_text?: unknown }).output_text
            : null;
          if (typeof fallbackText === "string" && fallbackText.trim().length > 0) {
            enqueue(fallbackText);
          }
        } catch {
          // ignore final response failures
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
