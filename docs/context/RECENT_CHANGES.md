# Recent Changes

Latest relevant changes at the 2026-07-07 context refresh. Keep this list to 10–15 entries and replace the oldest entries incrementally.

| Commit | Date | Change | Primary context impact |
| --- | --- | --- | --- |
| Working tree | 2026-07-07 | Add internal-order document preview/print route and resolve Codespaces public URL access | New document preview components/route; public web access works on port `3001` after port `3000` tunnel returned `502`; API remains public on `4000` |
| Working tree | 2026-07-07 | Add item image upload and automatic WebP compression for create/edit forms | Client resize/quality pipeline, compressed preview/metadata, Next upload route, local image storage, tests |
| `2a3c6f9` | 2026-07-04 | Fix inventory item synchronization and settings | Item/store-item service, repository, forms, providers, workflow docs |
| `5e780df` | 2026-07-04 | Redesign login page | Login UI plus activity-related API/model/repository work |
| `f4a5dab` | 2026-07-04 | Add activity tracking and refresh login | Partial activity/XP/KPI infrastructure and login visuals |
| `e916c9d` | 2026-07-03 | Refine login storefront layout | Login components, shell, and global styles |
| `d2d3c86` | 2026-07-03 | Fix market page layout | Broad protected-page and shared UI layout refinement |
| `953357f` | 2026-07-03 | Update project | Request market/cart layout and component tests |
| `eb25d41` | 2026-07-03 | Improve inventory item and stock workflows | Items, movement, request, count, repository rules, and tests |
| `e9648a0` | 2026-07-03 | Fix market page layout | Item images, settings/balance/request UI, API filters, docs |
| `ee90fae` | 2026-07-02 | Add inventory request system | Initial end-to-end API/web inventory request MVP and architecture doc |
| `b5b3f04` | 2026-07-02 | Proxy browser authentication through Next.js | Same-origin auth/API proxy behavior |
| `5501df7` | 2026-07-02 | Configure Google Sheets authentication credentials | Sheets client configuration; never inspect or copy credential values |
| `5122dd1` | 2026-07-02 | Complete local login setup and app configuration | Initial local authentication and app wiring |

For detail, use targeted commands such as `git show --stat <commit> -- <feature-paths>` or `git diff <base>...HEAD -- <mapped-files>`; do not replay full repository history.

## Operational report: Codespaces public URL access

- Symptom: `https://improved-lamp-4jwgx9pjp69fpx5-3000.app.github.dev` returned `HTTP 502` even though local `curl -I http://127.0.0.1:3000` reached Next.js and redirected to `/login`.
- Cause observed: the Codespaces tunnel for forwarded port `3000` did not reach the running Next.js process; API tunnel on port `4000` was healthy and returned the expected unauthenticated `401`.
- Fix applied: created/forwarded port `3001`, set it to `public`, restarted Next.js with `-H 0.0.0.0 -p 3001`, and set `NEXT_PUBLIC_API_BASE_URL=https://improved-lamp-4jwgx9pjp69fpx5-4000.app.github.dev/api/v1`.
- Verified: `https://improved-lamp-4jwgx9pjp69fpx5-3001.app.github.dev/login` returned `HTTP 200`; `https://improved-lamp-4jwgx9pjp69fpx5-4000.app.github.dev/api/v1/auth/me` returned expected `HTTP 401` without a session.
- Follow-up: created user skill `$codespaces-public-url` at `/home/codespace/.codex/skills/codespaces-public-url` for this troubleshooting workflow.
- Limitation: port visibility can persist, but dev server processes still need to be restarted after a Codespace restart.
