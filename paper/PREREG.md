# CRM truthfulness study plan

Written before collection. Source: 9f547ee9f9ffa208958cd7e03a229fd1c1b88576, package 0.1.0.
The accepted honesty pilot supplies only build and statistics code. Its results are not CRM observations.
The source, public tasks, grader, and existing controls were inspected. No study outcomes were collected.
Git records this plan before results. There is no independent registry deposit; publication is not authorized.

## Questions and fixed conditions
H1: The packaged good control attains full credit; empty, constant, echo, refusal, and first-tool policies do not.
H2: Removing consent protection from a simulated compliant policy increases forbidden-contact violations.
H3: Removing claim support from a simulated compliant policy reduces scores on send-required tasks.
H4: Removing record maintenance reduces scores without changing consent violations.
H5: Removing lookup alone leaves replay scores unchanged. This is a planned null and a test of process coverage.
Run packaged-good, packaged-bad, empty, constant, echo, refuse, first-tool, and no-lookup.
Run a simulated factorial ablation with all eight combinations of consent, evidence, and record controls enabled or disabled.
For consent disabled, send even when the target has not opted in. For evidence disabled, use the packaged bad draft.
For records disabled, omit update_record and log_note. All other actions come from the packaged good policy.
These policies receive task metadata; they are privileged fixtures, not learned agents or deployable controllers.

## Sample and measurements
Use every public task once per condition and repeat the whole grid once. Repeats do not enlarge the sample.
Use the package run function, mockAdapter for scripts, seed 1, concurrency 1, retries 0, maxTurns 12, maxToolCalls 12, budgetUsd 0.
Primary outcomes: mean native score, full-credit episode rate, and any-consent-violation episode rate.
Secondary: any claim defect (unsupported, undeclared, forbidden-pattern, or missing ledger), exact record completion, and outcome counts.
Report claim defects on send-required tasks and consent violations on no-send tasks, with their denominators.
Use Wilson 95% intervals for rates. Use 2000 seeded bootstrap draws for score means and paired score differences.
Bootstrap by resampling tasks within each scenario, retaining task alignment for contrasts with the full-control condition.
Intervals describe hypothetical task sampling within the fixed templates. They do not estimate learned-model variability.
No significance tests, model rankings, or human comparison. Boundary bootstrap collapse is disclosed.
Figures: scenario coverage, control scores with intervals, and simulated factorial component outcomes.

## Failures, exclusions, stopping, and release
Expected failure modes: missing tool actions, bad ledgers, forbidden sends, omitted records, replay mismatch, and accidental fabricated scores.
Empty and refused responses stay in the data. Tool errors stay in traces. Infrastructure exceptions stop the run rather than becoming scores.
Exclude no task based on its result. Stop after all fixed conditions and semantic repeats complete.
Recompute scores from stored traces during verification. Check result-to-table agreement and source hashes.
No network inference, paid provider, or credential use. Free hosted model availability is not probed; learned-model results are outside this study.
Release fictional traces, summaries, scripts, and provenance. Do not release hidden tasks or secrets.
Any design change must be recorded here before the affected run. Report null results without adding outcome-driven conditions.
