import { NextRequest } from "next/server";
import { OpenAI } from "openai";
import { APIError } from "openai/error";
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

function coalesceOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const maybeOutputText = (payload as { output_text?: unknown }).output_text;
  if (typeof maybeOutputText === "string" && maybeOutputText.trim().length > 0) {
    return maybeOutputText;
  }

  const maybeOutput = (payload as { output?: unknown }).output;
  if (Array.isArray(maybeOutput)) {
    for (const item of maybeOutput) {
      if (item && typeof item === "object" && "type" in item && (item as { type?: unknown }).type === "message") {
        const contentList = (item as { content?: unknown }).content;
        if (Array.isArray(contentList)) {
          for (const part of contentList) {
            if (
              part &&
              typeof part === "object" &&
              (part as { type?: unknown }).type === "output_text" &&
              typeof (part as { text?: unknown }).text === "string" &&
              (part as { text: string }).text.trim().length > 0
            ) {
              return (part as { text: string }).text;
            }
          }
        }
      }
    }
  }

  const maybeChoices = (payload as { choices?: unknown }).choices;
  if (Array.isArray(maybeChoices)) {
    for (const choice of maybeChoices) {
      const message = choice && typeof choice === "object" ? (choice as { message?: unknown }).message : undefined;
      const content = message && typeof message === "object" ? (message as { content?: unknown }).content : undefined;
      if (typeof content === "string" && content.trim().length > 0) {
        return content;
      }
    }
  }

  return null;
}

function coalesceParsedOutput(payload: unknown): unknown | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const parsed = (payload as { output_parsed?: unknown }).output_parsed;
  if (parsed !== undefined && parsed !== null) {
    return parsed;
  }

  const maybeOutput = (payload as { output?: unknown }).output;
  if (Array.isArray(maybeOutput)) {
    for (const item of maybeOutput) {
      if (item && typeof item === "object" && (item as { type?: unknown }).type === "message") {
        const contentList = (item as { content?: unknown }).content;
        if (Array.isArray(contentList)) {
          for (const part of contentList) {
            if (
              part &&
              typeof part === "object" &&
              (part as { type?: unknown }).type === "output_text" &&
              (part as { parsed?: unknown }).parsed !== undefined &&
              (part as { parsed?: unknown }).parsed !== null
            ) {
              return (part as { parsed: unknown }).parsed;
            }
          }
        }
      }
    }
  }

  return null;
}

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
      ? (payload as { prompt?: unknown }).prompt
      : undefined;

  const overrideModel =
    typeof payload === "object" && payload !== null && "model" in payload
      ? (payload as { model?: unknown }).model
      : undefined;

  const modeValue =
    typeof payload === "object" && payload !== null && "mode" in payload
      ? (payload as { mode?: unknown }).mode
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

  const client = new OpenAI({
    apiKey: token,
    baseURL: "https://router.huggingface.co/v1",
  });

  const chosenModel =
    typeof overrideModel === "string" && overrideModel.trim().length > 0
      ? overrideModel.trim()
      : MODEL_NAME;

  const apiMode = modeValue === "responses" ? "responses" : "chat";

  try {
    let usedSchema = true;
    let schemaErrorMessage: string | undefined;
    const systemFallbackInstruction =
      "You are a helpful assistant that returns compact JSON matching this schema: { headline: string, audience: string, takeaways: string[] }. If you cannot comply, explain why.";

    let completion: unknown;
    if (apiMode === "responses") {
      try {
        completion = await client.responses.create({
          model: chosenModel,
          input: promptText,
          temperature: 0.2,
          text: {
            format: {
              type: "json_schema",
              name: schema.name,
              schema: schema.schema,
            },
          },
        });
      } catch (innerError) {
        if (innerError instanceof APIError && innerError.status === 400) {
          usedSchema = false;
          schemaErrorMessage = innerError.error?.message || innerError.message;
          completion = await client.responses.create({
            model: chosenModel,
            input: promptText,
            temperature: 0.2,
            instructions: systemFallbackInstruction,
          });
        } else {
          throw innerError;
        }
      }
    } else {
      try {
        completion = await client.chat.completions.create({
          model: chosenModel,
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that returns concise JSON meeting the provided schema. Do not include markdown.",
            },
            {
              role: "user",
              content: promptText,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: schema,
          },
          temperature: 0.2,
        });
      } catch (innerError) {
        if (innerError instanceof APIError && innerError.status === 400) {
          usedSchema = false;
          schemaErrorMessage = innerError.error?.message || innerError.message;
          completion = await client.chat.completions.create({
            model: chosenModel,
            messages: [
              {
                role: "system",
                content: systemFallbackInstruction,
              },
              {
                role: "user",
                content: promptText,
              },
            ],
            temperature: 0.2,
          });
        } else {
          throw innerError;
        }
      }
    }

    const resolvedContent = coalesceOutputText(completion);
    const parsedCandidate = apiMode === "responses" ? coalesceParsedOutput(completion) : null;

    if (!resolvedContent && parsedCandidate == null) {
      throw new Error("The model returned an empty response.");
    }

    let parsed: unknown = parsedCandidate ?? undefined;
    let parsedSuccessfully = parsedCandidate != null;

    if (!parsedSuccessfully && resolvedContent) {
      try {
        parsed = JSON.parse(resolvedContent);
        parsedSuccessfully = true;
      } catch {
        if (usedSchema) {
          throw new Error("The model response was not valid JSON.");
        }
      }
    }

    const responsePayload = {
      data: parsedSuccessfully ? parsed : null,
      raw: parsedSuccessfully ? undefined : resolvedContent,
      meta: {
        model: chosenModel,
        usedSchema,
        schemaError: schemaErrorMessage,
        mode: apiMode,
        message: parsedSuccessfully
          ? usedSchema
            ? "Structured output ready."
            : "Model returned valid JSON without enforcing the schema."
          : "Model could not return JSON for the schema. Try a model with structured output support.",
      },
    } as const;

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
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
    return new Response(JSON.stringify({ error: message || "Structured request failed." }), {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
