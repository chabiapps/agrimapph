# Project Overview: AgriMap PH

## Description
AgriMap PH is a responsive Progressive Web App (PWA) designed for agricultural supply and demand intelligence in the Philippines. It provides farmers, LGU officials, and traders with real-time visibility into crop surpluses and deficits across different regions, municipalities, and barangays.

## Core Features

### 1. Mapa (Interactive Map)
- **Visual Intelligence**: Uses Leaflet.js to plot reports of agricultural supply.
- **Supply vs. Intention**: Toggle between current supply ("Ngayon") and future planting intentions ("Paparating").
- **Detail View**: Clicking a pin opens a responsive detail panel (Right-side Sheet on desktop, Bottom-sheet Drawer on mobile).
- **Filtering**: Advanced map filters to narrow down commodities and status.

### 2. Listahan (Detailed Table)
- **Comprehensive View**: A sortable table of all agricultural reports.
- **Desktop Filtering**: A dedicated left-sidebar filter panel featuring:
    - Search bar.
    - Commodity dropdown.
    - Compact pill-style status filters (Surplus/Deficit/Balanced).
    - One-click "I-reset" functionality.
- **Data Export**: Ability to export filtered lists to CSV.

### 3. Dashboard (Intelligence Hub)
- **Summary Stats**: Top-level counts of total reports, surplus/deficit areas, and active reporters.
- **Price Gap Analysis**: Identifies commodities with the largest price differences between surplus and deficit areas.
- **Price Trends**: Line charts showing price movements over time for selected commodities.
- **Commodity Activity**: A vertical bar chart of the most reported products.
    - **Interactivity**: Clicking a bar opens a detail panel listing all reports for that specific commodity.

### 4. Mag-ulat (Reporting Form)
- **Data Entry**: A standardized form for reporting crop status, price, and volume.
- **Auth Flow**: Protected by an authentication gate; new users are routed through an onboarding flow to set up their profile.

## Technical Architecture
- **Frontend**: React, Tailwind CSS, Lucide React, shadcn/ui.
- **Backend**: Supabase (PostgreSQL for data, Supabase Auth for identity).
- **Responsive Strategy**: Custom `useIsMobile` hook to switch between a fixed-width 220px `Sidebar` (desktop) and `BottomNav` (mobile), ensuring a stable layout without shifting during navigation.
- **Bilingual Support**: Integrated English/Filipino translation system.

## Design Philosophy
- **Accessibility**: Specifically designed for older Filipino farmers.
- **Visuals**: Light, clean, and non-intimidating. Uses a friendly green palette (`#22c55e`) and light warm gray backgrounds (`#f9fafb`) to reduce cognitive load.
- **UI Consistency**: Heavy use of responsive side-panels (Sheets) and drawers to maintain a native app feel on all devices.
