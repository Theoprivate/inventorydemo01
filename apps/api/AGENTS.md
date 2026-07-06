# API routing guide

- Inherit the root guide. Start from the backend endpoint in `docs/context/FEATURE_MAP.md`.
- Trace only `apps/api/src/app.ts` route → matching `InventoryService` method → `InventoryRepository` contract → Google Sheets repository method. Read models/mappers/rules only when that flow uses them.
- Treat `Stock_Movements` as the inventory source of truth and `Stock_Balances` as its projection. Preserve role and branch checks.
- Relevant verification: `pnpm --filter @inventory/api typecheck` and `pnpm --filter @inventory/api test -- <target-test>`. Sheets check scripts require configured external credentials; keep them read-only and run only when the task concerns integration/schema.
- Never inspect environment files, service-account JSON, generated output, `node_modules`, or lockfiles; never change sheet headers/schema or dependencies without explicit authorization.
