# Project Memory: AgriMap PH

## Core Objective
A responsive PWA for agricultural supply and demand intelligence in the Philippines.

## Key Technical Stack
- **Frontend**: React, Tailwind CSS, Lucide React, shadcn/ui.
- **Mapping**: Leaflet.js with OpenStreetMap.
- **Backend**: Supabase (PostgreSQL + Auth).
- **State**: React hooks, Supabase client.

## Feature State
- **Navigation**: Responsive dual-nav (Sidebar for desktop, BottomNav for mobile).
- **Mapa (Map)**: 
    - Toggle between "Ngayon" (current supply) and "Paparating" (planting intention).
    - Interactive pins with responsive detail panels (Sheet/Drawer).
    - Map filtering system.
- **Listahan (Table)**: 
    - Data table with sorting and filtering.
    - Desktop: Left sidebar filter panel (updated with compact pill-style filters and reset functionality).
    - CSV export.
- **Dashboard**: 
    - Summary stat cards with colored left borders.
    - Price gap analysis with muted colors for readability.
    - Price trend charts.
    - "Pinaka-aktibong Produkto" bar chart with interactive commodity detail panels (fetched from Supabase).
- **Mag-ulat (Report)**: 
    - Auth-gated submission form.
    - Onboarding flow for new users.

## Design Language
- **Palette**: Friendly greens (`#22c55e`, `#16a34a`), warm gray backgrounds (`#f9fafb`).
- **Feel**: "Lighter, cleaner, less intimidating" for older farmers.
- **Typography**: Base font 15px, bold headings, muted secondary text.
- **UI Patterns**: Responsive side panels (Sheets) and bottom sheets (Drawers).

## Recent Fixes & Improvements
- Fixed JSX syntax errors and unterminated regex literals.
- Resolved `DialogTitle` accessibility warnings.
- Fixed breadcrumb `[object Object]` rendering in `DesktopHeader`.
- Implemented responsive layout breakpoints (768px).
- Redesigned desktop colors for a softer, more accessible look.
- Fixed sidebar layout instability: Enforced fixed width of 220px on desktop to prevent shifting during tab navigation.

## What's Next
- General polishing of the PWA experience (UI/UX refinements).
- Enhancing data visualization on the Dashboard.
- Testing end-to-end reporting flow.
