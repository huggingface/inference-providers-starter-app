import { NextRequest } from "next/server";
import { OpenAI } from "openai";
import { APIError } from "openai/error";
import { MODEL_NAME } from "@/config/model";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = process.env.HF_TOKEN;

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing HF_TOKEN environment variable." }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  let payload: unknown;

  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  const prompt =
    typeof payload === "object" && payload !== null && "prompt" in payload
      ? (payload as { prompt?: unknown }).prompt
      : undefined;

  const overrideModel =
    typeof payload === "object" && payload !== null && "model" in payload
      ? (payload as { model?: unknown }).model
      : undefined;

  const promptText = typeof prompt === "string" ? prompt.trim() : "";

  if (!promptText) {
    return new Response(JSON.stringify({ error: "Provide a prompt string." }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  const chosenModel =
    typeof overrideModel === "string" && overrideModel.trim().length > 0
      ? overrideModel.trim()
      : MODEL_NAME;

  const client = new OpenAI({
    apiKey: token,
    baseURL: "https://router.huggingface.co/v1",
  });

  try {
    const stream = await client.responses.stream({
      model: chosenModel,
      input: promptText,
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const abortStream = () => {
          try {
            stream.controller.abort();
          } catch {
            // ignore
          }
          controller.close();
        };

        req.signal.addEventListener("abort", abortStream);

        try {
          let latestSnapshot = "";
          let emittedAny = false;
          for await (const event of stream) {
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
                controller.enqueue(encoder.encode(chunk));
                emittedAny = true;
              }
            } else if (event.type === "response.output_text.done") {
              const snapshot = typeof (event as { snapshot?: unknown }).snapshot === "string"
                ? (event as { snapshot: string }).snapshot
                : null;
              if (snapshot && snapshot.length > latestSnapshot.length) {
                const chunk = snapshot.slice(latestSnapshot.length);
                controller.enqueue(encoder.encode(chunk));
                latestSnapshot = snapshot;
                emittedAny = true;
              }
            } else if (event.type === "response.error") {
              const message = event.error?.message ?? "Streaming error.";
              controller.enqueue(encoder.encode(`\n[Stream error] ${message}`));
            }
          }

          if (!emittedAny) {
            try {
              const finalResponse = await stream.finalResponse();
              const fallbackText = finalResponse && typeof finalResponse === "object"
                ? (finalResponse as { output_text?: unknown }).output_text
                : null;
              if (typeof fallbackText === "string" && fallbackText.trim().length > 0) {
                controller.enqueue(encoder.encode(fallbackText));
              }
            } catch {
              // ignore final response failures
            }
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unexpected streaming error.";
          controller.enqueue(encoder.encode(`\n[Stream error] ${message}`));
        } finally {
          req.signal.removeEventListener("abort", abortStream);
          controller.close();
        }
      },
      cancel() {
        try {
          stream.controller.abort();
        } catch {
          // ignore
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
    return new Response(JSON.stringify({ error: message || "Streaming request failed." }), {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
