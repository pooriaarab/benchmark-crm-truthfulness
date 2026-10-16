#!/usr/bin/env node
import { parseArgs } from "node:util";
import { createCli, mockAdapter, openaiCompatAdapter, openrouterAdapter, renderMarkdown, serve, type ModelAdapter } from "benchmark-core";
import { benchmark } from "./benchmark.js";
import { run } from "./index.js";
import { startMcp } from "./mcp.js";
import { handler } from "./api.js";

const bin = "benchmark-crm-truthfulness";

function adapter(provider: string, model: string, seed: number): ModelAdapter {
  if (provider === "mock") return mockAdapter({ seed, ...(benchmark.definition.mockPolicies ? { policies: benchmark.definition.mockPolicies } : {}) });
  if (provider === "openrouter") return openrouterAdapter({ model });
  if (provider === "openai") return openaiCompatAdapter({ model });
  throw new Error("--provider must be openrouter, openai, or mock.");
}

async function runCommand(args: string[]): Promise<number> {
  const jsonOutput = args.includes("--json");
  const parsed = parseArgs({
    args: args.filter((arg) => arg !== "--json"),
    options: { model: { type: "string" }, provider: { type: "string" }, tasks: { type: "string" }, concurrency: { type: "string" }, timeout: { type: "string" }, retries: { type: "string" }, seed: { type: "string" }, "max-turns": { type: "string" }, "max-tool-calls": { type: "string" }, budget: { type: "string" } },
    strict: true,
  });
  const model = parsed.values.model;
  const provider = parsed.values.provider;
  if (!model || !provider) throw new Error("run needs --model and --provider.");
  const seed = Number(parsed.values.seed ?? 1);
  const result = await run(adapter(provider, model, seed), {
    ...(parsed.values.tasks ? { tasksPath: parsed.values.tasks } : {}),
    ...(parsed.values.concurrency ? { concurrency: Number(parsed.values.concurrency) } : {}),
    ...(parsed.values.timeout ? { timeoutMs: Number(parsed.values.timeout) } : {}),
    ...(parsed.values.retries ? { retries: Number(parsed.values.retries) } : {}),
    seed,
    ...(parsed.values["max-turns"] ? { maxTurns: Number(parsed.values["max-turns"]) } : {}),
    ...(parsed.values["max-tool-calls"] ? { maxToolCalls: Number(parsed.values["max-tool-calls"]) } : {}),
    ...(parsed.values.budget ? { budgetUsd: Number(parsed.values.budget) } : {}),
  });
  if (jsonOutput) console.log(JSON.stringify(result));
  else {
    const t = result.truthfulness;
    console.log(`${renderMarkdown(result)}\ntruthfulness: consentViolationRate=${t.consentViolationRate} unsupportedClaims=${t.unsupportedClaims} undeclaredClaims=${t.undeclaredClaims} patternViolations=${t.patternViolations} recordAccuracy=${t.recordAccuracy}`);
  }
  return result.rows.some((row) => row.error) ? 2 : 0;
}

process.exitCode = await (async () => {
  try {
    if (process.argv[2] === "run") return await runCommand(process.argv.slice(3));
    if (process.argv[2] === "mcp") {
      await startMcp();
      return 0;
    }
    if (process.argv[2] === "serve") {
      const rest = process.argv.slice(3).filter((arg) => arg !== "--json");
      const parsed = parseArgs({ args: rest, options: { host: { type: "string" } }, allowPositionals: true, strict: true });
      if (parsed.positionals.length > 1) throw new Error("serve accepts at most one port.");
      const port = Number(parsed.positionals[0] ?? process.env.PORT ?? 3e3);
      const hostname = parsed.values.host ?? "127.0.0.1";
      if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("serve port must be an integer from 0 to 65535.");
      if (!hostname.trim()) throw new Error("--host must not be empty.");
      await serve(handler, { port, hostname });
      console.log(`Listening on http://${hostname}:${port}`);
      return 0;
    }
    return await createCli(benchmark, { bin }).main(process.argv.slice(2));
  } catch (caught) {
    console.error(caught instanceof Error ? caught.message : String(caught));
    return 2;
  }
})();
