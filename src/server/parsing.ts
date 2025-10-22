export function parseJsonField(value: unknown, label: string) {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    try {
      return JSON.parse(trimmed);
    } catch {
      throw new Error(`Invalid JSON in ${label}.`);
    }
  }

  if (typeof value === "object") {
    return value;
  }

  throw new Error(`Invalid ${label}.`);
}
