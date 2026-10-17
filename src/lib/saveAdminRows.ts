/**
 * "Save all" logic for the admin data-entry grid (first DB-writing step).
 *
 * Steps:
 *  1. Farmers first: rows with farmer_id set reuse it; rows without are
 *     grouped by normalized key (lowercase full name + barangay +
 *     municipality), matched against existing farmers (case-insensitive
 *     full_name + barangay + municipality in that province), else ONE new
 *     farmer row per group. Contact fields are set ONLY when a row in the
 *     group has Contact OK ticked and a value (CHECK forbids contact values
 *     without consent_contact = true).
 *  2. Reports: insert into agri_reports with source='admin', chunks of 25,
 *     per-row retry so one bad row never blocks the rest.
 *
 * Uses the loosely-typed `db` handle so the user's own session applies and
 * RLS enforces area limits. Never writes audit_log, sold_at, archived_at,
 * or sold_price.
 */

import { db } from "@/lib/db";
import { getPriceMeta } from "@/lib/categories";
import { adminRowMunicipality, resolveAdminRowLatLng } from "@/lib/validateAdminRow";

/** Minimal row shape needed for saving (structural typing of the grid Row). */
export interface SaveRowInput {
  id: string;
  farmer_name: string;
  farmer_id: string | null;
  contact_ok: boolean;
  phone: string;
  messenger: string;
  category: string;
  commodity: string;
  status: string;
  volume: string;
  price: string;
  season: string;
  record_type: string;
  municipality_override: string;
  barangay: string;
  notes: string;
  planted_date: string;
  expected_harvest_date: string;
  growth_stage: string;
  expected_volume: string;
}

export interface SaveLocation {
  region: string;
  province: string;
  municipality: string;
}

/** One failed row: grid row id + message shown on hover. */
export interface SaveRowFailure {
  rowId: string;
  message: string;
}

export interface SaveAllResult {
  savedRowIds: string[];
  failures: SaveRowFailure[];
}

const norm = (s: string) => s.trim().toLowerCase();
const normKey = (name: string, barangay: string, municipality: string) =>
  `${norm(name)}|${norm(barangay)}|${norm(municipality)}`;

const errMsg = (e: unknown): string =>
  e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);

/**
 * Resolve farmer ids for the given rows. Returns a map rowId -> farmerId.
 * Rows whose farmer cannot be found/created get an entry in `failures` and
 * no map entry (their report is never inserted).
 */
async function resolveFarmerIds(
  rows: SaveRowInput[],
  location: SaveLocation,
  adminUserId: string,
  failures: SaveRowFailure[],
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const row of rows) {
    if (row.farmer_id) ids.set(row.id, row.farmer_id);
  }
  const needing = rows.filter((r) => !r.farmer_id);
  if (needing.length === 0) return ids;

  const groups = new Map<string, SaveRowInput[]>();
  for (const row of needing) {
    const muni = adminRowMunicipality(row, location.municipality);
    const key = normKey(row.farmer_name, row.barangay, muni);
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }

  for (const [, group] of groups) {
    const first = group[0];
    const muni = adminRowMunicipality(first, location.municipality);
    const name = first.farmer_name.trim();
    const barangay = first.barangay.trim();
    const foundRes = await db
      .from("farmers")
      .select("id")
      .eq("province", location.province)
      .eq("municipality", muni)
      .eq("barangay", barangay)
      .ilike("full_name", name)
      .limit(1);
    const found = foundRes.data as unknown as { id: string }[] | null;
    if (!foundRes.error && found && found.length > 0) {
      for (const row of group) ids.set(row.id, found[0].id);
      continue;
    }
    if (foundRes.error) {
      for (const row of group)
        failures.push({ rowId: row.id, message: errMsg(foundRes.error) });
      continue;
    }
    const withContact = group.find(
      (r) => r.contact_ok && (r.phone.trim() || r.messenger.trim()),
    );
    const farmerPayload = {
      full_name: name,
      region: location.region,
      province: location.province,
      municipality: muni,
      barangay,
      phone_number: withContact?.phone.trim() || null,
      messenger_username: withContact?.messenger.trim() || null,
      consent_contact: Boolean(withContact),
      created_by: adminUserId,
    };
    const insRes = await db
      .from("farmers")
      .insert(farmerPayload as never)
      .select("id")
      .single();
    const inserted = insRes.data as unknown as { id: string } | null;
    if (insRes.error || !inserted) {
      for (const row of group)
        failures.push({
          rowId: row.id,
          message: insRes.error ? errMsg(insRes.error) : "Farmer insert failed",
        });
      continue;
    }
    for (const row of group) ids.set(row.id, inserted.id);
  }
  return ids;
}

/**
 * Build the agri_reports insert payload for one row, mirroring the Mag-ulat
 * insert payload (ReportFormPage).
 */
async function buildReportPayload(
  row: SaveRowInput,
  farmerId: string,
  location: SaveLocation,
  adminUserId: string,
) {
  const muni = adminRowMunicipality(row, location.municipality);
  const latLng = await resolveAdminRowLatLng(muni, location.province);
  const meta = getPriceMeta(row.category, row.commodity);
  const phone = row.contact_ok && row.phone.trim() ? row.phone.trim() : null;
  const messenger =
    row.contact_ok && row.messenger.trim() ? row.messenger.trim() : null;

  if (row.record_type === "planting_intention") {
    const volumeCombined =
      [row.volume, row.expected_volume].filter(Boolean).join(" — ") || null;
    return {
      record_type: "planting_intention",
      category: row.category,
      subcategory: row.commodity,
      status: "balanced",
      planted_date: row.planted_date || null,
      expected_harvest_date: row.expected_harvest_date || null,
      volume: row.volume || null,
      expected_volume: volumeCombined,
      growth_stage: row.growth_stage || null,
      region: location.region,
      province: location.province,
      municipality: muni,
      barangay: row.barangay,
      lat: latLng ? latLng[0] : 0,
      lng: latLng ? latLng[1] : 0,
      notes: row.notes || null,
      phone_number: phone,
      messenger_username: messenger,
      farmer_id: farmerId,
      source: "admin",
      entered_by: adminUserId,
      listing_status: "active",
    };
  }

  return {
    record_type: "current_supply",
    category: row.category,
    subcategory: row.commodity,
    price: Number(row.price),
    price_unit: meta.unit,
    status: row.status,
    region: location.region,
    province: location.province,
    municipality: muni,
    barangay: row.barangay,
    lat: latLng ? latLng[0] : 0,
    lng: latLng ? latLng[1] : 0,
    notes: row.notes || null,
    volume: row.volume,
    planted_date: row.category === "fish" ? row.planted_date || null : null,
    phone_number: phone,
    messenger_username: messenger,
    farmer_id: farmerId,
    source: "admin",
    entered_by: adminUserId,
    listing_status: "active",
  };
}

/**
 * Save valid rows: farmers first, then reports in chunks of 25 with per-row
 * retry so a single bad row doesn't block the others.
 */
export async function saveAdminRows(
  rows: SaveRowInput[],
  location: SaveLocation,
  adminUserId: string,
): Promise<SaveAllResult> {
  const failures: SaveRowFailure[] = [];
  const farmerIds = await resolveFarmerIds(rows, location, adminUserId, failures);

  const reportRows = rows.filter((r) => farmerIds.has(r.id));
  const savedRowIds: string[] = [];

  const CHUNK = 25;
  for (let i = 0; i < reportRows.length; i += CHUNK) {
    const chunk = reportRows.slice(i, i + CHUNK);
    const payloads: { row: SaveRowInput; payload: Record<string, unknown> }[] = [];
    for (const row of chunk) {
      try {
        const payload = await buildReportPayload(
          row,
          farmerIds.get(row.id) as string,
          location,
          adminUserId,
        );
        payloads.push({ row, payload });
      } catch (e) {
        failures.push({ rowId: row.id, message: errMsg(e) });
      }
    }
    if (payloads.length === 0) continue;
    const { error } = await db
      .from("agri_reports")
      .insert(payloads.map((p) => p.payload) as never);
    if (!error) {
      for (const p of payloads) savedRowIds.push(p.row.id);
    } else {
      for (const p of payloads) {
        const { error: rowError } = await db
          .from("agri_reports")
          .insert(p.payload as never);
        if (!rowError) savedRowIds.push(p.row.id);
        else failures.push({ rowId: p.row.id, message: errMsg(rowError) });
      }
    }
  }
  return { savedRowIds, failures };
}
