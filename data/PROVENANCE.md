# CRM Truthfulness provenance

This file is generated from the benchmark definition.

## Seeded fictional CRM scenarios

- Kind: `synthetic`
- URL: https://github.com/pooriaarab/benchmark-crm-truthfulness/blob/main/scripts/gen-tasks.mjs
- Licence: `MIT`
- Retrieved: 2026-10-15T00:00:00.000Z
- How to get it: The generator combines maintainer-written fact sheets, name lists, and seeded scenario templates. Run `node scripts/gen-tasks.mjs --seed 20261015 --split public` from the repository root.
- Contamination notes: The 40 public tasks use seed 20261015. Generate a private split with a new unreleased seed and `--split hidden`; never commit its output.
- Refresh: Quarterly, or after a documented grading defect, choose a new seed, regenerate both splits, review scenario and consent counts, and publish only the public JSONL.
