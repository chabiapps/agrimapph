- [Project Overview](project-overview.md) — High-level overview of AgriMap PH project architecture and goals
- [Database Schema](database-schema.md) — Live database schema, access rules and known gaps (verified against the live Supabase project on 2026-10-13). Read before writing any Supabase query.
- [UI Components](ui-components.md) — Inventory of key UI components in AgriMap PH
- [Tech Stack](tech-stack.md) — Technical specifications and toolchain for AgriMap PH
- [Session Context](session-context.md) — Current work-in-progress and focus for the active session

## Database rules (read before writing any Supabase query)
1. Read reports from the view `agri_reports_public`, never from `agri_reports`. Inserts, updates and deletes still go to `agri_reports`.
2. Read another user's profile only from the view `public_profiles` and select only its 10 columns (id, full_name, avatar_url, user_type, verification_tier, phone_verified, messenger_verified, primary_commodity, farm_province, farm_municipality). Selecting any other column returns a 400. Reading the signed-in user's own row from `user_profiles` is fine.
3. Stored values differ from UI labels: status is `surplus` / `deficit` / `balanced` (UI shows Sobra / Kulang / Sapat); category is `crops` / `fish` / `poultry` / `livestock` / `dairy` / `other`.
4. `agri_reports.reported_by` is text. New reports store the reporter's user id there, but many legacy rows hold plain names. Before any `.in("id", ...)` lookup against a uuid column, filter the values to UUID-shaped strings, otherwise the whole request fails (error 22P02).
5. `agri_reports.user_id` is never set by the app. Do not key lookups on it. Admin-entered reports leave `reported_by` empty and carry `farmer_name`; show `farmer_name` when it is present.
6. Phone and Messenger values are only returned to logged-in users. For logged-out visitors the view returns null plus `has_phone` / `has_messenger`; show a "Mag-login para makita ang contact" button instead of contact buttons.
7. Any new database view must be followed by `revoke all ... from public, anon, authenticated; grant select ... to <roles>;`. A view left with default privileges is writable and bypasses row-level security.
8. `ph_locations` is empty; the location lists live in app code. Admin area fields (`assigned_region` / `assigned_province` / `assigned_municipality`) must match the strings the app writes exactly.
9. Database changes are made through reviewed SQL files, never from app code or an automated agent without approval.
