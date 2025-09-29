import { NextRequest } from "next/server";
import { OpenAI } from "openai";
import { MODEL_NAME } from "@/config/model";

const schema = {
  name: "streamingSummary",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      headline: { type: "string" },
      audience: { type: "string" },
      takeaways: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: { type: "string" },
      },
    },
    required: ["headline", "audience", "takeaways"],
  },
  strict: true,
} as const;

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
      ? (payload as { prompt: string }).prompt
      : undefined;

  const overrideModel =
    typeof payload === "object" && payload !== null && "model" in payload
      ? (payload as { model?: string }).model
      : undefined;

  if (!prompt || typeof prompt !== "string") {
    return new Response(JSON.stringify({ error: "Provide a prompt string." }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  const client = new OpenAI({
    apiKey: token,
    baseURL: "https://router.huggingface.co/v1",
  });

  try {
    const completion = await client.chat.completions.create({
      model: overrideModel && overrideModel.trim() ? overrideModel : MODEL_NAME,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that returns concise JSON meeting the provided schema. Do not include markdown.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: schema,
      },
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("The model returned an empty response.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("The model response was not valid JSON.");
    }

    return new Response(JSON.stringify({ data: parsed }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
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
