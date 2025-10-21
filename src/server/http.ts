export function json(body: unknown, init?: ResponseInit) {
  return Response.json(body, init);
}

export function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}
