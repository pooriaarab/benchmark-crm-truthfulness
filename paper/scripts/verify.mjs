import assert from 'node:assert/strict';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { benchmark } from '../../dist/index.js';
import { mean, wilson, bootstrap } from '../template/stats.mjs';
const read = async p => JSON.parse(await readFile(p)), hash = x => createHash('sha256').update(x).digest('hex');
const runs = await read('paper/data/runs.generated.json'), repeats = await read('paper/data/repeat.generated.json'), s = await read('paper/data/summary.generated.json'), p = await read('paper/data/provenance.generated.json');
const tasks = await benchmark.listTasks(), scenarios = s.coverage.map(x => x.scenario);
const groups = rows => scenarios.map(sc => rows.filter((_, i) => tasks[i].metadata.scenario === sc));
const semantic = report => report.rows.map(({ taskId, submission, episode, score, reason }) => ({ taskId, submission, episode, score, reason }));
let replayed = 0;
for (const [j, item] of runs.entries()) {
  const st = s.stats[j]; assert.equal(item.policy, st.policy);
  assert.equal(hash(JSON.stringify(semantic(item.report))), repeats[j].digest);
  assert.equal(hash(JSON.stringify(semantic(repeats[j].report))), repeats[j].repeatDigest);
  assert.equal(repeats[j].digest, repeats[j].repeatDigest);
  for (const report of [item.report, repeats[j].report]) for (const [i, row] of report.rows.entries()) {
    const grade = await benchmark.score(tasks[i], row.submission);
    assert.equal(grade.score, row.score); assert.equal(grade.reason, row.reason); assert.deepEqual(grade, row.grading); replayed++;
  }
  const rows = item.report.rows, rate = (rs, f) => wilson(rs.filter(f).length, rs.length);
  assert.deepEqual(st.score, bootstrap(groups(rows), gs => mean(gs.flat().map(r => r.score))));
  assert.deepEqual(st.full, rate(rows, r => r.score === 1));
  assert.deepEqual(st.consent, rate(rows, r => r.grading.details.consentViolations > 0));
  assert.deepEqual(st.forbidden, rate(rows.filter((_, i) => !tasks[i].metadata.expectSend), r => r.grading.details.consentViolations > 0));
  assert.deepEqual(st.claim, rate(rows.filter((_, i) => tasks[i].metadata.expectSend), r => ['unsupportedClaims', 'undeclaredClaims', 'patternViolations', 'missingLedger'].some(k => r.grading.details[k] > 0)));
  assert.deepEqual(st.record, rate(rows, r => r.grading.details.recordAccuracy === 1));
}
for (const x of s.contrasts) {
  const rows = runs.find(r => r.policy === x.policy).report.rows, ref = runs.find(r => r.policy === 'sim-111').report.rows;
  assert.deepEqual(x.scoreDifference, bootstrap(groups(rows.map((r, i) => r.score - ref[i].score)), gs => mean(gs.flat())));
}
for (const [path, digest] of Object.entries(p.files)) assert.equal(hash(await readFile(path)), digest);
assert.equal(hash(await readFile('paper/data/runs.generated.json')), p.run_hash);
const generated = ['paper/meta.json', ...(await readdir('paper/generated')).map(x => `paper/generated/${x}`), ...(await readdir('paper/figures')).map(x => `paper/figures/${x}`)];
const before = await Promise.all(generated.map(x => readFile(x))); execFileSync('node', ['paper/scripts/render.mjs']);
for (const [i, path] of generated.entries()) assert.equal(hash(await readFile(path)), hash(before[i]));
const meta = await read('paper/meta.json'); assert.ok(meta.abstract.length <= 1920 && /^[\x00-\x7f]*$/.test(meta.abstract));
const info = execFileSync('pdfinfo', [`paper/${meta.artifact_name}`], { encoding: 'utf8' }), pages = Number(info.match(/Pages:\s+(\d+)/)[1]); assert.ok(pages >= 8);
const text = execFileSync('pdftotext', [`paper/${meta.artifact_name}`, '-'], { encoding: 'utf8' }); assert.ok(!text.includes('—') && !text.includes('[?]'));
assert.ok(!/Overfull|undefined references|undefined citations/.test(await readFile('paper/paper.log', 'utf8')));
await writeFile('paper/data/verification.generated.json', JSON.stringify({ replayed, semanticRepeats: repeats.length, generatedFilesStable: generated.length, pages, pdfSha256: hash(await readFile(`paper/${meta.artifact_name}`)), checks: 'PASS' }, null, 2) + '\n');
console.log(`PASS: ${replayed} replayed scores, ${repeats.length} semantic repeats, ${pages} PDF pages, stable generated outputs`);
