# Hugging Face Inference Providers Starter App

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

- `src/app/page.tsx` – Landing page grouping Chat Completions and Responses capabilities, each with a live demo and matching code snippet.
- `src/components/chat-demo.tsx` – Client component powered by a reusable streaming hook that posts prompts to the selected API route and renders tokens as they arrive.
- `src/components/structured-demo.tsx` – JSON-schema example built on a shared structured-output hook that switches between Chat Completions and Responses while surfacing schema errors.
- `src/components/tool-calling-demo.tsx` / `src/components/mcp-demo.tsx` – Focused Responses API demos for function calling and MCP payloads.
- `src/hooks/useStreamingRequest.ts` – Encapsulates the fetch/abort/error state machine for streaming POST requests so multiple demos can reuse identical logic.
- `src/hooks/useStructuredRequest.ts` – Handles JSON responses, metadata, and schema hints from the structured output endpoint.
- `src/app/api/chat/stream/route.ts` – Streams chat completions through `OpenAI.chat.completions.create({ stream: true })`.
- `src/app/api/chat/structured/route.ts` – Structured output endpoint for chat completions using `response_format`.
- `src/app/api/responses/stream/route.ts` – Pipes `OpenAI.responses.stream` text events back to the browser.
- `src/app/api/responses/structured/route.ts` – Structured Responses API endpoint that surfaces schema errors and raw fallbacks.
- `src/app/api/responses/tool-calling/route.ts` – Demonstrates streaming tool calls with automatic `submitToolOutputs`.
- `src/app/api/responses/mcp/route.ts` – Streams Responses output while forwarding MCP server metadata.
- `src/server/*` – Shared server utilities (HF client factory, HTTP helpers, structured output orchestration) used by every API route.
- `src/components/ui/*` – Minimal shadcn-inspired primitives (button, card, textarea, label) styled with Hugging Face colors.

## Customising the demo

- Switch providers by changing `MODEL_NAME` in `src/config/model.ts`.
- During development, type any provider ID into the `Model` field on the homepage to try it instantly across both demos.
- Each capability card is isolated; tweak prompts and payload JSON in-place to compare Chat Completions vs Responses behaviours side-by-side.
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
