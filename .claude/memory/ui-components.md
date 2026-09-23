---
name: ui-components
description: Inventory of key UI components in AgriMap PH
metadata:
  type: project
---

**Main Pages/Tabs:**
- `Index.tsx`: Main entry point handling tab switching (Map, List, Dashboard, Report).
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
- Right sidebar (~340px, own scroll region): contextual panels — Mapa (`MapRightPanel`: overview stats, top commodities, region counts, latest reports), Mag-ulat (`ReportRightPanel`: reminders, live progress, encouragement).
- Used by Mapa, Listahan, and Mag-ulat. New pages should reuse `DesktopLayout` rather than copying shell JSX.

**Numbered-step-card form pattern** (Mag-ulat `ReportFormPage.tsx` — `StepHeading` + `StepCard`, all styles `md:`-gated):
- Circular green numbered badge + heading + instructional subtext, then fields grouped in a bordered card. Steps 1–6 mirror the sidebar progress card.

**Pin-detail modal pattern** (`PinPopup.tsx`):
- Two-column contained panel: details/contact left, photo + "Karagdagang Impormasyon" right. Must stay within the main content column, never viewport-wide. Photo box fixed ~200px (`object-cover`); no `image_url` column exists yet so photo area shows a placeholder.

**Compact stat-card pattern** (Buod, Listahan `ListStats.tsx`, Mapa right rail):
- Icon tile, label, big number, %-of-total, small inline SVG sparkline. Clicking filters Listahan in place.

**Status badges (consistent everywhere):**
- Sobra (surplus) = green, Kulang (deficit) = red, Sapat (balanced) = yellow. Filipino labels always; never English Deficit/Surplus/Balanced.
