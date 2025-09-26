import Link from "next/link";
import { ChatDemo } from "@/components/chat-demo";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-16 sm:py-24">
      <div className="w-full max-w-5xl space-y-16">
        <header className="space-y-6 text-center sm:text-left">
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            <span>Hugging Face Inference Providers</span>
          </div>
          <div className="space-y-3">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Stream tokens with the OpenAI client
            </h1>
            <p className="mx-auto max-w-3xl text-balance text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
              This minimal starter shows how to use the Hugging Face Inference Provider router with the OpenAI SDK.
              It focuses entirely on the streaming primitives we will reuse when we add structured outputs and function
              calling later on.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-start">
            <Link
              href="#demo"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#ffb100] px-6 text-sm font-semibold text-[#1c1c1c] transition hover:bg-[#ff9d00]"
            >
              Watch the stream
            </Link>
            <Link
              href="https://huggingface.co/inference-providers"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Provider docs
            </Link>
          </div>
        </header>

        <section id="demo" className="flex justify-center">
          <ChatDemo />
        </section>

        <section className="grid gap-6 rounded-3xl border border-white/5 bg-white/5 p-8 text-white/70 sm:grid-cols-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">Why streaming?</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Token streams give users immediate feedback, shrinking perceived latency while the provider processes the
              full request.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">What&apos;s next?</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              We&apos;ll layer structured outputs, function calling, and tool orchestration on top of the same streaming
              surface.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">Try it locally</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Provide an <span className="font-semibold text-white">HF_TOKEN</span>, run <code>npm run dev</code>, and explore the
              generated chunks in your own terminal or UI.
            </p>
          </div>
        </section>

        <footer className="text-center text-sm text-white/50 sm:text-left">
          Built with Next.js App Router and shadcn components. Swap the model in <code>src/app/api/chat/route.ts</code>
          to explore other providers available through the router.
        </footer>
      </div>
    </main>
  );
}
