import { NextRequest } from "next/server";

import { APIError } from "openai/error";

import { jsonError } from "@/server/http";
import { getHfClient, resolveModel } from "@/server/openai";
import { readJson } from "@/server/request";
import { parseJsonField } from "@/server/parsing";

const encoder = new TextEncoder();

const LIBRARY_TOOL_NAME = "get_library_details";

const LIBRARY_BRANCHES: Record<string, { label: string; address: string; todaysHours: string; highlights: string[] }> = {
  downtown: {
    label: "Downtown Library",
    address: "433 Market St, San Francisco, CA",
    todaysHours: "9:00 AM – 6:00 PM",
    highlights: ["Quiet study rooms", "Floor-to-ceiling windows", "Coffee stand in the lobby"],
  },
  mission: {
    label: "Mission Reading Room",
    address: "918 Valencia St, San Francisco, CA",
    todaysHours: "10:00 AM – 5:00 PM",
    highlights: ["Story time at 3 PM", "Spanish-language book club", "Community zine archive"],
  },
  sunset: {
    label: "Sunset Learning Hub",
    address: "601 Noriega St, San Francisco, CA",
    todaysHours: "11:00 AM – 7:00 PM",
    highlights: ["STEM makerspace", "Teen coding lab", "Sunset rooftop patio"],
  },
};

function normaliseBranch(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().toLowerCase();
}

async function getLibraryDetails(args: Record<string, unknown>) {
  const rawBranch = normaliseBranch(args.branch);
  const branchKey = rawBranch && LIBRARY_BRANCHES[rawBranch] ? rawBranch : "downtown";
  const branch = LIBRARY_BRANCHES[branchKey];

  const response = {
    branch: branch.label,
    address: branch.address,
    todaysHours: branch.todaysHours,
    highlights: branch.highlights,
    note:
      rawBranch && rawBranch !== branchKey
        ? `Showing details for the Downtown branch because "${args.branch}" isn't in the demo dataset.`
        : undefined,
  };

  return response;
}

async function runFunctionTool(name: string | null, argsJson: string) {
  const toolName = name ?? LIBRARY_TOOL_NAME;
  let parsedArgs: Record<string, unknown> = {};

  if (argsJson.trim()) {
    try {
      parsedArgs = JSON.parse(argsJson);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unable to parse tool arguments.";
      return JSON.stringify({
        error: `Failed to parse arguments for "${toolName}": ${reason}`,
      });
    }
  }

  if (toolName !== LIBRARY_TOOL_NAME) {
    return JSON.stringify({
      error: `Tool "${toolName}" is not implemented in this demo.`,
    });
  }

  try {
    const result = await getLibraryDetails(parsedArgs);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error.";
    return JSON.stringify({
      error: `Tool "${toolName}" failed: ${reason}`,
    });
  }
}

export const runtime = "nodejs";

interface ToolCallingPayload {
  prompt?: unknown;
  model?: unknown;
  tools?: unknown;
  tool_choice?: unknown;
}

export async function POST(req: NextRequest) {
  const clientResult = getHfClient();
  if (!clientResult.ok) {
    return clientResult.response;
  }

  const payloadResult = await readJson<ToolCallingPayload>(req);
  if (!payloadResult.ok) {
    return payloadResult.response;
  }

  const { prompt, model, tools, tool_choice } = payloadResult.data ?? {};
  const promptText = typeof prompt === "string" ? prompt.trim() : "";

  if (!promptText) {
    return jsonError(400, "Provide a prompt string.");
  }

  let parsedTools: unknown;
  let parsedToolChoice: unknown;

  try {
    parsedTools = parseJsonField(tools, "tools");
    parsedToolChoice = parseJsonField(tool_choice, "tool_choice");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request payload.";
    return jsonError(400, message);
  }

  try {
    const stream = await clientResult.client.responses.stream({
      model: resolveModel(model),
      input: promptText,
      ...(parsedTools ? { tools: parsedTools } : undefined),
      ...(parsedToolChoice ? { tool_choice: parsedToolChoice } : undefined),
    });

    let responseId: string | null = null;

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };

        try {
          for await (const event of stream) {
            switch (event.type) {
              case "response.created":
                responseId = event.response?.id ?? null;
                send({ event: event.type, data: event });
                break;
              case "response.function_call_arguments.done": {
                send({ event: event.type, data: event });
                if (!responseId) {
                  send({
                    event: "error",
                    data: { message: "Missing response id for tool call." },
                  });
                  break;
                }

                const payload = await runFunctionTool(event.name ?? null, event.arguments ?? "{}");
                try {
                  await clientResult.client.responses.submitToolOutputs(responseId, {
                    tool_outputs: [
                      {
                        call_id: event.call_id ?? "",
                        output: payload,
                      },
                    ],
                  });
                } catch (error) {
                  const message = error instanceof Error ? error.message : "Failed to submit tool output.";
                  send({
                    event: "error",
                    data: { message },
                  });
                }
                break;
              }
              case "response.output_text.delta":
                if (event.delta) {
                  send({ event: event.type, data: { delta: event.delta } });
                }
                break;
              case "response.error":
                send({
                  event: "response.error",
                  data: { message: event.error?.message ?? "Unknown error." },
                });
                break;
              default:
                send({ event: event.type, data: event });
                break;
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Streaming request failed.";
          send({
            event: "error",
            data: { message },
          });
        } finally {
          controller.close();
        }
      },
      cancel() {
        try {
          stream.controller.abort();
        } catch {
          // ignore abort issues
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const status = error instanceof APIError && typeof error.status === "number" ? error.status : 500;
    const message =
      error instanceof APIError
        ? error.error?.message || error.message
        : error instanceof Error
          ? error.message
          : "Streaming request failed.";
    return jsonError(status, message);
  }
}
