# Current State

- Updated: 2026-07-07
- Verified commit: `713ce1bb9c759fe697d673e3a6345f25da7553d8` plus the current item-upload working tree
- Architecture baseline: `docs/inventory-mvp.md`
- Evidence: current routes/imports, `InventoryService`, repository contract/adapter, sheet header definitions, and targeted Git history through the commit above.

## Working now

- Next.js App Router web app and Fastify API are connected through `/api/v1`; authentication uses a JWT in an httpOnly cookie.
- Login/logout/session lookup are implemented, with role and branch enforcement in the API.
- Item master supports list, create, edit, active state, category/unit, description, image URL/path, and WebP/PNG/JPG selection from both create and edit forms; the browser resizes to at most 800 × 600, compresses to WebP at or below 500 KB, then uploads.
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
- Dashboard reports pending requests, low stock, and daily-count totals; it does not create replenishment orders automatically.
- The architecture document describes 12 inventory tabs, while `apps/api/src/models.ts` currently declares 16 tabs after adding four activity/XP/KPI tabs. This documentation/schema expectation drift must be reconciled before relying on a full schema check.

## Known issues and technical limitations

- Google Sheets has no transaction boundary; multi-range inventory writes can still expose partial-write or concurrency risk.
- Concurrent editors can cause lost updates despite fresh reads, batch updates, duplicate movement checks, and idempotency handling.
- Legacy plaintext passwords remain supported; full Argon2id migration is incomplete.
- Process restart clears the in-memory cache.
- Balance correctness depends on movement writes and projection updates staying synchronized; rebuild is restricted to owner.
- External Sheets verification requires configured credentials and access to the live spreadsheet; local unit tests do not prove live schema/data correctness.
- Uploaded item images are stored on the web process filesystem under `apps/web/public/images/items/`; persistence therefore depends on the deployment filesystem. Clearing or replacing an image does not delete the old file in this phase.
- Codespaces public web access currently uses port `3001`; port `3000` returned a tunnel-level `502` even while local Next.js responded. Start the web dev server with `-H 0.0.0.0 -p 3001` and set `NEXT_PUBLIC_API_BASE_URL` to the public API URL on port `4000` when exposing the app externally.

## Current priorities

No explicit roadmap file exists. Based on current implementation gaps, prioritize:

1. Reconcile the 12-tab architecture documentation with the 16-tab header set and complete or remove the partial activity surface deliberately.
2. Protect movement/balance/request writes against concurrency and partial failures; preserve idempotency.
3. Migrate remaining plaintext passwords to Argon2id.
4. Add stock-count history/detail UX if operational review is required.
5. Keep item/store-item synchronization and invalidation covered by focused tests.
