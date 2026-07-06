# Architecture Decisions

This is a compact index of durable decisions already reflected in code or `docs/inventory-mvp.md`; it is not a speculative roadmap.

## D-001 — Google Sheets behind a repository boundary

- Status: active
- Decision: Routes depend on `InventoryService`, which depends on `InventoryRepository`; `GoogleSheetsInventoryRepository` is the current adapter.
- Consequence: A database adapter can replace Sheets without changing route contracts, but adapter/schema behavior needs dedicated tests.

## D-002 — Movements are source of truth; balances are projection

- Status: active
- Decision: Persist inventory events in `Stock_Movements` and update `Stock_Balances` as the query projection. Owner can rebuild the projection.
- Consequence: Every movement-producing flow must keep event and projection updates aligned; Sheets cannot make that atomic.

## D-003 — Authentication uses an httpOnly JWT cookie

- Status: active
- Decision: The API signs the session and stores it in an httpOnly cookie; the web app uses credentialed requests and a same-origin `/api/v1` proxy by default.
- Consequence: API role/branch checks remain the security boundary; menu visibility is not authorization.

## D-004 — Inventory writes are service-owned

- Status: active
- Decision: Validation, role/branch rules, request status transitions, negative-stock checks, and movement/balance orchestration live in `InventoryService` and stock rules, not pages or repository methods.
- Consequence: UI may guide users, but the API must revalidate every operation.

## D-005 — Cache only master data

- Status: active
- Decision: Cache `Branches`, `Categories`, `Items`, `Store_Items`, and `Locations` in process for 45 seconds and invalidate affected tabs after writes.
- Consequence: Transactional inventory reads can request fresh data; process restart clears cache.

## D-006 — Preserve existing sheet headers through mappers

- Status: active
- Decision: Keep spreadsheet headers such as `Item_ID`; map rows to camelCase domain models in the API.
- Consequence: Header changes are schema changes and require explicit migration, model/mapper/repository updates, verification, and context refresh.

## D-007 — Requests use idempotency and explicit status transitions

- Status: active
- Decision: Accept an optional UUID idempotency key for request creation and move requests through PENDING/APPROVED/PARTIAL/COMPLETED or terminal REJECTED/CANCELLED states.
- Consequence: Retry behavior and transition guards must be preserved in refactors.

## D-008 — Context is routed, not reconstructed per task

- Status: active as of 2026-07-06
- Decision: Start with `CURRENT_STATE.md`, route through `FEATURE_MAP.md`, and inspect no more than five initial source candidates. Use targeted search and incremental refresh.
- Consequence: Context documents must be updated when a major feature, route ownership, schema, or architecture decision changes.

## Open decision gap

`docs/inventory-mvp.md` documents 12 inventory tabs, while current model headers include four additional activity/XP/KPI tabs. The repository does not establish whether this partial surface is production architecture or unfinished work; resolve that explicitly before updating the canonical tab count.
