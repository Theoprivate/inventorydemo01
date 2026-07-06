# Web routing guide

- Inherit the root guide. Start from the frontend path in `docs/context/FEATURE_MAP.md`.
- Limit the initial read to the App Router page plus directly imported feature components/helpers and `apps/web/lib/api.ts`; include `apps/web/lib/types.ts` only when the contract matters.
- Trace API calls by endpoint string into `apps/api/src/app.ts`; do not browse unrelated pages or shared UI.
- Relevant verification: `pnpm --filter @inventory/web typecheck` and `pnpm --filter @inventory/web test -- <target-test>` when a focused test exists. Use the full web test suite only for shared components/helpers.
- Do not inspect `.next`, `node_modules`, public image binaries, environment files, or lockfiles.
