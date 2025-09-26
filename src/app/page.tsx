import { ChatDemo } from "@/components/chat-demo";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="w-full max-w-3xl space-y-10 text-center sm:text-left">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">
            Hugging Face Inference Providers
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Streaming chat with the OpenAI client
          </h1>
          <p className="text-sm text-white/60">
            Drop a prompt below and watch tokens arrive from the router in real time. No fluff, just the pieces you need
            for streaming demos.
          </p>
        </div>

        <ChatDemo />
      </div>
    </main>
  );
}
