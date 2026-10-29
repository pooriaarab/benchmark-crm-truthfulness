# CRM truthfulness paper

This packet studies consent, product evidence, and record completion. It adds a simulated factorial control ablation.
The paper has no learned-model scores or human-study results. The scripts use privileged task metadata.

Run from the repository root with Node 20+, npm, Python 3, Tectonic, and Poppler on PATH:

```sh
npm ci
sh paper/template/reproduce.sh
```

Output: `paper/crm-truthfulness-paper.pdf`. The PDF stays local and untracked.
The unchanged pilot template downloads the official NeurIPS style and verifies its pinned archive hash.
Experiments use no network, credentials, or paid inference. The build can download TeX dependencies.
`config.json` freezes the benchmark commit. `PREREG.md` precedes results in Git history.
This is not an external registry deposit. No venue publication or merge is authorized.

`data/runs.generated.json` and `data/repeat.generated.json` contain fictional action traces and replayed grades.
`data/summary.generated.json` contains all reported rates, intervals, and paired contrasts.
`data/provenance.generated.json` identifies frozen inputs and their hashes.
`data/verification.generated.json` records full trace regrading, semantic repeat checks, generated-output stability, and PDF page count.
The verifier rerenders tables from data and checks that they remain identical.
Scenario-stratified intervals describe hypothetical tasks within fixed templates. Repeats add no sample size.
Boundary bootstrap intervals can collapse. Wilson component intervals remain visible.

The template is copied unchanged from the accepted honesty pilot PR 24. CRM prose and experiments are new.
House reference: benchmark-family-paper, its suite census and CRM grader discussion. Historical family scores are not reused.
Paper text and generated figures: CC-BY-4.0. Benchmark code and fictional tasks: MIT.
