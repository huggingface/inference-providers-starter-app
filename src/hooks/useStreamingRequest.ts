"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type StreamStatus = "idle" | "streaming" | "error";

type SubmitArgs = {
  endpoint: string;
  body: unknown;
  completionMessage: string;
};

interface StreamingState {
  response: string;
  status: StreamStatus;
  message: string | null;
}

export function useStreamingRequest() {
  const [state, setState] = useState<StreamingState>({
    response: "",
    status: "idle",
    message: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const setPartialState = useCallback((partial: Partial<StreamingState>) => {
    setState((current) => ({ ...current, ...partial }));
  }, []);

  const cancel = useCallback(() => {
    if (state.status === "streaming" && abortRef.current) {
      abortRef.current.abort();
      setPartialState({ status: "idle", message: "Stream cancelled." });
    }
  }, [setPartialState, state.status]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ response: "", status: "idle", message: null });
  }, []);

  const submit = useCallback(
    async ({ endpoint, body, completionMessage }: SubmitArgs) => {
      if (state.status === "streaming") {
        return;
      }

      const promptPresent = typeof body === "object" && body !== null && "prompt" in (body as Record<string, unknown>)
        ? typeof (body as { prompt?: unknown }).prompt === "string" && (body as { prompt?: string }).prompt.trim().length > 0
        : true;

      const messagesPresent = typeof body === "object" && body !== null && "messages" in (body as Record<string, unknown>)
        ? Array.isArray((body as { messages?: unknown }).messages) && (body as { messages?: unknown[] }).messages.length > 0
        : true;

      if (!promptPresent || !messagesPresent) {
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ response: "", status: "streaming", message: null });

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errorPayload = await res.text();
          let reason = `Request failed with status ${res.status}`;
          try {
            const parsed = JSON.parse(errorPayload);
            if (parsed && typeof parsed.error === "string") {
              reason = parsed.error;
            }
          } catch {
            if (errorPayload) {
              reason = errorPayload;
            }
          }
          throw new Error(reason);
        }

        if (!res.body) {
          throw new Error("Streaming isn't supported in this environment.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          if (chunk) {
            setState((current) => ({
              ...current,
              response: current.response + chunk,
            }));
          }
        }

        setPartialState({ status: "idle", message: completionMessage });
      } catch (error) {
        if (controller.signal.aborted) {
          setPartialState({ status: "idle", message: "Stream cancelled." });
        } else if (error instanceof Error) {
          setPartialState({ status: "error", message: error.message });
        } else {
          setPartialState({ status: "error", message: "Something went wrong." });
        }
      } finally {
        abortRef.current = null;
      }
    },
    [setPartialState, state.status],
  );

  return {
    response: state.response,
    status: state.status,
    message: state.message,
    submit,
    cancel,
    reset,
  };
}
