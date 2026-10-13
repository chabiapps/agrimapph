---
name: ui-components
description: Inventory of key UI components in AgriMap PH
metadata:
  type: project
---

**Main Pages/Tabs:**
- `Index.tsx`: Main entry point; the active tab is derived from the URL (see **Routing** below) and renders Mapa / Listahan / Buod / Mag-ulat.
- `Dashboard.tsx`: Analytics view with price gaps and trends.
- `ReportFormPage.tsx`: Data submission form.

**Feature Components:**
- `AgriMap.tsx`: Leaflet map integration.
- `LocationProfile.tsx`: Detailed view for a specific location (Stats, Products, Planting Intentions, Reporters).
- `ReportsTable.tsx`: Data table for listing reports.
- `FilterBar.tsx`: Global filtering for reports.

**UI Primitives (shadcn/ui):**
- `Drawer`, `Sheet`, `Badge`, `Button`, `Input`, `Card`, etc.

## Established Shared Patterns (2026-09-22 redesign)

**Three-column layout shell** (`DesktopLayout.tsx` + `MapSidebar.tsx`, desktop only; mobile keeps bottom nav + bottom sheets unchanged):
- Left sidebar (~240px): logo + tagline, vertical nav (Mapa/Listahan/Mag-ulat), Food Categories quick-filters, footer tagline.
- Main content column: header/filter bar + page body.
- Right sidebar (~340px, own scroll region): contextual panels — Mapa (`MapRightPanel`: "Pangkalahatang Kalagayan" stat cards, "Pinakamaraming Report sa Bawat Rehiyon", "Latest Reports"), Mag-ulat (`ReportRightPanel`: "Mga Paalala" reminders, "Progreso ng Ulat" live progress, encouragement banner).
- Used by Mapa, Listahan, and Mag-ulat. New pages should reuse `DesktopLayout` rather than copying shell JSX.

**Routing** (`src/lib/routes.ts`): page state comes from the URL, never `useState` — `/mapa`, `/listahan`, `/buod` (+ `/dashboard` alias), `/mag-ulat`, with `/`, `/map`, `/list` accepted as aliases and unknown paths → `NotFound`. Nav in `MapSidebar`/`TopNav`/`BottomNav` uses `<Link>`; Listahan filters mirror into query params (`?q=&category=&commodity=&status=&mode=&ltype=`) so a refresh keeps both the page and its filters.

**Numbered-step-card form pattern** (Mag-ulat `ReportFormPage.tsx` — `StepHeading` + `StepCard`, all styles `md:`-gated):
- Circular green numbered badge + heading + instructional subtext, then fields grouped in a bordered card. Steps 1–6 mirror the sidebar progress card.

**Pin-detail modal pattern** (`PinPopup.tsx`, desktop):
- Contained Radix `Dialog` centred over the map: content `z-[1100]`, semi-transparent `bg-black/50` backdrop at `z-[1090]` — deliberately above Leaflet's panes (`z-index: 1000`) and the header/filter bar. Bounded (`w-[min(920px,92vw)]`, `max-h-[90vh]`) with its own × in a sticky header.
- Two-column body (`md:grid-cols-2`): details/contact left, photo + "Karagdagang Impormasyon" right. Photo box is a fixed `h-[200px]` with `object-cover` (not `aspect-[4/3]`, which pushed the info rows out of view); no `image_url` column exists yet so the photo area shows a placeholder.
- Mobile keeps the bottom `Sheet` branch — the two share the same body markup.

**Compact stat-card pattern** (Buod, Listahan `ListStats.tsx`, Mapa right rail):
- Icon tile, label, big number, %-of-total, small inline SVG sparkline. Clicking filters Listahan in place.

**Status badges (consistent everywhere):**
- Sobra (surplus) = green, Kulang (deficit) = red, Sapat (balanced) = yellow. Filipino labels always; never English Deficit/Surplus/Balanced.
