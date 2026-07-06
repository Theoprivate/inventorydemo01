# Current State

- Updated: 2026-07-06
- Verified commit: `2a3c6f9b606cf42b4640a07b8e12e510bd45b7e4`
- Architecture baseline: `docs/inventory-mvp.md`
- Evidence: current routes/imports, `InventoryService`, repository contract/adapter, sheet header definitions, and targeted Git history through the commit above.

## Working now

- Next.js App Router web app and Fastify API are connected through `/api/v1`; authentication uses a JWT in an httpOnly cookie.
- Login/logout/session lookup are implemented, with role and branch enforcement in the API.
- Item master supports list, create, edit, active state, category/unit, description, and image URL/path.
- Store Items supports per-branch enablement, min/target quantities, default location, request permission, and daily-count flag.
- Locations support list, create, and edit for the configured location types.
- Stock balances are shown by branch/location/item and are maintained as a projection.
- Manual stock movement supports RECEIVE, ISSUE, TRANSFER, WASTE, RETURN, and ADJUSTMENT, including negative-stock rules.
- Staff can browse requestable items and create an idempotent stock request.
- Request list/detail, cancel, approve, reject, issue, partial issue, and quick issue are implemented.
- Issuing a request creates TRANSFER movements and updates balances and request status.
- Stock count supports DRAFT and COMPLETED; completion creates ADJUSTMENT movements for variances.
- Owner-only balance rebuild exists in the API.
- Google Sheets access is isolated behind `InventoryRepository`; master tabs use a 45-second in-memory cache invalidated after writes.
- Focused unit/integration tests exist for API routes, rules, repository behavior, mappers, sheet utilities, web workflow helpers, and feature components.

## Partial or not exposed end-to-end

- User activity/XP/KPI types, sheet headers, repository methods, and service code exist, but no activity routes are registered in the current `apps/api/src/app.ts`; treat this capability as partial.
- The web stock-count page creates counts but does not expose the API count list/detail as a history/detail workflow.
- Item images support local paths and HTTPS URLs with fallback, but there is no upload pipeline.
- Dashboard reports pending requests, low stock, and daily-count totals; it does not create replenishment orders automatically.
- The architecture document describes 12 inventory tabs, while `apps/api/src/models.ts` currently declares 16 tabs after adding four activity/XP/KPI tabs. This documentation/schema expectation drift must be reconciled before relying on a full schema check.

## Known issues and technical limitations

- Google Sheets has no transaction boundary; multi-range inventory writes can still expose partial-write or concurrency risk.
- Concurrent editors can cause lost updates despite fresh reads, batch updates, duplicate movement checks, and idempotency handling.
- Legacy plaintext passwords remain supported; full Argon2id migration is incomplete.
- Process restart clears the in-memory cache.
- Balance correctness depends on movement writes and projection updates staying synchronized; rebuild is restricted to owner.
- External Sheets verification requires configured credentials and access to the live spreadsheet; local unit tests do not prove live schema/data correctness.

## Current priorities

No explicit roadmap file exists. Based on current implementation gaps, prioritize:

1. Reconcile the 12-tab architecture documentation with the 16-tab header set and complete or remove the partial activity surface deliberately.
2. Protect movement/balance/request writes against concurrency and partial failures; preserve idempotency.
3. Migrate remaining plaintext passwords to Argon2id.
4. Add stock-count history/detail UX if operational review is required.
5. Keep item/store-item synchronization and invalidation covered by focused tests.
