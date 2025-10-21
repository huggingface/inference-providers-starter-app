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

const LIBRARY_BRANCHES = {
  downtown: {
    name: "Downtown Library",
    hours: "9:00 AM – 6:00 PM",
    highlights: ["Quiet study rooms", "Panoramic reading deck"],
  },
  mission: {
    name: "Mission Reading Room",
    hours: "10:00 AM – 5:00 PM",
    highlights: ["Story time at 3 PM", "Community zine archive"],
  },
  sunset: {
    name: "Sunset Learning Hub",
    hours: "11:00 AM – 7:00 PM",
    highlights: ["STEM makerspace", "Rooftop patio"],
  },
};

async function getLibraryDetails(branch) {
  const key = (branch || "").trim().toLowerCase();
  return LIBRARY_BRANCHES[key] ?? {
    name: "Downtown Library",
    hours: "9:00 AM – 6:00 PM",
    highlights: ["Quiet study rooms", "Panoramic reading deck"],
    note: \`Falling back to the Downtown branch because "\${branch}" wasn't found.\`,
  };
}

const stream = await client.responses.stream({
  model: "${displayModel}",
  input: "Call the library helper for the Mission branch and summarise the hours and highlights.",
  tools: [
    {
      type: "function",
      name: "get_library_details",
      description: "Look up demo library information by branch name.",
      parameters: {
        type: "object",
        properties: {
          branch: {
            type: "string",
            description: "Use downtown, mission, or sunset.",
          },
        },
        required: ["branch"],
      },
    },
  ],
  tool_choice: { type: "function", name: "get_library_details" },
});

let responseId = "";

for await (const event of stream) {
  switch (event.type) {
    case "response.created":
      responseId = event.response?.id ?? "";
      break;
    case "response.function_call_arguments.done": {
      const args = JSON.parse(event.arguments ?? "{}");
      const data = await getLibraryDetails(args.branch);
      await client.responses.submitToolOutputs(responseId, {
        tool_outputs: [
          {
            call_id: event.call_id ?? "",
            output: JSON.stringify(data),
          },
        ],
      });
      break;
    }
    case "response.output_text.delta":
      process.stdout.write(event.delta ?? "");
      break;
    default:
      break;
  }
}

await stream.finalResponse();`,
    mcpServer: `import { OpenAI } from "openai";
import { WebSocketMCPClient } from "@modelcontextprotocol/sdk/client/websocket";

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

const mcp = new WebSocketMCPClient({ url: "ws://localhost:3001" });

await mcp.connect();
const tools = await mcp.listTools();

const stream = await client.responses.stream({
  model: "${displayModel}",
  input: "Use the MCP server to read the README title.",
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

for await (const event of stream) {
  if (event.type === "response.output_text.delta") {
    process.stdout.write(event.delta ?? "");
  }
}

await stream.finalResponse();
await mcp.close();`,
  };
}
