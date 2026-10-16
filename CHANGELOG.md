# Changelog

## Unreleased

- Added `run --tasks <path>` to the CLI, a `tasksPath` option to the SDK `run()`, and the same option on the API (`?tasks=` on `GET /v1/tasks` and `GET /v1/tasks/:id`, a `tasksPath` field on `POST /v1/score`) and the MCP tools. The API and MCP restrict the path to `.jsonl` files inside the installed package. A generated hidden split now runs end to end.
- Added `benchmarkWithTasks(tasksPath)` and `resolvePackageTasksPath(value)` exports.
