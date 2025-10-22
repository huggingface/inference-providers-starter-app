function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

export function coalesceOutputText(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  const maybeOutputText = payload.output_text;
  if (typeof maybeOutputText === "string" && maybeOutputText.trim().length > 0) {
    return maybeOutputText;
  }

  const maybeOutput = payload.output;
  if (Array.isArray(maybeOutput)) {
    for (const item of maybeOutput) {
      if (isRecord(item) && item.type === "message") {
        const contentList = item.content;
        if (Array.isArray(contentList)) {
          for (const part of contentList) {
            if (isRecord(part) && part.type === "output_text" && typeof part.text === "string" && part.text.trim()) {
              return part.text;
            }
          }
        }
      }
    }
  }

  const maybeChoices = payload.choices;
  if (Array.isArray(maybeChoices)) {
    for (const choice of maybeChoices) {
      if (isRecord(choice)) {
        const message = choice.message;
        if (isRecord(message)) {
          const content = message.content;
          if (typeof content === "string" && content.trim().length > 0) {
            return content;
          }
        }
      }
    }
  }

  return null;
}

export function coalesceParsedOutput(payload: unknown): unknown | null {
  if (!isRecord(payload)) {
    return null;
  }

  if ("output_parsed" in payload) {
    const parsed = payload.output_parsed;
    if (parsed !== undefined && parsed !== null) {
      return parsed;
    }
  }

  const maybeOutput = payload.output;
  if (Array.isArray(maybeOutput)) {
    for (const item of maybeOutput) {
      if (isRecord(item) && item.type === "message") {
        const contentList = item.content;
        if (Array.isArray(contentList)) {
          for (const part of contentList) {
            if (isRecord(part) && part.type === "output_text" && "parsed" in part) {
              const parsed = (part as { parsed?: unknown }).parsed;
              if (parsed !== undefined && parsed !== null) {
                return parsed;
              }
            }
          }
        }
      }
    }
  }

  return null;
}
