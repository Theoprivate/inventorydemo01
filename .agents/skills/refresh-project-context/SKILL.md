---
name: refresh-project-context
description: Incrementally refresh this repository's Codex context after a major feature, refactor, Google Sheets schema change, route ownership change, or architecture change. Use Git diff and changed files as the primary evidence; do not rescan the whole repository.
---

# Refresh project context

Update repository context from the smallest reliable evidence set. Do not modify source code, business logic, dependencies, or the live Google Sheets schema.

## Workflow

1. Read `AGENTS.md`, `docs/context/CURRENT_STATE.md`, `docs/context/FEATURE_MAP.md`, and the relevant section of `docs/inventory-mvp.md`.
2. Establish the range with `git status --short`, `git diff --name-only`, and the relevant base/HEAD hashes. If changes are committed, use targeted `git log`/`git show --stat` for those commits.
3. Group changed files by feature using `FEATURE_MAP.md`. Ignore unrelated changes.
4. Read the Git diff first. Read only changed files and minimal imports/callers needed to confirm the route → service → repository flow. Do not rescan the repository.
5. Before any extra source read, state the feature and at most five candidate files. Search by exact route, endpoint, symbol, import, or sheet tab when the map is insufficient.
6. Update only the context files affected:
   - `CURRENT_STATE.md`: capability status, limitations, priorities, refresh date, and verified commit; keep near 150 lines or fewer.
   - `FEATURE_MAP.md`: real paths, endpoints, ownership, tabs, and implemented/partial/missing status.
   - `DECISIONS.md`: durable decisions or explicitly unresolved architecture gaps; do not turn implementation details into decisions.
   - `RECENT_CHANGES.md`: add concise feature-level entries and retain only the latest 10–15.
7. Update `docs/inventory-mvp.md` only when the canonical architecture/schema actually changed and the task authorizes that update. Otherwise record verified drift in context docs.
8. Verify every newly referenced repository path exists. Validate Markdown tables and keep claims tied to diff/source evidence.
9. Show a documentation-only diff and report the evidence range used.

## Guardrails

- Never read `.env*`, service-account JSON, private keys, tokens, or credential values.
- Never read `node_modules`, `.next`, `.turbo`, build output, image binaries, or an entire lockfile.
- Never infer a file, route, endpoint, service, repository method, or sheet tab. Mark it `missing`, `partial`, or `unverified` when evidence is absent.
- Do not run write-capable Sheets scripts. Do not commit or push.
