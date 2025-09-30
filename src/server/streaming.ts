import { NextRequest } from "next/server";

interface StreamTextOptions<T> {
  req: NextRequest;
  iterator: AsyncIterable<T>;
  cancel: () => void;
  onChunk: (chunk: T, enqueue: (text: string) => void) => void | Promise<void>;
  onComplete?: (enqueue: (text: string) => void) => void | Promise<void>;
  onErrorMessage?: (error: unknown) => string;
}

export function streamText<T>({ req, iterator, cancel, onChunk, onComplete, onErrorMessage }: StreamTextOptions<T>) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (text: string) => {
        if (!text) {
          return;
        }
        controller.enqueue(encoder.encode(text));
      };

      const abortStream = () => {
        try {
          cancel();
        } catch {
          // ignore cancellation failures
        }
        controller.close();
      };

      req.signal.addEventListener("abort", abortStream);

      try {
        for await (const chunk of iterator) {
          await onChunk(chunk, enqueue);
        }
        if (onComplete) {
          await onComplete(enqueue);
        }
      } catch (error) {
        const message = onErrorMessage
          ? onErrorMessage(error)
          : error instanceof Error
            ? error.message
            : "Unexpected streaming error.";
        enqueue(`\n[Stream error] ${message}`);
      } finally {
        req.signal.removeEventListener("abort", abortStream);
        controller.close();
      }
    },
    cancel() {
      try {
        cancel();
      } catch {
        // swallow cancellation errors
      }
    },
  });
}
