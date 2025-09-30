import { NextRequest } from "next/server";
import { jsonError } from "./http";

export async function readJson<T>(req: NextRequest) {
  try {
    const data = await req.json();
    return { ok: true as const, data: data as T };
  } catch {
    return { ok: false as const, response: jsonError(400, "Invalid JSON body.") };
  }
}
