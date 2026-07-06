# Repository routing guide

1. Read `docs/context/CURRENT_STATE.md` first, then use `docs/context/FEATURE_MAP.md` to locate the requested flow. Treat `docs/inventory-mvp.md` as the architecture source of truth; use `docs/context/DECISIONS.md` and `docs/context/RECENT_CHANGES.md` only when relevant.
2. Do not scan the repository at task start. Before reading source, state the feature and at most five expected files. Read only the route/page, component or hook, API route, service, and repository in that flow.
3. If the feature is absent from `FEATURE_MAP.md`, use targeted `rg` by route, endpoint, symbol, or import. Use `context_explorer` only if that fails.
4. Never read secrets (`.env*`, service-account JSON, keys), generated/build output (`node_modules`, `.next`, `.turbo`, `dist`, `build`, `out`, `coverage`), image binaries, or an entire lockfile.
5. Do not change business logic, Google Sheets schema, or dependencies unless the task explicitly authorizes it.

## Verification

Choose only checks that cover changed scope: web changes use `pnpm --filter @inventory/web typecheck` and targeted Vitest; API changes use `pnpm --filter @inventory/api typecheck` and targeted Vitest. Run broader tests only for cross-cutting changes. Do not run write-capable Sheets scripts without explicit authorization.

## Context maintenance

Update `docs/context/FEATURE_MAP.md` when routes or flow ownership move; `CURRENT_STATE.md` when capability/status/limitations change; `DECISIONS.md` for durable architecture or schema decisions; and `RECENT_CHANGES.md` after a major feature, refactor, schema, or architecture change. Use `$refresh-project-context` and keep updates incremental.
