---
name: database-schema
description: Live database schema, access rules and known gaps, verified against the live Supabase project on 2026-10-13. Read before writing any Supabase query.
metadata:
  type: reference
---


# AgriMap PH — Database schema

> **Source of truth: the live Supabase project `agrimapph`.** Last verified against the live database on **2026-10-13**.
> The SQL files in the repo's migration folder drifted from the live database after the move from Lovable Cloud
> (for example, an insert rule that exists in the repo's migrations was never applied live). When they disagree, the live database wins.
> Re-verify before relying on this file for security decisions.

---

## 1. Stored values (what the database holds vs. what the UI shows)

| Field | Stored values | Notes |
|---|---|---|
| `agri_reports.status` | `surplus`, `deficit`, `balanced` | UI labels: Sobra / Kulang / Sapat |
| `agri_reports.category` | `crops`, `fish`, `poultry`, `livestock`, `dairy`, `other` | lowercase keys; `commodities.category` uses the same keys |
| `agri_reports.volume` | mixed legacy: `Napakataas`, `Mataas`, `Katamtaman`, `Very High`, `High`, `Medium`, `Low` | normalize in the UI before comparing |
| `agri_reports.season` | `Jan-Mar`, `Apr-Jun`, `Jul-Sep`, `Oct-Dec`, `All Year`, or null | |
| `agri_reports.record_type` | `current_supply`, `planting_intention` | |
| `agri_reports.growth_stage` | `Planted`, `Growing`, `Near Harvest`, `Newly Stocked` | |
| `agri_reports.price_unit` | `kg`, `piece` (others possible) | default `kg` |
| `agri_reports.source` | `self`, `admin` | default `self` |
| `agri_reports.listing_status` | `active`, `sold`, `archived` | default `active` |
| `user_profiles.role` | `user`, `admin`, `super_admin` | |
| `user_profiles.user_type` | `farmer`, `public` | |
| `user_profiles.verification_tier` | `basic` today; app also expects `community`, `government` | |

**Location strings.** `ph_locations` is **empty (0 rows)** on the live project; the app's cascading location lists live in the app code.
Region/province/municipality text must match exactly what the app writes into reports
(for example `MIMAROPA`, `Region IV-A — CALABARZON`, `Occidental Mindoro`, `San Jose`).
This also applies to an admin's `assigned_*` fields: a mismatch means that admin can manage nothing, with no error.

**Reporter columns (important).**
- `agri_reports.reported_by` is **text**. The app stores the reporter's auth user id there on every new report.
  117 of the 125 legacy rows hold a plain name instead of an id, and 1 is empty.
- `agri_reports.user_id` is **never set by the app** (empty on every row). Do not key lookups on it.
- Admin-entered reports leave `reported_by` empty and put the farmer's name in `farmer_name`; show `farmer_name` when it is present.
- Any lookup like `public_profiles.in("id", reported_by_values)` must **filter the list to UUID-shaped values first**.
  `id` is a uuid column, so one plain name makes Postgres reject the whole request (error 22P02).

---

## 2. Tables

### `agri_reports` (main table; ~126 rows)
Original columns:
`id` uuid pk (`uuid_generate_v4()`), `category`, `subcategory`, `region`, `province`, `municipality`, `barangay` (all text, not null),
`lat`, `lng` numeric not null, `volume` text not null, `status` text not null, `price` numeric, `price_unit` text default `'kg'`, `season`,
`record_type` default `'current_supply'`, `planted_date`, `expected_harvest_date`, `growth_stage`, `expected_volume`, `caught_date`, `stocked_date`,
`number_of_heads` int, `reported_by` text, `phone_number`, `messenger_username`, `contact`, `notes`, `is_verified` bool default false,
`user_id` uuid (unused, see above), `created_at`, `updated_at`.

Added for admin data entry:
`farmer_id` uuid → `farmers.id` (on delete set null), `farmer_name` text, `source` text default `'self'`, `entered_by` uuid → `auth.users`,
`listing_status` text default `'active'`, `sold_at`, `sold_price` numeric, `archived_at`.

### `user_profiles`
`id` uuid pk (= auth user id), `full_name`, `user_type`, `phone_number`, `messenger_username`, `avatar_url`, `primary_commodity`, `farm_location`, `land_area`,
`vessel_type`, `rsbsa_number`, `philsys_id`, `verification_tier` (default `basic`), `verified_at`, `verified_by`, `created_at`, `updated_at`,
`farm_region`, `farm_province`, `farm_municipality`, `farm_barangay`, `role` (default `user`),
`assigned_region`, `assigned_province`, `assigned_municipality` (admin area; null province/municipality = broader coverage; null region = manages nothing),
`phone_verified`, `messenger_verified`, `phone_verified_by`, `messenger_verified_by`, `phone_verified_at`, `messenger_verified_at`,
`rsbsa_submitted`, `is_verifier`, `verifier_municipality`.

**Private columns** (never expose to other users): `phone_number`, `messenger_username`, `rsbsa_number`, `philsys_id`, and the exact farm location.

### `farmers` (people entered by LGUs; may have no account)
`id` uuid pk, `full_name`, `region`, `province`, `municipality`, `barangay` (not null), `rsbsa_number`, `phone_number`, `messenger_username`,
`consent_contact` bool (a check constraint forbids storing phone/Messenger unless true), `created_by` → `auth.users`,
`claimed_by_user_id` (unique) → `auth.users`, `claimed_at`, `created_at`, `updated_at`.
Not publicly readable; see policies. Not the same as the `admin_farmer_list` view, which lists registered users.

### `farmer_claim_codes`
`code` text pk (8 chars), `farmer_id`, `created_by`, `expires_at` (30 days), `used_at`, `used_by`.
RLS on with **no policies**: only the functions `generate_claim_code` and `claim_farmer` can touch it.

### `audit_log`
`id` bigint identity, `table_name`, `record_id`, `action`, `changed_by`, `changed_at`, `old_data` jsonb, `new_data` jsonb.
Filled by triggers on `farmers` and `agri_reports` only (profiles are not audited). Readable by `super_admin` only.

### `commodities` (50 rows): `id`, `name`, `category`, `emoji`, `unit`. Public read.
### `ph_locations` (0 rows): `id`, `region`, `province`, `municipality`, `barangay`, `lat`, `lng`. Public read. **Unused.**

---

## 3. Views (the app reads through these)

| View | Purpose | Who can SELECT |
|---|---|---|
| `agri_reports_public` | All app reads of reports. Same columns as `agri_reports` (minus `entered_by`, `farmer_id`). **`phone_number`, `messenger_username`, `contact`, `user_id` are NULL unless the viewer is logged in**; adds `has_phone` / `has_messenger` flags so logged-out users get a "Mag-login para makita ang contact" button. | anon, authenticated |
| `public_profiles` | Safe profile info about other users: `id, full_name, avatar_url, user_type, verification_tier, phone_verified, messenger_verified, primary_commodity, farm_province, farm_municipality`. | anon, authenticated |
| `admin_farmer_list` | Registered users with contact/RSBSA fields, for admin screens. `security_invoker`, so RLS applies: admins see their area, users see only themselves. | authenticated |

**Rules for views**
- Grants are **SELECT only**. Supabase gives new views full privileges by default, and a simple view is auto-updatable and bypasses RLS.
  Every new view must be followed by `revoke all on <view> from public, anon, authenticated; grant select on <view> to <roles>;`.
- Never select columns from `user_profiles` for another user's profile; use `public_profiles` (selecting a column the view lacks returns a 400, error 42703).
- Self reads of `user_profiles` (own row, signed in) are fine.
- Writes (insert/update/delete) go to the base tables, never the views.

---

## 4. Access rules (row-level security on the live database)

**`agri_reports`** — logged-in read only (anonymous reads go through `agri_reports_public`)
- SELECT: authenticated.
- INSERT (self): logged in, `source='self'`, no `farmer_id`/`entered_by`, `user_id` null or own id, **`reported_by` null or own id**.
- INSERT (admin): `source='admin'`, `entered_by = auth.uid()`, and `can_manage_area(region, province, municipality)`.
- UPDATE: owner (`user_id = auth.uid()`, cannot become admin/farmer rows), admin in area, or claimed farmer for their own produce.
- DELETE: owner (`user_id = auth.uid()`) or admin in area.

**`user_profiles`** — private; use `public_profiles` for other people
- SELECT: own row; admins for profiles whose farm location is inside their area; super admin all.
- INSERT / UPDATE own row. A trigger blocks non-super-admins from changing `role`, `assigned_*`, `is_verifier`, `verifier_municipality`;
  verification fields can be changed only by an admin or by a verifier acting on someone else.
- **"Admins verify contacts" (UPDATE)**: authenticated users only, and requires `role` admin/super_admin **and** `can_manage_area(farm_region, farm_province, farm_municipality)` on the profile being updated. Area admins can verify only users whose farm region/province/municipality is inside their assigned area; a user with no farm location set can only be verified by the super admin. Super admin is unchanged (`can_manage_area` is always true).
- Also: policy "Super admin update roles" still allows the super admin to update any profile.

**`farmers`** — only the admin who manages the area and the farmer who claimed the record
- SELECT / UPDATE: `can_manage_area(...)` or `claimed_by_user_id = auth.uid()`.
- INSERT: `can_manage_area(...)`, `created_by = auth.uid()`, not pre-claimed.
- DELETE: super admin only.

**`audit_log`**: SELECT super admin only. **`commodities`**, **`ph_locations`**: public read.

**Area rule (`can_manage_area(region, province, municipality)`):** true for `super_admin`; for `admin` when `assigned_region` equals the region AND
(`assigned_province` is null or equals the province) AND (`assigned_municipality` is null or equals the municipality).

---

## 5. Functions and triggers

| Function | Notes |
|---|---|
| `is_super_admin()`, `can_manage_area(region, province, municipality)` | security definer helpers used by the policies |
| `generate_claim_code(farmer_id)` | admin in the farmer's area; returns an 8-char code valid 30 days; replaces unused older codes |
| `claim_farmer(code)` | logged-in user redeems a code; links the farmer; hands existing admin-entered reports to the user (`user_id`) |
| `agri_reports_fill_from_farmer()` | before insert: sets `farmer_name`; copies the farmer's phone/Messenger **only if `consent_contact`**; clears `reported_by` for admin entries |
| `agri_reports_lifecycle()` | before insert/update: sets `sold_at` / `archived_at`; only an admin in the area can change `is_verified` (silently reverted otherwise) |
| `protect_profile_privileges()` | before insert/update on `user_profiles`; see access rules |
| `log_audit()` | after insert/update/delete on `farmers` and `agri_reports` |
| `update_updated_at()`, `update_user_profiles_updated_at()` | `updated_at` maintenance |
| `handle_new_user()` | exists (security definer); not reviewed for this document |

Triggers: `agri_reports_audit`, `agri_reports_fill_from_farmer_trg`, `agri_reports_lifecycle_trg`, `agri_reports_updated_at`,
`farmers_audit`, `farmers_updated_at`, `user_profiles_protect_privileges`, `user_profiles_updated_at`.

---

## 6. Admin data entry — how a row must look

An admin-entered report must set: `source='admin'`, `entered_by=<admin id>`, `farmer_id=<farmer id>`, and the normal NOT NULL fields
(`category`, `subcategory`, `region`, `province`, `municipality`, `barangay`, `lat`, `lng`, `volume`, `status`).
Leave `user_id` and `reported_by` empty. Use the **stored** values from section 1 (`surplus`, `crops`, ...), not the UI labels.
Search farmers (autocomplete) by municipality + barangay; row-level security already limits results to the admin's area.

---

## 7. Known gaps (open items)

1. **`user_id` is never set**, so the "owner can update/delete own report" rules never match. Decide: set `user_id` on insert (trigger) and backfill from `reported_by`.
2. **Reporter lookups must filter to UUID-shaped `reported_by` values** (section 1). Several location/profile components still need this.
3. **Listahan "Nakapag-ulat" prints a raw UUID** for app-created reports; admin-entered pins show no reporter. Show `farmer_name` / resolve names through `public_profiles`.
4. **Map and Listahan do not yet filter `listing_status = 'active'`.**
5. **Test data exists** (test accounts; a dummy farmer `5a1f0000-0000-4000-8000-000000000001` and dummy report `5a1f0000-0000-4000-8000-0000000000a1`). Remove or reset before launch.
6. **Repo migrations are out of date.** Add the SQL files from the 2026-10-13 database work (admin/farmers schema, profile privacy, contact privacy, view grants, reporter patch) to `supabase/migrations/` so the repo matches the live database.
7. Realtime is not used anywhere. If it is added later, logged-out visitors will not receive base-table changes (anonymous reads go through the view).

---

## 8. Change log

| Date | Change |
|---|---|
| 2026-10-13 | Added `farmers`, `farmer_claim_codes`, `audit_log`; `agri_reports` gained `farmer_id`, `farmer_name`, `source`, `entered_by`, `listing_status`, `sold_at`, `sold_price`, `archived_at`; `user_profiles` gained `assigned_municipality`. |
| 2026-10-13 | Added area-scoped admin access (`can_manage_area`, `is_super_admin`) and the claim-code flow (`generate_claim_code`, `claim_farmer`). |
| 2026-10-13 | Privacy: new views `agri_reports_public` and `public_profiles`; `admin_farmer_list` made `security_invoker` and removed from anonymous access; contact details hidden from logged-out visitors. |
| 2026-10-13 | Removed anonymous read of `agri_reports` and `user_profiles` base tables (reads go through the views). |
| 2026-10-13 | Security fixes: views limited to SELECT (they were writable by anonymous users); users can no longer set their own role/area/verification; self reports must be attributed to the submitter. |
| 2026-10-13 | Admin-entered reports now leave `reported_by` empty (farmer name goes in `farmer_name`). |
| 2026-10-13 | "Admins verify contacts" now limited to the admin's own area via `can_manage_area`; users without a farm location can only be verified by the super admin. |

