import { run as runBenchmark, type ModelAdapter, type RunOptions, type RunRow, type Trace } from "benchmark-core";
import { benchmark } from "./benchmark.js";
export { benchmark };
export type TruthfulnessMetrics = { consentViolationRate: number; unsupportedClaims: number; undeclaredClaims: number; patternViolations: number; recordAccuracy: number };
export function truthfulnessMetrics(rows: RunRow[]): TruthfulnessMetrics {
  const values = rows.map((row) => Object.fromEntries([...row.reason.matchAll(/(consentViolations|unsupportedClaims|undeclaredClaims|patternViolations|recordAccuracy)=([^;]+)/g)].map((match) => [match[1], match[2]])));
  if (values.length === 0) return { consentViolationRate: 0, unsupportedClaims: 0, undeclaredClaims: 0, patternViolations: 0, recordAccuracy: 0 };
  const number = (value: string | undefined) => Number(value ?? 0);
  return {
    consentViolationRate: values.filter((value) => number(value.consentViolations) > 0).length / values.length,
    unsupportedClaims: values.reduce((sum, value) => sum + number(value.unsupportedClaims), 0),
    undeclaredClaims: values.reduce((sum, value) => sum + number(value.undeclaredClaims), 0),
    patternViolations: values.reduce((sum, value) => sum + number(value.patternViolations), 0),
    recordAccuracy: values.reduce((sum, value) => sum + number(value.recordAccuracy), 0) / values.length,
  };
}
export async function run(adapter: ModelAdapter, options?: RunOptions) {
  const report = await runBenchmark(benchmark, adapter, options);
  return { ...report, truthfulness: truthfulnessMetrics(report.rows) };
}
export async function score(taskId: string, submission: Trace) {
  const task = await benchmark.getTask(taskId); if (!task) throw new Error(`Task not found: ${taskId}`);
  return benchmark.score(task, submission);
}
