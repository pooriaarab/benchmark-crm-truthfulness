import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { MAX_TOOL_LOG_ENTRIES, openrouterAdapter } from "benchmark-core";
import { benchmark, benchmarkWithTasks, resolvePackageTasksPath } from "./benchmark.js";
import { run } from "./index.js";

const tools = [
  { name: "list_tasks", description: "List benchmark task ids and prompts.", inputSchema: { type: "object", properties: { tasksPath: { type: "string", description: "Optional .jsonl task file inside the package (for example a generated hidden split)." } }, additionalProperties: false } },
  { name: "get_task", description: "Get one benchmark task.", inputSchema: { type: "object", properties: { taskId: { type: "string" }, tasksPath: { type: "string", description: "Optional .jsonl task file inside the package." } }, required: ["taskId"], additionalProperties: false } },
  { name: "score_answer", description: "Score a trace with the deterministic benchmark grader.", inputSchema: { type: "object", properties: { taskId: { type: "string" }, submission: { type: "object" }, seed: { type: "number" }, tasksPath: { type: "string", description: "Optional .jsonl task file inside the package." } }, required: ["taskId", "submission"], additionalProperties: false } },
  { name: "run_benchmark", description: "Run every task through an OpenRouter model.", inputSchema: { type: "object", properties: { model: { type: "string" }, tasksPath: { type: "string", description: "Optional .jsonl task file inside the package." } }, required: ["model"], additionalProperties: false } },
  { name: "get_provenance", description: "Get benchmark data provenance.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
];

const content = (value: unknown, isError = false) => ({ content: [{ type: "text" as const, text: JSON.stringify(value) }], ...(isError ? { isError: true } : {}) });
const forTasks = (value: unknown) => value === undefined ? benchmark : benchmarkWithTasks(resolvePackageTasksPath(value));
const args = (value: unknown) => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function createMcpServer() {
  const server = new Server({ name: benchmark.definition.id, version: benchmark.definition.version }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...tools] }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const input = args(request.params.arguments);
      if (request.params.name === "list_tasks") return content({ tasks: await forTasks(input.tasksPath).listTasks() });
      if (request.params.name === "get_task") {
        if (typeof input.taskId !== "string") return content({ error: "taskId is required." }, true);
        const task = await forTasks(input.tasksPath).getTask(input.taskId);
        return task ? content({ task }) : content({ error: "Task not found." }, true);
      }
      if (request.params.name === "score_answer") {
        if (typeof input.taskId !== "string" || !input.submission || typeof input.submission !== "object" || Array.isArray(input.submission)) return content({ error: "taskId and submission are required." }, true);
        const submittedLog = Reflect.get(input.submission, "toolLog");
        if (Array.isArray(submittedLog) && submittedLog.length > MAX_TOOL_LOG_ENTRIES) return content({ error: `toolLog may not exceed ${MAX_TOOL_LOG_ENTRIES} entries.` }, true);
        const task = await forTasks(input.tasksPath).getTask(input.taskId);
        if (!task) return content({ error: "Task not found." }, true);
        const grade = await benchmark.score(task, input.submission, typeof input.seed === "number" ? { seed: input.seed } : {});
        return content({ taskId: task.id, ...grade, breakdown: grade.details ?? null });
      }
      if (request.params.name === "run_benchmark") {
        if (typeof input.model !== "string") return content({ error: "model is required." }, true);
        if (!process.env.OPENROUTER_API_KEY) return content({ error: "OPENROUTER_API_KEY is required to run a benchmark." }, true);
        return content(await run(openrouterAdapter({ model: input.model }), input.tasksPath === undefined ? {} : { tasksPath: resolvePackageTasksPath(input.tasksPath) }));
      }
      if (request.params.name === "get_provenance") return content({ provenance: benchmark.definition.provenance });
      return content({ error: `Unknown tool: ${request.params.name}` }, true);
    } catch (caught) {
      return content({ error: caught instanceof Error ? caught.message : "Unknown error." }, true);
    }
  });
  return server;
}

export async function startMcp() {
  await createMcpServer().connect(new StdioServerTransport());
}
