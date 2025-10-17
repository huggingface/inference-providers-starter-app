function escapeBackticks(input: string) {
  return input.replace(/`/g, "\\`");
}

export function buildResponsesExtras(model: string) {
  const safeModel = escapeBackticks(model.trim() ? model : "");
  const displayModel = safeModel || model;

  return {
    toolCalling: `import { OpenAI } from "openai";

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

async function getLocation(city) {
  // call your own service, database, or API here
  return { city, latitude: 48.8566, longitude: 2.3522 };
}

const response = await client.responses.create({
  model: "${displayModel}",
  input: [
    {
      role: "user",
      content: [
        { type: "text", text: "Find the latitude for Paris and explain the weather." },
      ],
    },
  ],
  tools: [
    {
      type: "function",
      name: "get_location",
      description: "Look up a city's coordinates",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
      },
    },
  ],
});

for (const item of response.output ?? []) {
  if (item.type === "tool_call") {
    const args = JSON.parse(item.function.arguments ?? "{}");
    const coordinates = await getLocation(args.city);

    await client.responses.submitToolOutputs(response.id, {
      tool_outputs: [
        {
          call_id: item.id,
          output: JSON.stringify(coordinates),
        },
      ],
    });
  }
}

const final = await client.responses.retrieve(response.id);
console.log(final.output_text);`,
    mcpServer: `import { OpenAI } from "openai";
import { WebSocketMCPClient } from "@modelcontextprotocol/sdk/client/websocket";

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

const mcp = new WebSocketMCPClient({
  url: "ws://localhost:3001", // your MCP server
});

await mcp.connect();
const tools = await mcp.listTools();

const response = await client.responses.create({
  model: "${displayModel}",
  input: "Read the README title from this project.",
  mcp: {
    servers: [
      {
        name: "local-files",
        version: mcp.protocolVersion,
        tools,
      },
    ],
  },
});

console.log(response.output_text);

await mcp.close();`,
  };
}
