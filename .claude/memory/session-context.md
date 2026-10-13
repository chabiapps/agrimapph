---
name: session-context
description: Current work-in-progress and focus for the active session
metadata:
  type: project
---

**Working on:** Desktop redesign of all four pages — final state committed at `485d164` (details in `.claude/session-log.md`, 2026-09-25 entry).
**Current tab being modified:** All four — Mapa, Listahan, Buod/Dashboard, Mag-ulat. They share one three-column shell; mobile (bottom nav + sheets) is intentionally unchanged.
**Last completed:** Mag-ulat numbered-step form, submit button moved into the form, live "Progreso ng Ulat" card in the right rail, and URL-based routing so a refresh keeps the current page.
Outdated: see database-schema.md (2026-10-13). Reads now go through views.
**Next up:** Photo upload for reports (`agri_reports` still has no image column — the pin detail already renders the photo, `1/3` counter and prev/next once one exists). Then: clear the pre-existing `LocationProfile.tsx` `tsc` errors, and delete the stray `src/pages/Index.tsx.bak` / backtick-named `` src/pages/Index.tsx` `` files.

**Active caveats:**
- The desktop/mobile split is by layout shell (`DesktopLayout` vs bottom nav/sheets), not per-component — new desktop styling is `md:`-gated so mobile stays pixel-identical.
- `?e2e_stub_auth=1` (dev-only, `import.meta.env.DEV`-guarded) bypasses the auth gate for Playwright smoke tests of Mag-ulat.
- Production hosting needs an SPA fallback (serve `index.html` for unknown paths) or typed URLs will 404.
