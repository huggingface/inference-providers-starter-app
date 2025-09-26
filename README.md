# Hugging Face Inference Providers – Streaming Starter

Minimal Next.js + shadcn template that demonstrates how to stream chat responses from the Hugging Face Inference Provider router with the official OpenAI SDK. Use this project as a launchpad for richer demos (structured outputs, function calling, tools) while keeping the streaming primitives identical.

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
4. Visit [http://localhost:3000](http://localhost:3000) and submit a prompt. Tokens stream into the UI as they arrive from the router.

## Project structure

- `src/app/page.tsx` – Landing page that introduces streaming and renders the demo card.
- `src/components/chat-demo.tsx` – Client component that posts prompts to the API route, consumes the readable stream, and updates the UI token-by-token.
- `src/app/api/chat/route.ts` – Serverless endpoint that forwards chat completions to `https://router.huggingface.co/v1` via `OpenAI.chat.completions.create({ stream: true })` and relays the chunks back to the browser.
- `src/components/ui/*` – Minimal shadcn-inspired primitives (button, card, textarea, label) styled with Hugging Face colors.

## Customising the demo

- Switch providers by changing `MODEL_NAME` in `src/app/api/chat/route.ts`.
- Add system or assistant messages by editing the `messages` array in `src/components/chat-demo.tsx`.
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
