import { OpenAI } from "openai";
import { jsonError } from "./http";
import { MODEL_NAME } from "@/config/model";

const HF_BASE_URL = "https://router.huggingface.co/v1" as const;

export function getHfClient() {
  const token = process.env.HF_TOKEN;

  if (!token) {
    return { ok: false as const, response: jsonError(500, "Missing HF_TOKEN environment variable.") };
  }

  const client = new OpenAI({
    apiKey: token,
    baseURL: HF_BASE_URL,
  });

  return { ok: true as const, client };
}

export function resolveModel(override: unknown) {
  if (typeof override === "string" && override.trim().length > 0) {
    return override.trim();
  }

  return MODEL_NAME;
}
