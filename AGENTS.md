# Working on benchmark-crm-truthfulness

## Commands

- Install with `npm ci`.
- Run the full gate with `npm run ci:local`.
- Generate the public split with `node scripts/gen-tasks.mjs --seed 20261015 --split public`.
- Generate provenance after building with `npm run provenance`.
- Add no unit tests. Extend `scripts/e2e.mjs` through a public surface.

## Contracts

Keep 40 episodes balanced across the eight scenarios. Keep task metadata, deterministic replay grading, mock policies, and provenance in sync. Record grading failure modes in `docs/grading.md` before implementation. Grade episode traces by replaying their tool log; never trust a submitted final state.

Never commit `data/tasks.hidden.jsonl` or its evaluation seed. Never read provider keys from repository files. OpenRouter uses `OPENROUTER_API_KEY`. OpenAI-compatible providers use `OPENAI_BASE_URL` and `OPENAI_API_KEY`.

Open an issue before a branch. Use `bcrm-<issue>-<slug>` and `[bcrm-<issue>] Imperative subject`. Keep pull requests below 500 counted lines. Do not merge your own pull request or push `release`.
