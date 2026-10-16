import { createHandler, MAX_TOOL_LOG_ENTRIES, type Trace } from "benchmark-core";
import { benchmark, benchmarkWithTasks, resolvePackageTasksPath } from "./benchmark.js";

const inner = createHandler(benchmark);
const failure = (code: string, message: string, status: number) => Response.json({ error: { code, message } }, { status });

function packageBenchmark(value: unknown) {
  try {
    return benchmarkWithTasks(resolvePackageTasksPath(value));
  } catch (caught) {
    return failure("INVALID_TASKS_PATH", caught instanceof Error ? caught.message : "Invalid tasksPath.", 400);
  }
}

export async function handler(request: Request): Promise<Response> {
  const { pathname, searchParams } = new URL(request.url);
  const tasksParam = searchParams.get("tasks");
  if (request.method === "GET" && tasksParam !== null && (pathname === "/v1/tasks" || pathname.startsWith("/v1/tasks/"))) {
    const alt = packageBenchmark(tasksParam);
    if (alt instanceof Response) return alt;
    if (pathname === "/v1/tasks") return Response.json({ tasks: await alt.listTasks() });
    const task = await alt.getTask(decodeURIComponent(pathname.slice("/v1/tasks/".length)));
    return task ? Response.json({ task }) : failure("NOT_FOUND", "Task not found.", 404);
  }
  if (request.method === "POST" && pathname === "/v1/score") {
    const payload = await request.clone().json().catch(() => null);
    if (payload !== null && typeof payload === "object" && !Array.isArray(payload) && "tasksPath" in payload) {
      const body = payload as Record<string, unknown>;
      const alt = packageBenchmark(body.tasksPath);
      if (alt instanceof Response) return alt;
      const submission = body.submission as Trace | null;
      if (typeof body.taskId !== "string" || submission === null || typeof submission !== "object" || Array.isArray(submission)
        || (submission.answer !== undefined && typeof submission.answer !== "string")
        || (submission.toolLog !== undefined && !Array.isArray(submission.toolLog))) return failure("INVALID_REQUEST", "taskId and submission are required.", 400);
      if (submission.toolLog !== undefined && submission.toolLog.length > MAX_TOOL_LOG_ENTRIES) return failure("TOOL_LOG_LIMIT", `toolLog may not exceed ${MAX_TOOL_LOG_ENTRIES} entries.`, 400);
      const task = await alt.getTask(body.taskId);
      if (!task) return failure("NOT_FOUND", "Task not found.", 404);
      const grade = await alt.score(task, submission as Trace, typeof body.seed === "number" ? { seed: body.seed } : {});
      return Response.json({ taskId: task.id, ...grade, breakdown: grade.details ?? null });
    }
  }
  const response = await inner(request);
  if (request.method !== "POST" || pathname !== "/v1/score" || !response.ok) return response;
  const payload = await response.json() as Record<string, unknown>;
  if (payload.details === null || typeof payload.details !== "object") return Response.json(payload, { status: response.status });
  return Response.json({ ...payload, breakdown: payload.details }, { status: response.status });
}
