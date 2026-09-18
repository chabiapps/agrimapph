# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build & Run
- `npm run dev`: Start the development server
- `npm run build`: Build for production
- `npm run preview`: Preview the production build locally

### Quality & Testing
- `npm run lint`: Run ESLint for code quality checks
- `npm run test`: Run all tests via Vitest
- `npm run test:watch`: Run tests in watch mode
- `npx vitest run <path-to-test>`: Run a specific test file (e.g., `npx vitest run src/test/example.test.ts`)

## Architecture & Structure

### High-Level Architecture
AgriMap PH is a mobile-first PWA built with **React**, **Vite**, and **TypeScript**, using **Supabase** as the backend (PostgreSQL + Auth). It leverages **Leaflet.js** for agricultural supply/demand mapping and **shadcn/ui** for the interface.

### Project Structure
- `src/pages/`: Main application views (e.g., `Index.tsx` for Map/Table views, `ReportFormPage.tsx` for submissions).
- `src/components/`: 
    - `/ui`: Low-level primitive components (shadcn/ui).
    - Top-level: Feature-specific components like `AgriMap.tsx` (Leaflet integration) and `ReportFormDialog.tsx`.
- `src/lib/`: Core business logic and utilities:
    - `i18n.tsx`: Bilingual support (English/Filipino).
    - `db.ts` & `supabaseClient.ts`: Database access layers.
    - `profile.ts` & `locationProfile.ts`: User and location data models.
- `src/integrations/supabase/`: Supabase client configuration and TypeScript type definitions.
- `supabase/migrations/`: SQL migration files defining the PostgreSQL schema.
- `src/data/`: Static reference data, such as `ph-locations.json`.

### Key Implementation Details
- **Bilingual Support**: Labels and buttons use a translation system defined in `src/lib/i18n.tsx`.
- **Privacy**: Contact information (phone, Messenger) is never rendered as raw text; it is only exposed through action buttons (`Tumawag`, `Messenger`).
- **Data Flow**: Uses `@tanstack/react-query` for efficient server-state management and data fetching from Supabase.
- **Auth**: Public users can view the map and list; only authenticated users can submit or edit reports.
