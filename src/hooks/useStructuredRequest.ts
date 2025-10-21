"use client";

import { useCallback, useState } from "react";

type StructuredStatus = "idle" | "loading" | "error";

type SubmitArgs = {
  endpoint: string;
  body: unknown;
};

interface StructuredState {
  result: object | null;
  raw: string | null;
  status: StructuredStatus;
  message: string | null;
  schemaHint: string | null;
}

const createInitialState = (): StructuredState => ({
  result: null,
  raw: null,
  status: "idle",
  message: null,
  schemaHint: null,
});

export function useStructuredRequest() {
  const [state, setState] = useState<StructuredState>(() => createInitialState());

  const reset = useCallback(() => {
    setState(createInitialState());
  }, []);

  const submit = useCallback(async ({ endpoint, body }: SubmitArgs) => {
    if (state.status === "loading") {
      return;
    }

    setState({ result: null, raw: null, status: "loading", message: null, schemaHint: null });

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const payload = await res.text();
        let reason = `Request failed with status ${res.status}`;
        try {
          const parsed = JSON.parse(payload);
          if (parsed && typeof parsed.error === "string") {
            reason = parsed.error;
          }
        } catch {
          if (payload) {
            reason = payload;
          }
        }
        throw new Error(reason);
      }

      const json = await res.json();
      const data = json && typeof json === "object" ? json.data : undefined;
      const rawText = json && typeof json === "object" ? json.raw : undefined;
      const metaMessage = json?.meta?.message as string | undefined;
      const metaSchemaError = json?.meta?.schemaError as string | undefined;

      setState({
        result: data && typeof data === "object" ? data : null,
        raw: typeof rawText === "string" && rawText.length ? rawText : null,
        status: "idle",
        message: metaMessage || "Structured output ready.",
        schemaHint: metaSchemaError || null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      setState({ result: null, raw: null, status: "error", message, schemaHint: null });
    }
  }, [state.status]);

  return {
    result: state.result,
    raw: state.raw,
    status: state.status,
    message: state.message,
    schemaHint: state.schemaHint,
    submit,
    reset,
  };
}
