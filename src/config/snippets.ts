import type { ChatApiMode } from "@/components/chat-demo";

type SnippetPair = {
  streaming: (model: string) => string;
  structured: (model: string) => string;
};

const snippetBuilders: Record<ChatApiMode, SnippetPair> = {
  responses: {
    streaming: (model) => `import { OpenAI } from "openai";

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

const stream = await client.responses.stream({
  model: "${model}",
  input: "Explain streaming.",
});

for await (const event of stream) {
  if (event.type === "response.output_text.delta") {
    process.stdout.write(event.delta ?? "");
  }
}

await stream.finalResponse();`,
    structured: (model) => `import { OpenAI } from "openai";

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

const result = await client.responses.create({
  model: "${model}",
  input: "Summarize the talk for PMs.",
  text: {
    format: {
      type: "json_schema",
      name: "summary",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          headline: { type: "string" },
          audience: { type: "string" },
          takeaways: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 4,
          },
        },
        required: ["headline", "audience", "takeaways"],
      },
    },
  },
  temperature: 0.2,
});

console.log(JSON.parse(result.output_text));`,
  },
  chat: {
    streaming: (model) => `import { OpenAI } from "openai";

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

const stream = await client.chat.completions.create({
  model: "${model}",
  messages: [{ role: "user", content: "Explain streaming." }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}`,
    structured: (model) => `import { OpenAI } from "openai";

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

const result = await client.chat.completions.create({
  model: "${model}",
  messages: [
    { role: "system", content: "Return JSON only." },
    { role: "user", content: "Summarize the talk for PMs." },
  ],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "summary",
      schema: {
        type: "object",
        properties: {
          headline: { type: "string" },
          takeaways: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
          },
        },
        required: ["headline", "takeaways"],
      },
      strict: true,
    },
  },
});

console.log(JSON.parse(result.choices[0].message?.content ?? "{}"));`,
  },
};

function escapeBackticks(model: string) {
  return model.replace(/`/g, "\\`");
}

export function buildSnippets(mode: ChatApiMode, model: string) {
  const escapedModel = escapeBackticks(model.trim() ? model : "");
  const builder = snippetBuilders[mode];
  const value = escapedModel || model;
  return {
    streaming: builder.streaming(value),
    structured: builder.structured(value),
  };
}
