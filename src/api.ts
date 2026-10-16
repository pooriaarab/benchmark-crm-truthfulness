import { createHandler } from "benchmark-core";
import { benchmark } from "./benchmark.js";

const inner = createHandler(benchmark);

export async function handler(request: Request): Promise<Response> {
  const response = await inner(request);
  const { pathname } = new URL(request.url);
  if (request.method !== "POST" || pathname !== "/v1/score" || !response.ok) return response;
  const payload = await response.json() as Record<string, unknown>;
  if (payload.details === null || typeof payload.details !== "object") return Response.json(payload, { status: response.status });
  return Response.json({ ...payload, breakdown: payload.details }, { status: response.status });
}
