const JSON_CONTENT_TYPE = "application/json" as const;

interface JsonInit extends Omit<ResponseInit, "headers"> {
  headers?: HeadersInit;
}

export function json(body: unknown, init: JsonInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": JSON_CONTENT_TYPE,
  };

  if (init.headers) {
    for (const [key, value] of Object.entries(init.headers)) {
      if (typeof value !== "undefined") {
        headers[key] = String(value);
      }
    }
  }

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

export function jsonError(status: number, error: string) {
  return json({ error }, { status });
}
