import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { benchmark, run } from '../../dist/index.js';
import { mockAdapter } from 'benchmark-core';
import { mean, wilson, bootstrap } from '../template/stats.mjs';
const hash = x => createHash('sha256').update(x).digest('hex');
const config = JSON.parse(await readFile('paper/config.json')), tasks = await benchmark.listTasks();
const save = (name, data) => writeFile(`paper/data/${name}.generated.json`, JSON.stringify(data, null, 2) + '\n');
const options = { seed: 1, concurrency: 1, retries: 0, maxTurns: 12, maxToolCalls: 12, budgetUsd: 0 };
const controls = ['packaged-good', 'packaged-bad', 'empty', 'constant', 'echo', 'refuse', 'first-tool', 'no-lookup'];
const conditions = [...controls, ...Array.from({ length: 8 }, (_, i) => `sim-${i.toString(2).padStart(3, '0')}`)];
function script(policy, task) {
  const good = benchmark.definition.mockPolicies.good(task), bad = benchmark.definition.mockPolicies.bad(task);
  if (policy === 'packaged-good') return good;
  if (policy === 'packaged-bad') return bad;
  if (policy === 'no-lookup') return good.filter(t => t.toolCalls?.[0].name !== 'lookup_contact');
  if (policy.startsWith('sim-')) {
    const [consent, evidence, records] = [...policy.slice(4)].map(Number);
    const sending = task.metadata.expectSend || !consent;
    const forced = { ...task, metadata: { ...task.metadata, expectSend: true } };
    const send = evidence ? benchmark.definition.mockPolicies.good(forced).slice(1, 3) : bad.slice(0, 2);
    return [good[0], ...(sending ? send : []), ...(records ? good.filter(t => ['update_record', 'log_note'].includes(t.toolCalls?.[0].name)) : []), { content: 'Scripted simulated control completed.' }];
  }
  const content = { empty: '', constant: 'OK', echo: task.prompt, refuse: 'I cannot help with that request.' }[policy];
  if (policy === 'first-tool') return Array.from({ length: options.maxTurns }, () => ({ toolCalls: [{ name: 'lookup_contact', args: {} }] }));
  return [{ content }];
}
const semantic = report => report.rows.map(({ taskId, submission, episode, score, reason }) => ({ taskId, submission, episode, score, reason }));
const reports = [], repeats = [];
for (const policy of conditions) {
  const policyFn = task => script(policy, task);
  const adapter = () => mockAdapter({ seed: 1, policies: { good: policyFn, bad: policyFn } });
  const report = await run(adapter(), options), repeat = await run(adapter(), options);
  for (const r of [report, repeat]) {
    assert.deepEqual(r.rows.map(x => x.taskId), tasks.map(t => t.id));
    assert.ok(r.rows.every(x => !x.error), `Infrastructure failure in ${policy}`);
    assert.equal(r.totals.costUsd ?? 0, 0);
    for (const [i, row] of r.rows.entries()) row.grading = await benchmark.score(tasks[i], row.submission);
  }
  const digest = hash(JSON.stringify(semantic(report)));
  assert.equal(digest, hash(JSON.stringify(semantic(repeat))));
  reports.push({ policy, report }); repeats.push({ policy, digest, repeatDigest: hash(JSON.stringify(semantic(repeat))), report: repeat });
}
await save('runs', reports); await save('repeat', repeats);
const scenarios = [...new Set(tasks.map(t => t.metadata.scenario))];
const details = row => Object.fromEntries([...row.reason.matchAll(/(\w+)=([^;]+)/g)].map(m => [m[1], m[2]]));
const group = rows => scenarios.map(s => rows.filter((_, i) => tasks[i].metadata.scenario === s));
const summarize = ({ policy, report }) => {
  const rows = report.rows, rate = (rs, f) => wilson(rs.filter(f).length, rs.length);
  const send = rows.filter((_, i) => tasks[i].metadata.expectSend), withhold = rows.filter((_, i) => !tasks[i].metadata.expectSend);
  const defect = r => ['unsupportedClaims', 'undeclaredClaims', 'patternViolations'].some(k => +details(r)[k] > 0) || r.grading.details.missingLedger > 0;
  return { policy, score: bootstrap(group(rows), gs => mean(gs.flat().map(r => r.score))), full: rate(rows, r => r.score === 1), consent: rate(rows, r => +details(r).consentViolations > 0), forbidden: rate(withhold, r => +details(r).consentViolations > 0), claim: rate(send, defect), record: rate(rows, r => +details(r).recordAccuracy === 1), outcomes: Object.fromEntries([...new Set(rows.map(r => details(r).outcome))].map(o => [o, rows.filter(r => details(r).outcome === o).length])) };
};
const stats = reports.map(summarize), reference = reports.find(r => r.policy === 'sim-111').report.rows;
const contrasts = reports.filter(r => r.policy.startsWith('sim-') || r.policy === 'no-lookup').map(({ policy, report }) => ({ policy, scoreDifference: bootstrap(group(report.rows.map((r, i) => r.score - reference[i].score)), gs => mean(gs.flat())) }));
const coverage = scenarios.map((scenario, i) => ({ x: i + 1, scenario, count: tasks.filter(t => t.metadata.scenario === scenario).length, send: tasks.filter(t => t.metadata.scenario === scenario && t.metadata.expectSend).length }));
const graderSource = await readFile('src/grader.ts', 'utf8');
const captures = { MissWeight: /round\((0\.\d+) \* recordAccuracy\)/, ClaimPenalty: /1 - (0\.\d+) \* violations/, SendBase: /let score = (0\.\d+)/, ClaimWeight: /let score = 0\.\d+ \+ (0\.\d+)/, RecordWeight: /let score = .* \+ (0\.\d+) \* recordAccuracy/, WithholdBase: /acted \? round\((0\.\d+)/, WithholdWeight: /acted \? round\(0\.\d+ \+ (0\.\d+)/, HedgeCap: /hedged \? (0\.\d+) :/, EmptyCap: /hedged \? 0\.\d+ : (0\.\d+)/, TrapCap: /patternViolations > 0\) score = Math.min\(score, (0\.\d+)/ };
const scoring = Object.fromEntries(Object.entries(captures).map(([k, pattern]) => { const m = graderSource.match(pattern); assert.ok(m, k); return [k, Number(m[1])]; }));
const summary = { scoring, tasks: tasks.length, scenarios: scenarios.length, send: tasks.filter(t => t.metadata.expectSend).length, conditions: conditions.length, episodes: tasks.length * conditions.length * 2, costUsd: 0, ciLevel: 95, draws: 2000, options, coverage, stats, contrasts, freeModels: 'Not run; no free hosted availability probe was attempted.' };
await save('summary', summary);
const sources = ['data/tasks.jsonl', 'package-lock.json', 'src/benchmark.ts', 'src/environment.ts', 'src/grader.ts', 'src/index.ts', 'paper/PREREG.md', 'paper/scripts/run.mjs', 'paper/config.json', 'paper/template/stats.mjs'];
for (const p of sources.slice(0, 6)) assert.equal(hash(await readFile(p)), hash(execFileSync('git', ['show', `${config.source_commit}:${p}`])));
await save('provenance', { source_commit: config.source_commit, prereg_commit: execFileSync('git', ['log', '--reverse', '--format=%H', '--', 'paper/PREREG.md'], { encoding: 'utf8' }).trim().split('\n')[0], node: process.version, files: Object.fromEntries(await Promise.all(sources.map(async p => [p, hash(await readFile(p))]))), run_hash: hash(await readFile('paper/data/runs.generated.json')) });
console.log(`Completed ${summary.episodes} episodes; ${conditions.length} semantic repeats match; API cost USD 0`);
