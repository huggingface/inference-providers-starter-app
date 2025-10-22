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

const createInitialState = (): StreamingState => ({
  response: "",
  status: "idle",
  message: null,
});

export function useStreamingRequest() {
  const [state, setState] = useState<StreamingState>(() => createInitialState());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const cancel = useCallback(() => {
    if (!abortRef.current) {
      return;
    }
    abortRef.current.abort();
    abortRef.current = null;
    setState((current) =>
      current.status === "streaming"
        ? { ...current, status: "idle", message: "Stream cancelled." }
        : current,
    );
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(createInitialState());
  }, []);

  const submit = useCallback(
    async ({ endpoint, body, completionMessage }: SubmitArgs) => {
      if (state.status === "streaming") {
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
        let buffer = "";
        let doneStreaming = false;
        let streamErrored = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          let separatorIndex: number;
          while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
            const rawEvent = buffer.slice(0, separatorIndex).trim();
            buffer = buffer.slice(separatorIndex + 2);

            if (!rawEvent) {
              continue;
            }

            const dataLines = rawEvent
              .split("\n")
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trim());

            if (dataLines.length === 0) {
              continue;
            }

            const dataPayload = dataLines.join("\n");
            if (dataPayload === "[DONE]") {
              buffer = "";
              doneStreaming = true;
              break;
            }

            try {
              const parsed = JSON.parse(dataPayload) as { event?: string; data?: unknown };
              const eventType = parsed.event;
              const eventData = parsed.data as Record<string, unknown> | undefined;

              if (eventType === "error" || eventType === "response.error") {
                const message =
                  (eventData?.message as string | undefined) ??
                  (eventData?.error as string | undefined) ??
                  "Streaming request failed.";
                streamErrored = true;
                setState((current) => ({
                  ...current,
                  status: "error",
                  message,
                }));
              } else if (eventType === "response.output_text.delta") {
                const delta = typeof eventData?.delta === "string" ? eventData.delta : "";
                if (delta) {
                  setState((current) => ({
                    ...current,
                    response: current.response + delta,
                  }));
                }
              } else if (eventType === "chat.completions.delta") {
                const delta =
                  typeof eventData?.delta === "string"
                    ? eventData.delta
                    : typeof eventData?.content === "string"
                      ? eventData.content
                      : typeof eventData?.text === "string"
                        ? eventData.text
                        : "";
                if (delta) {
                  setState((current) => ({
                    ...current,
                    response: current.response + delta,
                  }));
                }
              } else if (eventType === "response.completed") {
                const text =
                  typeof eventData?.output_text === "string"
                    ? eventData.output_text
                    : "";
                if (text) {
                  setState((current) => ({
                    ...current,
                    response: current.response.endsWith(text) ? current.response : current.response + text,
                  }));
                }
              }
            } catch (error) {
              console.error("Failed to parse SSE event", error);
            }
          }

          if (doneStreaming) {
            break;
          }
        }

        if (!streamErrored) {
          setState((current) => ({
            ...current,
            status: "idle",
            message: completionMessage,
          }));
        }
      } catch (error) {
        if (controller.signal.aborted) {
          setState((current) => ({
            ...current,
            status: "idle",
            message: "Stream cancelled.",
          }));
        } else {
          const message = error instanceof Error ? error.message : "Something went wrong.";
          setState((current) => ({
            ...current,
            status: "error",
            message,
          }));
        }
      } finally {
        abortRef.current = null;
      }
    },
    [state.status],
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
