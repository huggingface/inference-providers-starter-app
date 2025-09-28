import { NextRequest } from "next/server";
import { OpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { MODEL_NAME } from "@/config/model";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = process.env.HF_TOKEN;

  if (!token) {
    return new Response(
      JSON.stringify({ error: "Missing HF_TOKEN environment variable." }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  const client = new OpenAI({
    apiKey: token,
    baseURL: "https://router.huggingface.co/v1",
  });

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

  const messages =
    typeof payload === "object" && payload !== null && "messages" in payload
      ? (payload as { messages: ChatCompletionMessageParam[] }).messages
      : null;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "The request body must include messages." }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    const stream = await client.chat.completions.create({
      model: MODEL_NAME,
      messages,
      stream: true,
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
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
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
    const message = error instanceof Error ? error.message : "Unknown error.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
