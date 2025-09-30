import { NextRequest } from "next/server";
import { APIError } from "openai/error";
import { json, jsonError } from "@/server/http";
import { getHfClient, resolveModel } from "@/server/openai";
import { readJson } from "@/server/request";
import { resolveStructuredMode, runStructuredRequest } from "@/server/structured";

export const runtime = "nodejs";

interface StructuredPayload {
  prompt?: unknown;
  model?: unknown;
  mode?: unknown;
}

export async function POST(req: NextRequest) {
  const clientResult = getHfClient();
  if (!clientResult.ok) {
    return clientResult.response;
  }

  const payloadResult = await readJson<StructuredPayload>(req);
  if (!payloadResult.ok) {
    return payloadResult.response;
  }

  const { prompt, model, mode } = payloadResult.data ?? {};
  const promptText = typeof prompt === "string" ? prompt.trim() : "";

  if (!promptText) {
    return jsonError(400, "Provide a prompt string.");
  }

  const chosenModel = resolveModel(model);
  const apiMode = resolveStructuredMode(mode);

  try {
    const structured = await runStructuredRequest({
      client: clientResult.client,
      prompt: promptText,
      model: chosenModel,
      mode: apiMode,
    });

    return json(structured, { status: 200 });
  } catch (error) {
    const status = error instanceof APIError && typeof error.status === "number" ? error.status : 500;
    const message =
      error instanceof APIError
        ? error.error?.message || error.message
        : error instanceof Error
          ? error.message
          : "Unknown error.";

    return jsonError(status, message || "Structured request failed.");
  }
}
