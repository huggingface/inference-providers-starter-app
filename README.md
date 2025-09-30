# Hugging Face Inference Providers – Streaming Starter

Minimal Next.js + shadcn template that demonstrates how to stream chat completions **and** Responses API output from the Hugging Face Inference Provider router with the official OpenAI SDK. Use this project as a launchpad for richer demos (structured outputs, function calling, tools) while keeping the streaming and schema primitives identical to production code.

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Expose your Hugging Face access token (requires the Inference Providers feature):
   ```bash
   export HF_TOKEN=hf_xxx
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Visit [http://localhost:3000](http://localhost:3000), pick a provider, choose between **Chat Completions** and **Responses** in the API toggle, and submit a prompt. Tokens stream into the UI as they arrive from the router.

## Project structure

- `src/app/page.tsx` – Landing page that introduces streaming, renders both demos, and keeps the selected API mode (Chat vs Responses) in sync across the UI and code snippets.
- `src/components/chat-demo.tsx` – Client component that posts prompts to the streaming API route, highlights the active API mode, and updates the UI token-by-token.
- `src/components/structured-demo.tsx` – JSON-schema example that now works with either Chat Completions or the Responses API and surfaces schema errors to the user.
- `src/app/api/chat/route.ts` – Endpoint that forwards chat completions to `https://router.huggingface.co/v1` via `OpenAI.chat.completions.create({ stream: true })` and relays chunks back to the browser.
- `src/app/api/responses/route.ts` – Streaming endpoint that pipes `OpenAI.responses.stream` events to the browser, including snapshot-based fallbacks for providers that omit deltas.
- `src/app/api/structured/route.ts` – Structured output endpoint that dynamically calls `responses.create` or `chat.completions.create` based on the selected mode, parsing schema-enforced JSON (or falling back when unsupported).
- `src/components/ui/*` – Minimal shadcn-inspired primitives (button, card, textarea, label) styled with Hugging Face colors.

## Customising the demo

- Switch providers by changing `MODEL_NAME` in `src/config/model.ts`.
- During development, type any provider ID into the `Model` field on the homepage to try it instantly across both demos.
- Use the **API mode** toggle to compare Chat Completions vs Responses end-to-end, including the snippets shown in the collapsible panels.
- Some models do not support JSON schema enforcement; when that happens the structured demo falls back to best-effort JSON and suggests trying a schema-aware model. The Responses path also surfaces any schema errors returned by the router.
- Add system or assistant messages by editing the `messages` array in `src/components/chat-demo.tsx`, or tweak the structured prompts in `src/components/structured-demo.tsx`.
- Extend the UI with additional shadcn components as you explore structured outputs, tool invocation, or trace visualisations.

## Environment variables

Create a `.env.local` file (or export variables in your shell) with:

```
HF_TOKEN=your_hugging_face_access_token
```

The API route will return a `500` if `HF_TOKEN` is missing, making the requirement explicit for learners.

## Notes

- This starter intentionally keeps dependencies light: Next.js handles routing/rendering, and the shadcn primitives are file-based.
- Tailwind v4 powers the styling; the palette mirrors the Hugging Face gradient to reinforce the educational context.
