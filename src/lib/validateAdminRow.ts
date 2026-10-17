/**
 * Live row validation for the admin data-entry grid (no saving, no Supabase).
 *
 * Pure helpers so the JSX edits in AdminDataEntry.tsx stay small:
 * - isAdminRowEmpty: rows with no data at all are ignored (never invalid).
 * - validateAdminRow: maps grid fields to the shared reportSchema the same way
 *   the Mag-ulat form builds its candidate, then adds the admin-grid rules
 *   (Farmer name, Barangay, location bar fully set, area membership).
 *   Phone/Messenger count only when Contact OK is ticked.
 * - lat/lng are filled via geocodeMunicipality(municipality, province),
 *   falling back to getProvinceCenter. Done at validation time via
 *   resolveAdminRowLatLng(); lat/lng columns are never shown.
 */

import { reportSchema } from "@/lib/reportSchema";
import { geocodeMunicipality, getProvinceCenter } from "@/lib/geoCoords";

/** Grid-row fields that can carry a validation error. */
export type AdminRowField =
  | "farmer_name"
  | "phone"
  | "messenger"
  | "category"
  | "commodity"
  | "status"
  | "volume"
  | "price"
  | "season"
  | "record_type"
  | "barangay"
  | "notes"
  | "planted_date"
  | "expected_harvest_date"
  | "location"
  | "area";

export type AdminRowErrors = Partial<Record<AdminRowField, string>>;

export type AdminRowState = "empty" | "valid" | "invalid";

/** Minimal shape of a grid row needed for validation (structural typing). */
export interface AdminRowInput {
  farmer_name: string;
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
  /** Planting-intention display fields: count as data when set. */
  growth_stage?: string;
  expected_volume?: string;
}

export interface AdminArea {
  isSuperAdmin: boolean;
  assigned_province: string | null | undefined;
  assigned_municipality: string | null | undefined;
}

export interface AdminRowLocation {
  region: string;
  province: string;
  municipality: string;
}

export type AdminLang = "fil" | "en";

/** zod path segment (e.g. "volume_level", "price") -> grid row field. */
const SCHEMA_PATH_TO_FIELD: Record<string, AdminRowField> = {
  category: "category",
  commodity: "commodity",
  volume_level: "volume",
  status: "status",
  price: "price",
  region: "location",
  province: "location",
  municipality: "location",
  barangay: "barangay",
  lat: "location",
  lng: "location",
  planted_date: "planted_date",
  expected_harvest_date: "expected_harvest_date",
  notes: "notes",
};

/**
 * A row counts as empty when every data field is blank/unset; empty rows are
 * ignored (never invalid). `status: "balanced"` and
 * `record_type: "current_supply"` are the new-row defaults, so they only
 * count as data when changed. Phone/Messenger count only when Contact OK
 * is ticked.
 */
export function isAdminRowEmpty(row: AdminRowInput): boolean {
  return (
    !row.farmer_name.trim() &&
    !row.contact_ok &&
    !(row.contact_ok && (row.phone.trim() || row.messenger.trim())) &&
    !row.category &&
    !row.commodity.trim() &&
    (!row.status || row.status === "balanced") &&
    !row.volume &&
    row.price.trim() === "" &&
    !row.season &&
    row.record_type === "current_supply" &&
    !row.municipality_override.trim() &&
    !row.barangay.trim() &&
    !row.notes.trim() &&
    !row.planted_date &&
    !row.expected_harvest_date &&
    !(row.growth_stage ?? "").trim() &&
    !(row.expected_volume ?? "").trim()
  );
}

/** Resolve the row's effective municipality (override or shared). */
export function adminRowMunicipality(
  row: Pick<AdminRowInput, "municipality_override">,
  sharedMunicipality: string,
): string {
  return row.municipality_override.trim() || sharedMunicipality;
}

/**
 * Fill lat/lng at validation time via geocodeMunicipality, falling back to
 * getProvinceCenter. Returns null when neither resolves (caller then fails
 * the location check, which the schema surfaces via lat/lng).
 */
export async function resolveAdminRowLatLng(
  municipalityName: string,
  provinceName: string,
): Promise<[number, number] | null> {
  if (!municipalityName || !provinceName) return null;
  const coords = await geocodeMunicipality(municipalityName, provinceName);
  return coords ?? getProvinceCenter(provinceName);
}

export interface ValidateAdminRowArgs {
  row: AdminRowInput;
  location: AdminRowLocation;
  area: AdminArea;
  lang: AdminLang;
  /** Resolved lat/lng (or the geo cache). Null = unresolved. */
  latLng: [number, number] | null;
}

/**
 * Validate one grid row with data. Returns per-field messages keyed by row
 * field name so the JSX can outline cells and show reasons on hover/tap.
 * Empty rows return {} (ignored, never invalid).
 */
export function validateAdminRow({
  row,
  location,
  area,
  lang,
  latLng,
}: ValidateAdminRowArgs): AdminRowErrors {
  if (isAdminRowEmpty(row)) return {};
  const errors: AdminRowErrors = {};

  const { region, province } = location;
  const rowMuni = adminRowMunicipality(row, location.municipality);

  // Same candidate shape as the Mag-ulat form's buildCandidate. Volume maps
  // grid `volume` -> schema `volume_level`; phone/messenger are contact
  // metadata and never reach the schema.
  // NOTE: keep lat/lng here even though no lat/lng columns are shown — the
  // schema requires them, and they are filled at validation time.
  const lat = latLng ? String(latLng[0]) : "0";
  const lng = latLng ? String(latLng[1]) : "0";
  const candidate = {
    record_type: row.record_type,
    category: row.category,
    commodity: row.commodity,
    volume_level: row.volume,
    status: row.status,
    price: row.price,
    region,
    province,
    municipality: rowMuni,
    barangay: row.barangay,
    lat,
    lng,
    planted_date: row.planted_date,
    expected_harvest_date: row.expected_harvest_date,
    notes: row.notes,
  };
  const parsed = reportSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const seg = String(issue.path[0] ?? "");
      const field = SCHEMA_PATH_TO_FIELD[seg];
      if (field && !errors[field]) errors[field] = issue.message;
    }
  }

  // Admin-grid extras (required regardless of schema outcome).
  if (!row.farmer_name.trim()) {
    errors.farmer_name =
      lang === "fil" ? "Ilagay ang pangalan ng magsasaka" : "Enter the farmer name";
  }
  if (!row.barangay.trim() && !errors.barangay) {
    errors.barangay = lang === "fil" ? "Barangay ay kailangan" : "Barangay is required";
  }
  if (!region || !province || !location.municipality) {
    errors.location =
      lang === "fil"
        ? "Punan ang rehiyon, lalawigan at bayan sa itaas"
        : "Set the region, province and municipality above";
  }
  // Area membership: the row's municipality must be inside the admin's area.
  if (!area.isSuperAdmin && rowMuni) {
    const inArea =
      (!area.assigned_province || province === area.assigned_province) &&
      (!area.assigned_municipality || rowMuni === area.assigned_municipality);
    if (!inArea) {
      errors.area =
        lang === "fil"
          ? "Ang bayan ay wala sa iyong sakop na lugar"
          : "The municipality is outside your assigned area";
    }
  }
  return errors;
}

/** Classify a row: empty (ignored), valid, or invalid. */
export function adminRowState(errors: AdminRowErrors, empty: boolean): AdminRowState {
  if (empty) return "empty";
  return Object.keys(errors).length === 0 ? "valid" : "invalid";
}
