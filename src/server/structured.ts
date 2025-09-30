import { APIError } from "openai/error";
import { OpenAI } from "openai";

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

const SYSTEM_FALLBACK =
  "You are a helpful assistant that returns compact JSON matching this schema: { headline: string, audience: string, takeaways: string[] }. If you cannot comply, explain why.";

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

export type StructuredApiMode = "chat" | "responses";

interface StructuredRequest {
  client: OpenAI;
  prompt: string;
  model: string;
  mode: StructuredApiMode;
}

interface StructuredResponse {
  data: unknown | null;
  raw?: string | null;
  meta: {
    model: string;
    usedSchema: boolean;
    schemaError?: string;
    mode: StructuredApiMode;
    message: string;
  };
}

export async function runStructuredRequest({ client, prompt, model, mode }: StructuredRequest): Promise<StructuredResponse> {
  let usedSchema = true;
  let schemaErrorMessage: string | undefined;
  let completion: unknown;

  if (mode === "responses") {
    try {
      completion = await client.responses.create({
        model,
        input: prompt,
        temperature: 0.2,
        text: {
          format: {
            type: "json_schema",
            name: schema.name,
            schema: schema.schema,
          },
        },
      });
    } catch (error) {
      if (error instanceof APIError && error.status === 400) {
        usedSchema = false;
        schemaErrorMessage = error.error?.message || error.message;
        completion = await client.responses.create({
          model,
          input: prompt,
          temperature: 0.2,
          instructions: SYSTEM_FALLBACK,
        });
      } else {
        throw error;
      }
    }
  } else {
    try {
      completion = await client.chat.completions.create({
        model,
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
    } catch (error) {
      if (error instanceof APIError && error.status === 400) {
        usedSchema = false;
        schemaErrorMessage = error.error?.message || error.message;
        completion = await client.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content: SYSTEM_FALLBACK,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
        });
      } else {
        throw error;
      }
    }
  }

  const resolvedContent = coalesceOutputText(completion);
  const parsedCandidate = mode === "responses" ? coalesceParsedOutput(completion) : null;

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

  return {
    data: parsedSuccessfully ? parsed : null,
    raw: parsedSuccessfully ? undefined : resolvedContent,
    meta: {
      model,
      usedSchema,
      schemaError: schemaErrorMessage,
      mode,
      message: parsedSuccessfully
        ? usedSchema
          ? "Structured output ready."
          : "Model returned valid JSON without enforcing the schema."
        : "Model could not return JSON for the schema. Try a model with structured output support.",
    },
  };
}

export function resolveStructuredMode(value: unknown): StructuredApiMode {
  return value === "responses" ? "responses" : "chat";
}
