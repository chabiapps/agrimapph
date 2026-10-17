import {
  useState,
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
  type ClipboardEvent,
  type FocusEvent,
} from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, X, Copy, ArrowDownToLine } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { toast } from "@/hooks/use-toast";
import { useAdminAccess } from "@/lib/profile";
import { VOLUME_VALUES, type RecordType } from "@/lib/reportSchema";
import {
  CATEGORIES,
  getCategoryDef,
  getPriceMeta,
  type CategoryKey,
} from "@/lib/categories";
import { STAGE_BY_CATEGORY, DATE_LABELS } from "@/lib/formOptions";
import { db } from "@/lib/db";
import {
  adminRowMunicipality,
  adminRowState,
  isAdminRowEmpty,
  resolveAdminRowLatLng,
  validateAdminRow,
  type AdminRowErrors,
} from "@/lib/validateAdminRow";
import phLocations from "@/data/ph-locations.json";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

// --- Location data: from src/data/ph-locations.json (NOT the ph_locations table) ---
type PhProvince = { name: string; code: string; municipalities: string[] };
type PhRegion = { name: string; code: string; provinces: PhProvince[] };
const PH_REGIONS = (phLocations as unknown as { regions: PhRegion[] }).regions;

// A row from the `farmers` table. RLS already limits what this admin can see,
// so we only filter client-side by the shared municipality for the autocomplete.
type Farmer = {
  id: string;
  full_name: string;
  phone_number: string | null;
  messenger_username: string | null;
  province: string | null;
  municipality: string | null;
  barangay: string | null;
};

/** One spreadsheet row = one agri_report to be saved later. */
interface Row {
  id: string;
  farmer_name: string;
  farmer_id: string | null; // set when the name matches an existing farmer
  contact_ok: boolean;
  phone: string;
  messenger: string;
  category: CategoryKey | "";
  commodity: string;
  status: "surplus" | "deficit" | "balanced" | "";
  volume: string;
  price: string;
  season: string;
  record_type: RecordType;
  municipality_override: string; // "" = inherit the shared municipality
  barangay: string;
  notes: string;
  // planting-intention only
  planted_date: string;
  expected_harvest_date: string;
  growth_stage: string;
  expected_volume: string;
}

let rowSeq = 0;
const newRow = (): Row => ({
  id: `r${++rowSeq}`,
  farmer_name: "",
  farmer_id: null,
  contact_ok: false,
  phone: "",
  messenger: "",
  category: "",
  commodity: "",
  status: "balanced",
  volume: "",
  price: "",
  season: "",
  record_type: "current_supply",
  municipality_override: "",
  barangay: "",
  notes: "",
  planted_date: "",
  expected_harvest_date: "",
  growth_stage: "",
  expected_volume: "",
});

const VOLUME_OPTS = VOLUME_VALUES.map((v) => ({ value: v, label: v }));
const SEASON_OPTS = ["Jan-Mar", "Apr-Jun", "Jul-Sep", "Oct-Dec", "All Year"].map(
  (s) => ({ value: s, label: s }),
);
const EMPTY = "__empty__";

// (Two-line card layout: no shared column template needed.)

const CELL_INPUT = "min-h-[48px] w-full text-base";
const CELL_TRIGGER = "min-h-[48px] w-full text-base";
// Invalid cells (aria-invalid set by invalidCell below) get a red outline.
const INVALID_RING =
  " aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/40";

// Navigable columns in visual order (Unit, index 9, is read-only so it is
// excluded). Used for Tab/Shift+Tab movement within a row.
const NAV_COLS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13];

// Columns rendered as <Select> controls (they keep their native Enter/arrow keys).
const SELECT_COLS = new Set([4, 6, 7, 10, 11]);

// Column index -> Row field, for fill-down and paste. Select columns are
// resolved through resolvePaste so pasted labels map to stored values.
const COL_FIELD: Record<number, keyof Row> = {
  0: "farmer_name",
  2: "phone",
  3: "messenger",
  4: "category",
  5: "commodity",
  6: "status",
  7: "volume",
  8: "price",
  10: "season",
  11: "record_type",
  12: "barangay",
  13: "notes",
};

// Paste column order (left to right), skipping Contact OK and Unit.
const PASTE_COLS = [0, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13];

/**
 * Admin Data Entry page (manual grid). Spreadsheet-style bulk entry.
 * Gated by useAdminAccess() (admins / super admins only). Local state only —
 * no Supabase calls yet. CSV import and saving arrive in later steps.
 */
const AdminDataEntry = () => {
  const { lang, t } = useLang();
  const {
    loading,
    isAdmin,
    isSuperAdmin,
    role,
    assigned_region,
    assigned_province,
    assigned_municipality,
  } = useAdminAccess();

  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 5 }, newRow));

  const update = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, newRow()]);
  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const toggleContact = (row: Row, ok: boolean) =>
    update(row.id, {
      contact_ok: ok,
      phone: ok ? row.phone : "",
      messenger: ok ? row.messenger : "",
    });

  // --- Shared location (the sticky bar). Rows inherit it; a row may override
  // the municipality. Defaults come from the admin's assigned area once loaded.
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [locReady, setLocReady] = useState(false);

  // A non-super admin with no assigned region manages nothing.
  const managesNothing = !isSuperAdmin && !assigned_region;

  useEffect(() => {
    if (loading || locReady) return;
    if (!isSuperAdmin) {
      setRegion(assigned_region ?? "");
      setProvince(assigned_province ?? "");
      setMunicipality(assigned_municipality ?? "");
    }
    setLocReady(true);
  }, [
    loading,
    locReady,
    isSuperAdmin,
    assigned_region,
    assigned_province,
    assigned_municipality,
  ]);

  // Cascading option lists, restricted to the admin's assigned area.
  const regionOptions = isSuperAdmin
    ? PH_REGIONS
    : PH_REGIONS.filter((r) => r.name === assigned_region);
  const selectedRegion = PH_REGIONS.find((r) => r.name === region);
  const provinceOptions = (selectedRegion?.provinces ?? []).filter(
    (p) => isSuperAdmin || !assigned_province || p.name === assigned_province,
  );
  const selectedProvince = selectedRegion?.provinces.find(
    (p) => p.name === province,
  );
  const municipalityOptions = (selectedProvince?.municipalities ?? []).filter(
    (m) => isSuperAdmin || !assigned_municipality || m === assigned_municipality,
  );

  // Changing region/province clears the finer selections so they stay in range.
  const changeRegion = (v: string) => {
    setRegion(v);
    setProvince("");
    setMunicipality("");
  };
  const changeProvince = (v: string) => {
    setProvince(v);
    setMunicipality("");
  };

  // --- Farmers in the admin's area (RLS already limits to the area).
  // Scoped to the shared province so the autocomplete spans the admin's whole
  // area; picking a farmer from a different municipality overrides the row's
  // inherited municipality.
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [farmersLoading, setFarmersLoading] = useState(false);
  const [openFarmerRow, setOpenFarmerRow] = useState<string | null>(null);

  // Keyboard nav: the grid container ref lets us move focus between cells.
  const gridRef = useRef<HTMLDivElement | null>(null);
  // Ref to the open farmer-combobox input, focused when the popover opens.
  const farmerInputRef = useRef<HTMLInputElement>(null);
  // The last focused cell (row, column) — used by Fill down (Ctrl/⌘+D) and paste.
  const [focusedCell, setFocusedCell] = useState<{
    r: number;
    c: number;
  } | null>(null);
  useEffect(() => {
    let active = true;
    if (!province) {
      setFarmers([]);
      return;
    }
    setFarmersLoading(true);
    (async () => {
      const { data, error } = await db
        .from("farmers")
        .select(
          "id, full_name, phone_number, messenger_username, province, municipality, barangay",
        )
        .eq("province", province);
      if (!active) return;
      setFarmersLoading(false);
      if (!error && data) setFarmers(data as unknown as Farmer[]);
    })();
    return () => {
      active = false;
    };
  }, [province]);

  // Unsaved-changes guard: warn before leaving the page while any row holds
  // data. The app uses BrowserRouter, so we use the native beforeunload dialog
  // rather than a router blocker.
  useEffect(() => {
    const hasData = rows.some(
      (r) =>
        r.farmer_name !== "" ||
        r.farmer_id !== null ||
        r.phone !== "" ||
        r.messenger !== "" ||
        r.category !== "" ||
        r.commodity !== "" ||
        r.volume !== "" ||
        r.price !== "" ||
        r.season !== "" ||
        r.barangay !== "" ||
        r.notes !== "" ||
        r.planted_date !== "" ||
        r.expected_harvest_date !== "" ||
        r.growth_stage !== "" ||
        r.expected_volume !== "",
    );
    if (!hasData) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [rows]);

  // Resolve a picked farmer by its id (we close over the real row object, never
  // matching by name) — so two farmers with the same name stay distinct. Fills
  // contact info; Contact OK is set true ONLY when the farmer actually has a
  // phone or messenger. Copies the farmer's barangay only when the row's own
  // barangay is still empty (never overwrites what the admin already typed).
  const pickFarmer = (row: Row, f: Farmer) => {
    const phone = f.phone_number ?? "";
    const messenger = f.messenger_username ?? "";
    update(row.id, {
      farmer_name: f.full_name,
      farmer_id: f.id,
      phone,
      messenger,
      contact_ok: Boolean(phone || messenger),
      municipality_override: f.municipality ?? "",
      barangay: row.barangay || f.barangay || "",
    });
  };

  // Reset everything a pick filled in (but keep whatever the admin typed).
  // Used when the name no longer matches the picked farmer.
  const clearedByPick = (row: Row) => ({
    farmer_id: null,
    phone: "",
    messenger: "",
    contact_ok: false,
    barangay: "",
    municipality_override: "",
  });

  // "Full Name — Barangay, Municipality" so two same-named farmers read apart.
  const farmerLabel = (f: Farmer) =>
    [f.full_name, [f.barangay, f.municipality].filter(Boolean).join(", ")]
      .filter(Boolean)
      .join(" — ");

  const farmerSuggestions = (row: Row) => {
    const q = row.farmer_name.trim().toLowerCase();
    if (!q) return farmers;
    return farmers.filter((f) =>
      [f.full_name, f.barangay, f.municipality]
        .filter(Boolean)
        .some((s) => (s as string).toLowerCase().includes(q)),
    );
  };

  // --- Keyboard navigation helpers ---------------------------------------
  // Every grid cell carries data-row + data-col so cells can be found by
  // position. Focus the cell at (row, col) via querySelector on those
  // attributes, then focus the first focusable control within it. Returns
  // false if the cell is disabled (e.g. Phone/Messenger before Contact OK
  // is ticked) so callers can skip past it.
  const focusCell = (row: number, col: number): boolean => {
    const el = gridRef.current?.querySelector<HTMLElement>(
      `[data-row="${row}"][data-col="${col}"]`,
    );
    if (!el) return false;
    const target =
      el.matches("input,button,select,textarea,[tabindex]") === true
        ? el
        : el.querySelector<HTMLElement>(
            "input,button,select,textarea,[tabindex]",
          );
    if (!target || (target as HTMLInputElement).disabled) return false;
    target.focus();
    return true;
  };

  // Step through the grid linearly (row-major over NAV_COLS) from `startIdx` in
  // `step` direction and focus the first cell that can take focus. Used so Tab
  // and Enter skip disabled cells. Returns false if none could be focused.
  const focusFirstFocusable = (startIdx: number, step: number): boolean => {
    const len = NAV_COLS.length;
    const total = rows.length * len;
    for (let idx = startIdx; idx >= 0 && idx < total; idx += step) {
      const rr = Math.floor(idx / len);
      const cc = NAV_COLS[idx % len];
      if (focusCell(rr, cc)) return true;
    }
    return false;
  };

  // Append a new row and focus one of its cells after the re-render.
  const addRowAndFocus = (col: number) => {
    const newRowIdx = rows.length;
    addRow();
    requestAnimationFrame(() => focusCell(newRowIdx, col));
  };

  // Fill down (single cell, Cmd/Ctrl+D): copy the value of the cell above
  // into the focused cell, overwriting. Grouped so copies stay valid:
  // - Farmer name copies farmer_id too (same existing farmer).
  // - Category copies together with Commodity; a lone Commodity copies only
  //   when both rows already share the same Category.
  // - Planting second-line fields have no data-col, so Cmd+D does nothing there;
  //   use the per-row fill button for those.
  // Changing Category via paste/fill still goes through the same rule as the
  // select (commodity travels with its category, never under a new one).
  const fillDown = (row: number, col: number) => {
    if (row <= 0 || row >= rows.length) return;
    const above = rows[row - 1];
    const cur = rows[row];
    const patch: Partial<Row> = {};
    if (col === 0) {
      patch.farmer_name = above.farmer_name;
      patch.farmer_id = above.farmer_id;
    } else if (col === 1) {
      patch.contact_ok = above.contact_ok;
    } else if (col === 2) {
      patch.phone = above.phone;
    } else if (col === 3) {
      patch.messenger = above.messenger;
    } else if (col === 4) {
      patch.category = above.category;
      patch.commodity = above.commodity;
    } else if (col === 5) {
      // Lone commodity is only valid under the same category.
      if (!cur.category || cur.category !== above.category) return;
      patch.commodity = above.commodity;
    } else {
      const field = COL_FIELD[col];
      if (!field || field === "farmer_name") return;
      (patch as Record<string, unknown>)[field] = above[field];
    }
    update(cur.id, patch);
  };

  const isBlank = (v: string) => v.trim() === "";

  // Fill row down (per-row button): copy every filled cell from the row above,
  // but only into cells that are empty in this row — never overwrite what the
  // admin already typed. Group rules keep copies valid:
  // - Category copies together with Commodity; a lone Commodity copies only
  //   when both rows share the same Category.
  // - Phone/Messenger/Contact OK copy as a group only when Farmer name is
  //   also copied (target farmer was empty). Copying a Farmer name copies
  //   farmer_id too. Unit is derived, never copied.
  // - Planting-intention fields copy only if both rows are planting_intention
  //   (after any record_type copy).
  const fillRowDown = (index: number) => {
    if (index <= 0 || index >= rows.length) return;
    const above = rows[index - 1];
    const cur = rows[index];
    const patch: Partial<Row> = {};

    // Farmer + contact group: only when the target farmer name is empty and
    // the source has one. farmer_id travels with the name (same farmer).
    const farmerCopied =
      isBlank(cur.farmer_name) && !isBlank(above.farmer_name);
    if (farmerCopied) {
      patch.farmer_name = above.farmer_name;
      patch.farmer_id = above.farmer_id;
      if (isBlank(cur.phone) && !isBlank(above.phone))
        patch.phone = above.phone;
      if (isBlank(cur.messenger) && !isBlank(above.messenger))
        patch.messenger = above.messenger;
      if (!cur.contact_ok && above.contact_ok) patch.contact_ok = true;
    }

    // Category + commodity group.
    if (isBlank(cur.category) && !isBlank(above.category)) {
      patch.category = above.category;
      patch.commodity = above.commodity;
    } else if (
      !isBlank(cur.category) &&
      cur.category === above.category &&
      isBlank(cur.commodity) &&
      !isBlank(above.commodity)
    ) {
      patch.commodity = above.commodity;
    }

    // Simple fields: copy only filled -> empty. Status treats its "balanced"
    // default (and the empty state from unknown pastes) as empty: a
    // non-default source overwrites a default/empty target, but a
    // non-default target is never overwritten.
    if (
      (cur.status === "balanced" || cur.status === "") &&
      above.status !== "balanced" &&
      above.status !== ""
    )
      patch.status = above.status;
    if (isBlank(cur.volume) && !isBlank(above.volume))
      patch.volume = above.volume;
    if (isBlank(cur.price) && !isBlank(above.price)) patch.price = above.price;
    if (isBlank(cur.season) && !isBlank(above.season))
      patch.season = above.season;
    if (isBlank(cur.barangay) && !isBlank(above.barangay))
      patch.barangay = above.barangay;
    if (isBlank(cur.notes) && !isBlank(above.notes)) patch.notes = above.notes;

    // Record type: the "current_supply" default counts as empty; a
    // planting_intention source upgrades a default target (never downgrades).
    if (
      cur.record_type === "current_supply" &&
      above.record_type === "planting_intention"
    )
      patch.record_type = "planting_intention";
    const effectiveRecordType = patch.record_type ?? cur.record_type;

    // Planting-intention fields: only when both rows are planting_intention.
    if (
      effectiveRecordType === "planting_intention" &&
      above.record_type === "planting_intention"
    ) {
      if (isBlank(cur.planted_date) && !isBlank(above.planted_date))
        patch.planted_date = above.planted_date;
      if (
        isBlank(cur.expected_harvest_date) &&
        !isBlank(above.expected_harvest_date)
      )
        patch.expected_harvest_date = above.expected_harvest_date;
      if (isBlank(cur.growth_stage) && !isBlank(above.growth_stage))
        patch.growth_stage = above.growth_stage;
      if (isBlank(cur.expected_volume) && !isBlank(above.expected_volume))
        patch.expected_volume = above.expected_volume;
    }

    if (Object.keys(patch).length === 0) return;
    update(cur.id, patch);
  };

  // Duplicate: insert a copy right below. farmer_id is kept when it was picked
  // (still set on this row) and stays null when the name was only typed.
  const duplicateRow = (index: number) => {
    const copy: Row = { ...rows[index], id: newRow().id };
    setRows((rs) => {
      const next = [...rs];
      next.splice(index + 1, 0, copy);
      return next;
    });
    requestAnimationFrame(() => focusCell(index + 1, 0));
  };

  // Map a pasted string onto a Select column's stored value. Accepts either the
  // stored value or the visible label (case-insensitive); unknown -> blank.
  const resolvePasteSelect = (col: number, raw: string): string => {
    const v = raw.trim();
    if (!v) return "";
    const low = v.toLowerCase();
    const opts =
      col === 4
        ? categories
        : col === 6
          ? statuses
          : col === 7
            ? VOLUME_OPTS
            : col === 10
              ? SEASON_OPTS
              : col === 11
                ? recordTypes
                : [];
    const hit = opts.find(
      (o) => o.value.toLowerCase() === low || o.label.toLowerCase() === low,
    );
    return hit ? hit.value : "";
  };

  const readCellPos = (target: HTMLElement): { r: number; c: number } | null => {
    const marker = target.closest?.("[data-row][data-col]");
    if (!marker) return null;
    const r = Number(marker.getAttribute("data-row"));
    const c = Number(marker.getAttribute("data-col"));
    if (Number.isNaN(r) || Number.isNaN(c)) return null;
    return { r, c };
  };

  const handleGridFocus = (e: FocusEvent<HTMLDivElement>) => {
    const pos = readCellPos(e.target as HTMLElement);
    if (!pos) return;
    setFocusedCell(pos);
  };

  const handleGridKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Fill down via Cmd/Ctrl+D.
    if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "d") {
      if (focusedCell) {
        e.preventDefault();
        fillDown(focusedCell.r, focusedCell.c);
      }
      return;
    }

    const pos = readCellPos(e.target as HTMLElement);
    if (!pos) return;
    const { r, c } = pos;

    if (e.key === "Tab") {
      // Fully control Tab so it moves between cells (the nav columns), wrapping
      // across rows and skipping disabled cells. Shift+Tab moves backwards.
      // Action buttons (Duplicate / Remove) sit outside the nav ring and stay
      // mouse-accessible.
      e.preventDefault();
      // Close the farmer popover so Tab never traps focus inside it.
      if (c === 0 && openFarmerRow) setOpenFarmerRow(null);
      const len = NAV_COLS.length;
      const navIdx = NAV_COLS.indexOf(c);
      const curIdx = r * len + navIdx;
      if (e.shiftKey) {
        if (curIdx > 0) focusFirstFocusable(curIdx - 1, -1);
        // At the very first cell, Shift+Tab stays put.
      } else if (curIdx < rows.length * len - 1) {
        focusFirstFocusable(curIdx + 1, 1);
      } else {
        // Tab on the last cell of the last row -> add a row and move to it.
        addRowAndFocus(NAV_COLS[0]);
      }
      return;
    }

    if (e.key === "Enter") {
      const tag = (e.target as HTMLElement).tagName;
      // Selects keep their normal behavior.
      if (tag === "SELECT") return;
      if (tag === "BUTTON") {
        // Farmer combobox trigger: close the popover and advance instead of
        // trapping focus. Shift+Enter moves backwards like Shift+Tab.
        e.preventDefault();
        if (openFarmerRow) setOpenFarmerRow(null);
        const len = NAV_COLS.length;
        const navIdx = NAV_COLS.indexOf(c);
        const curIdx = r * len + navIdx;
        if (e.shiftKey) {
          if (curIdx > 0) focusFirstFocusable(curIdx - 1, -1);
        } else if (curIdx < rows.length * len - 1) {
          focusFirstFocusable(curIdx + 1, 1);
        } else {
          addRowAndFocus(NAV_COLS[0]);
        }
        return;
      }
      e.preventDefault();
      const len = NAV_COLS.length;
      const navIdx = NAV_COLS.indexOf(c);
      const curIdx = r * len + navIdx;
      const below = curIdx + len;
      if (below < rows.length * len) {
        // Move to the same column in the next row, skipping disabled cells.
        if (!focusFirstFocusable(below, len)) focusCell(r + 1, c);
      } else {
        // Enter on the last row -> add a row, keeping the same column.
        addRowAndFocus(c);
      }
    }
  };

  const handleGridPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData("text/plain");
    // A single-cell paste (no tab/newline) keeps the browser default.
    if (!text || (!text.includes("\t") && !text.includes("\n"))) return;
    e.preventDefault();

    const startRow = focusedCell?.r ?? 0;
    const lines = text
      .split(/\r?\n/)
      .filter((l, i, arr) => !(l === "" && i === arr.length - 1));
    if (lines.length === 0) return;

    let contactIgnored = 0;

    setRows((rs) => {
      const next = [...rs];
      lines.forEach((line, li) => {
        const rowIdx = startRow + li;
        while (next.length <= rowIdx) next.push(newRow());
        const cells = line.split("\t");
        const row = next[rowIdx];
        const patch: Partial<Row> = {};
        // PASTE_COLS order (left to right): Farmer, Phone, Messenger,
        // Category, Commodity, Status, Volume, Price, Season, Record type,
        // Barangay, Notes (skips Contact OK and Unit).
        const [
          farmerRaw = "",
          phoneRaw = "",
          messengerRaw = "",
          categoryRaw = "",
          commodityRaw = "",
          statusRaw = "",
          volumeRaw = "",
          priceRaw = "",
          seasonRaw = "",
          recordTypeRaw = "",
          barangayRaw = "",
          notesRaw = "",
        ] = cells;

        // Farmer name: a pasted name never matches an existing farmer, so it
        // is always a new (typed) farmer — farmer_id stays null.
        const farmerName = farmerRaw.trim();
        patch.farmer_name = farmerName;
        patch.farmer_id = null;

        // Contact: pasted Phone/Messenger are kept only when Contact OK is
        // already ticked on that row; otherwise they are ignored (counted
        // below so the admin knows to tick first and paste again).
        if (row.contact_ok) {
          patch.phone = phoneRaw.trim();
          patch.messenger = messengerRaw.trim();
        } else if (phoneRaw.trim() !== "" || messengerRaw.trim() !== "") {
          contactIgnored++;
        }

        // Category + commodity group: a pasted category always travels with
        // its commodity (never under a different one). A lone pasted
        // commodity is kept only when both the pasted and the row category
        // match; unknown select values resolve to blank.
        const pastedCategory = resolvePasteSelect(4, categoryRaw);
        if (categoryRaw.trim() !== "") {
          patch.category = pastedCategory as Row["category"];
          patch.commodity = pastedCategory ? commodityRaw.trim() : "";
        } else if (
          commodityRaw.trim() !== "" &&
          row.category &&
          (!pastedCategory || pastedCategory === row.category)
        ) {
          patch.commodity = commodityRaw.trim();
        } else if (commodityRaw.trim() !== "") {
          patch.commodity = "";
        }

        patch.status = statusRaw.trim()
          ? (resolvePasteSelect(6, statusRaw) as Row["status"])
          : row.status;
        patch.volume = volumeRaw.trim()
          ? resolvePasteSelect(7, volumeRaw)
          : row.volume;
        patch.price = priceRaw.trim();
        patch.season = seasonRaw.trim()
          ? resolvePasteSelect(10, seasonRaw)
          : row.season;
        patch.record_type = recordTypeRaw.trim()
          ? (resolvePasteSelect(11, recordTypeRaw) as Row["record_type"]) ||
            row.record_type
          : row.record_type;
        patch.barangay = barangayRaw.trim();
        patch.notes = notesRaw.trim();

        next[rowIdx] = { ...row, ...patch };
      });
      return next;
    });

    if (contactIgnored > 0) {
      toast({
        title:
          lang === "fil"
            ? `Hindi isinama ang contact details sa ${contactIgnored} hilera. I-tick muna ang Contact OK, saka mag-paste ulit.`
            : `Contact details ignored for ${contactIgnored} rows. Tick Contact OK first, then paste again.`,
      });
    }
  };

  const area =
    [assigned_region, assigned_province, assigned_municipality].filter(Boolean).join(" · ") ||
    (lang === "fil" ? "Walang nakalaang lugar" : "No assigned area");

  // A row counts as empty when every data field is blank/unset; empty rows
  // are ignored (never invalid). See isAdminRowEmpty in lib/validateAdminRow.
  const isRowEmpty = (row: Row): boolean => isAdminRowEmpty(row);

  // Async lat/lng cache so we never hammer Nominatim: keyed by
  // "municipality|province". Filled at validation time; never shown as columns.
  const [geoCache, setGeoCache] = useState<Record<string, [number, number] | null>>({});
  const geoPending = useRef<Set<string>>(new Set());
  // `active` guard for the async geo callback below (avoids setState after
  // unmount).
  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);
  const requestGeo = (municipalityName: string, provinceName: string) => {
    const key = `${municipalityName}|${provinceName}`;
    if (key in geoCache || geoPending.current.has(key) || !municipalityName || !provinceName)
      return;
    geoPending.current.add(key);
    resolveAdminRowLatLng(municipalityName, provinceName)
      .then((coords) => {
        if (activeRef.current) setGeoCache((c) => ({ ...c, [key]: coords }));
      })
      .finally(() => {
        geoPending.current.delete(key);
      });
  };

  // --- Live row validation (no saving) -------------------------------------
  // Logic lives in lib/validateAdminRow so the JSX edits stay small. Maps a
  // grid row to the shared reportSchema the same way the Mag-ulat form builds
  // its candidate (ReportFormPage buildCandidate), then adds the admin-grid
  // rules: Farmer name, Barangay, location bar set, and area membership.
  // Returns per-field messages keyed by Row field name so the JSX can outline
  // cells and show reasons on hover/tap.
  type RowField =
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

  const validateRow = (row: Row): Partial<Record<RowField, string>> => {
    if (isRowEmpty(row)) return {};
    const rowMuni = adminRowMunicipality(row, municipality);
    const latLng = geoCache[`${rowMuni}|${province}`] ?? null;
    return validateAdminRow({
      row,
      location: { region, province, municipality },
      area: { isSuperAdmin, assigned_province, assigned_municipality },
      lang,
      latLng,
    }) as Partial<Record<RowField, string>>;
  };

  // Per-row validation status, computed after validateRow. Empty rows are
  // "empty" (ignored, never invalid); the summary counts only non-empty rows.
  type RowStatus = { state: "empty" | "valid" | "invalid"; errors: AdminRowErrors };
  const rowStatuses: RowStatus[] = useMemo(
    () =>
      rows.map((row) => {
        const empty = isRowEmpty(row);
        if (empty) return { state: "empty" as const, errors: {} };
        // Kick off geocoding at validation time (cached, province fallback).
        requestGeo(adminRowMunicipality(row, municipality), province);
        const errors = validateRow(row);
        return { state: adminRowState(errors, false), errors };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, region, province, municipality, geoCache, lang, isSuperAdmin, assigned_province, assigned_municipality],
  );
  const readyCount = rowStatuses.filter((s) => s.state === "valid").length;
  const fixCount = rowStatuses.filter((s) => s.state === "invalid").length;

  // Invalid-cell helper: red outline class + hover/tap reason for a cell.
  // Returns props to spread onto the cell's control (Input/SelectTrigger).
  // Handlers and data-row/data-col attributes are left untouched.
  const invalidCell = (
    errors: AdminRowErrors,
    field: RowField,
  ): { "aria-invalid": boolean; title?: string; "data-invalid"?: string } =>
    errors[field]
      ? { "aria-invalid": true, title: errors[field], "data-invalid": "true" }
      : { "aria-invalid": false };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-6">
        <p className="text-lg text-muted-foreground">
          {lang === "fil" ? "Nilo-load…" : "Loading…"}
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-6">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold">
            {lang === "fil" ? "Walang access" : "No access"}
          </h1>
          <p className="mb-6 text-muted-foreground">
            {lang === "fil"
              ? "Ang pahinang ito ay para lamang sa mga admin."
              : "This page is only available to admins."}
          </p>
          <Link to="/" className="text-primary underline hover:text-primary/90">
            {lang === "fil" ? "Bumalik sa Mapa" : "Back to the map"}
          </Link>
        </div>
      </div>
    );
  }

  // A non-super admin with no assigned region manages nothing: the grid is
  // disabled (nothing they could enter would be in their area).
  if (managesNothing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-6">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold">
            {lang === "fil" ? "Walang nakalaang lugar" : "No assigned area"}
          </h1>
          <p className="mb-6 text-muted-foreground">
            {lang === "fil"
              ? "Walang lugar na nakatalaga sa iyong account, kaya hindi ka makakapasok ng datos. Makipag-ugnayan sa super admin."
              : "Your account has no assigned area, so you cannot enter data. Please contact a super admin."}
          </p>
          <Link to="/" className="text-primary underline hover:text-primary/90">
            {lang === "fil" ? "Bumalik sa Mapa" : "Back to the map"}
          </Link>
        </div>
      </div>
    );
  }

  const statuses = [
    { value: "surplus", label: t("surplus") },
    { value: "balanced", label: t("balanced") },
    { value: "deficit", label: t("deficit") },
  ];
  const categories = CATEGORIES.map((c) => ({
    value: c.key,
    label: `${c.icon} ${lang === "fil" ? c.label : c.subLabel}`,
  }));
  const recordTypes = [
    { value: "current_supply", label: lang === "fil" ? "Kasalukuyang supply" : "Current supply" },
    { value: "planting_intention", label: lang === "fil" ? "Paparating (tanim)" : "Planting intention" },
  ];

  const L = {
    farmer: lang === "fil" ? "Pangalan ng Magsasaka" : "Farmer name",
    provinceHint:
      lang === "fil" ? "Pumili ng probinsya muna" : "Select a province first",
    region: lang === "fil" ? "Rehiyon" : "Region",
    province: lang === "fil" ? "Lalawigan" : "Province",
    municipality: lang === "fil" ? "Bayan/Munisipalidad" : "Municipality",
    contactOk: lang === "fil" ? "OK ang contact" : "Contact OK",
    phone: lang === "fil" ? "Telepono" : "Phone",
    messenger: lang === "fil" ? "Messenger" : "Messenger",
    category: t("category"),
    commodity: t("commodity"),
    status: t("status"),
    volume: t("volume"),
    price: t("price"),
    unit: lang === "fil" ? "Yunit" : "Unit",
    season: t("season"),
    recordType: lang === "fil" ? "Uri" : "Record type",
    barangay: t("barangay"),
    notes: t("notes"),
    planted: lang === "fil" ? "Petsa ng pagtatanim" : "Planted date",
    harvest: t("expectedHarvest"),
    growthStage: t("growthStage"),
    expectedVolume: t("expectedVolume"),
  };

  return (
    <div className="min-h-screen bg-muted p-4 md:p-6">
      <div className="mx-auto max-w-[1900px]">
        <h1 className="mb-1 text-2xl font-bold">
          {lang === "fil" ? "Admin · Pagpasok ng Datos" : "Admin · Data Entry"}
        </h1>
        <p className="mb-4 text-muted-foreground">
          {lang === "fil"
            ? "Isang hilera = isang report. Punan ang mga hanay; ang pag-save ay darating sa susunod na hakbang."
            : "One row = one report. Fill in the columns; saving comes in a later step."}
        </p>

        <div className="mb-4 grid gap-1 rounded-lg border bg-card p-4 text-sm sm:grid-cols-2">
          <div>
            {lang === "fil" ? "Tungkulin" : "Role"}:{" "}
            <span className="font-medium text-foreground">{role}</span>
          </div>
          <div>
            {lang === "fil" ? "Sakop na lugar" : "Assigned area"}:{" "}
            <span className="font-medium text-foreground">
              {isSuperAdmin
                ? lang === "fil"
                  ? "Lahat (super admin)"
                  : "All (super admin)"
                : area}
            </span>
          </div>
        </div>

        {/* Sticky location bar: Region > Province > Municipality (cascading).
            Every row inherits these values; a row may override the municipality
            by picking a farmer from a different one. */}
        <div className="sticky top-0 z-20 mb-3 rounded-lg border bg-card p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{L.region}</span>
              <Select
                value={region || EMPTY}
                onValueChange={(v) => changeRegion(v === EMPTY ? "" : v)}
                disabled={!isSuperAdmin}
              >
                <SelectTrigger className={CELL_TRIGGER}>
                  <SelectValue placeholder={L.region} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY}>{L.region}</SelectItem>
                  {regionOptions.map((r) => (
                    <SelectItem key={r.code} value={r.name}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{L.province}</span>
              <Select
                value={province || EMPTY}
                onValueChange={(v) => changeProvince(v === EMPTY ? "" : v)}
                disabled={isSuperAdmin ? false : !!assigned_province}
              >
                <SelectTrigger className={CELL_TRIGGER}>
                  <SelectValue placeholder={L.province} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY}>{L.province}</SelectItem>
                  {provinceOptions.map((p) => (
                    <SelectItem key={p.code} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {L.municipality}
              </span>
              <Select
                value={municipality || EMPTY}
                onValueChange={(v) => setMunicipality(v === EMPTY ? "" : v)}
                disabled={isSuperAdmin ? false : !!assigned_municipality}
              >
                <SelectTrigger className={CELL_TRIGGER}>
                  <SelectValue placeholder={L.municipality} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY}>{L.municipality}</SelectItem>
                  {municipalityOptions.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {rows.length}{" "}
            {lang === "fil" ? "hilera" : rows.length === 1 ? "row" : "rows"}
            {" · "}
            {lang === "fil"
              ? `${readyCount} handa na, ${fixCount} kailangang ayusin`
              : `${readyCount} ready, ${fixCount} need fixing`}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              disabled={!focusedCell || focusedCell.r === 0}
              onClick={() =>
                focusedCell && fillDown(focusedCell.r, focusedCell.c)
              }
            >
              <ArrowDownToLine className="h-4 w-4" />
              {lang === "fil" ? "Kopya pababa" : "Fill down"}
            </Button>
            <Button onClick={addRow} className="min-h-[44px]">
              <Plus className="h-4 w-4" />
              {lang === "fil" ? "Magdagdag ng hilera" : "Add row"}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
            <div
              ref={gridRef}
              className="space-y-2 p-2"
              onKeyDown={handleGridKeyDown}
              onPaste={handleGridPaste}
              onFocus={handleGridFocus}
            >
              {rows.map((row, rowIndex) => {
                const rowErrs = rowStatuses[rowIndex]?.errors ?? {};
                const meta = getPriceMeta(row.category, row.commodity);
                const subcats = row.category
                  ? getCategoryDef(row.category as CategoryKey).subcategories
                  : [];
                const isPlanting = row.record_type === "planting_intention";
                // Same category-keyed options/labels as the Mag-ulat form, so the
                // stored growth_stage values and date labels stay identical.
                const stageOptions =
                  STAGE_BY_CATEGORY[row.category] ?? STAGE_BY_CATEGORY.other;
                const dateLabels =
                  DATE_LABELS[row.category] ?? DATE_LABELS.other;
                return (
                  <div
                    key={row.id}
                    data-idx={rowIndex}
                    className="relative flex gap-2 rounded-md border bg-background p-2 pt-14"
                  >
                    {/* Status dot slot: fixed-width flex slot, first child of
                        the record card. Green = ready, red = needs fixing
                        (reasons in title), dashed = empty row. */}
                    <div className="flex w-6 shrink-0 items-start justify-center pt-1">
                      {(() => {
                        const st = rowStatuses[rowIndex];
                        if (!st || st.state === "empty") {
                          return (
                            <div
                              aria-hidden="true"
                              className="h-4 w-4 rounded-full border border-dashed border-muted-foreground/40"
                            />
                          );
                        }
                        const reasons = Object.values(st.errors).join(" • ");
                        return (
                          <div
                            role="img"
                            aria-label={
                              st.state === "valid"
                                ? lang === "fil"
                                  ? "Handa na"
                                  : "Ready"
                                : lang === "fil"
                                  ? "Kailangang ayusin"
                                  : "Needs fixing"
                            }
                            title={reasons || undefined}
                            className={`h-4 w-4 rounded-full ${
                              st.state === "valid" ? "bg-emerald-500" : "bg-destructive"
                            }`}
                          />
                        );
                      })()}
                    </div>
                    <div className="grid min-w-0 flex-1 grid-cols-12 items-end gap-2">
                      {/* Farmer name — autocomplete over existing farmers.
                          Resolves the pick by id (never by name) so duplicate
                          names can't be confused. Disabled until a province is
                          chosen (the farmer query is province-scoped). */}
                      <div className="relative col-span-12 flex flex-col gap-1 sm:col-span-6 lg:col-span-3">
                        <span className="text-xs text-muted-foreground">{L.farmer}</span>
                        <Popover
                          open={openFarmerRow === row.id}
                          onOpenChange={(o) => setOpenFarmerRow(o ? row.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              data-row={rowIndex} data-col={0}
                              disabled={!province}
                              {...invalidCell(rowErrs, "farmer_name")}
                              className={`flex min-h-[48px] w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-base disabled:cursor-not-allowed disabled:opacity-50${rowErrs.farmer_name ? " border-destructive ring-2 ring-destructive/40" : ""}`}
                              title={rowErrs.farmer_name ?? (!province ? L.provinceHint : undefined)}
                            >
                              <span className="truncate">
                                {row.farmer_name || (
                                  <span className="text-muted-foreground">
                                    {farmersLoading
                                      ? "…"
                                      : !province
                                        ? L.provinceHint
                                        : L.farmer}
                                  </span>
                                )}
                              </span>
                              {row.farmer_id && (
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  ✓
                                </span>
                              )}
                              {row.farmer_name && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    update(row.id, {
                                      farmer_name: "",
                                      ...clearedByPick(row),
                                    });
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      update(row.id, {
                                        farmer_name: "",
                                        ...clearedByPick(row),
                                      });
                                    }
                                  }}
                                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                                  aria-label={
                                    lang === "fil"
                                      ? "Alisin ang magsasaka"
                                      : "Clear farmer"
                                  }
                                  title={
                                    lang === "fil" ? "Alisin" : "Clear"
                                  }
                                >
                                  <X className="h-4 w-4" />
                                </span>
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[320px] p-0"
                            align="start"
                            onOpenAutoFocus={(e) => {
                              // Focus the input so the combobox is keyboard-ready.
                              e.preventDefault();
                              farmerInputRef.current?.focus();
                            }}
                            onCloseAutoFocus={(e) => {
                              // We move focus manually after a pick / Tab, so stop
                              // Radix from yanking it back to the trigger button.
                              e.preventDefault();
                            }}
                          >
                            <Command shouldFilter={false}>
                              <CommandInput
                                ref={farmerInputRef}
                                placeholder={L.farmer}
                                value={row.farmer_name}
                                onValueChange={(v) => {
                                  // Typing after a pick un-links the farmer: keep
                                  // the typed name but drop everything the pick
                                  // filled in, so farmer_id never mismatches it.
                                  update(row.id, {
                                    farmer_name: v,
                                    farmer_id: null,
                                    ...(row.farmer_id ? clearedByPick(row) : {}),
                                  });
                                }}
                                onKeyDown={(e) => {
                                  // Never let Tab/Enter trap focus inside the
                                  // popover — close it and move into the grid.
                                  // Enter with suggestions present is left to
                                  // cmdk so it selects the highlighted option.
                                  if (e.key === "Tab") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOpenFarmerRow(null);
                                    if (e.shiftKey) {
                                      // Shift+Tab stays in the same row.
                                      if (rowIndex > 0)
                                        focusCell(rowIndex - 1, NAV_COLS[NAV_COLS.length - 1]);
                                      else focusCell(rowIndex, 0);
                                    } else {
                                      focusCell(rowIndex, NAV_COLS[1]);
                                    }
                                  } else if (
                                    e.key === "Enter" &&
                                    farmerSuggestions(row).length === 0
                                  ) {
                                    // Nothing highlighted to select -> treat Enter
                                    // like Tab (close + move on).
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOpenFarmerRow(null);
                                    focusCell(rowIndex, NAV_COLS[1]);
                                  }
                                  // With suggestions present, Enter is left to cmdk
                                  // so it selects the highlighted option.
                                }}
                              />
                              <CommandList>
                                {farmerSuggestions(row).length === 0 ? (
                                  <CommandEmpty>
                                    {lang === "fil"
                                      ? "Wala pang magsasaka. I-type ang pangalan para magdagdag."
                                      : "No farmers yet. Type a name to add a new one."}
                                  </CommandEmpty>
                                ) : (
                                  <CommandGroup>
                                    {farmerSuggestions(row).map((f) => (
                                      <CommandItem
                                        key={f.id}
                                        value={f.id}
                                        onSelect={() => {
                                          pickFarmer(row, f);
                                          setOpenFarmerRow(null);
                                          // Continue the keyboard flow into the
                                          // next cell after picking a farmer.
                                          focusCell(rowIndex, NAV_COLS[1]);
                                        }}
                                      >
                                        {farmerLabel(f)}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      {/* Contact OK */}
                      <div className="col-span-12 flex min-h-[48px] flex-col gap-1 sm:col-span-6 lg:col-span-1" data-row={rowIndex} data-col={1}>
                        <span className="text-xs text-muted-foreground">{L.contactOk}</span>
                        <Checkbox
                          className="h-11 w-11"
                          checked={row.contact_ok}
                          onCheckedChange={(v) => toggleContact(row, v === true)}
                          aria-label={L.contactOk}
                        />
                      </div>
                      {/* Phone */}
                      <div className="col-span-12 flex flex-col gap-1 sm:col-span-6 lg:col-span-2">
                        <span className="text-xs text-muted-foreground">{L.phone}</span>
                        <Input
                        data-row={rowIndex} data-col={2}
                        className={CELL_INPUT + INVALID_RING}
                        {...invalidCell(rowErrs, "phone")}
                        placeholder="09xx…"
                        inputMode="tel"
                        disabled={!row.contact_ok}
                        value={row.phone}
                        onChange={(e) => update(row.id, { phone: e.target.value })}
                      />
                      </div>
                      {/* Messenger */}
                      <div className="col-span-12 flex flex-col gap-1 sm:col-span-6 lg:col-span-2">
                        <span className="text-xs text-muted-foreground">{L.messenger}</span>
                        <Input
                        data-row={rowIndex} data-col={3}
                        className={CELL_INPUT + INVALID_RING}
                        {...invalidCell(rowErrs, "messenger")}
                        placeholder="username"
                        disabled={!row.contact_ok}
                        value={row.messenger}
                        onChange={(e) => update(row.id, { messenger: e.target.value })}
                      />
                      </div>
                      {/* Category */}
                      <div className="col-span-12 flex flex-col gap-1 sm:col-span-6 lg:col-span-2">
                        <span className="text-xs text-muted-foreground">{L.category}</span>
                        <Select
                        value={row.category || EMPTY}
                        onValueChange={(v) =>
                          update(row.id, {
                            category: (v === EMPTY ? "" : v) as CategoryKey | "",
                            commodity: "",
                          })
                        }
                      >
                        <SelectTrigger className={CELL_TRIGGER + INVALID_RING} data-row={rowIndex} data-col={4} {...invalidCell(rowErrs, "category")}>
                          <SelectValue placeholder={L.category} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={EMPTY}>{L.category}</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      </div>
                      {/* Commodity (autocomplete + free text) */}
                      <div className="col-span-12 flex flex-col gap-1 sm:col-span-6 lg:col-span-2">
                        <span className="text-xs text-muted-foreground">{L.commodity}</span>
                        <Input
                          data-row={rowIndex} data-col={5}
                          className={CELL_INPUT + INVALID_RING}
                          {...invalidCell(rowErrs, "commodity")}
                          list={`commodity-${row.id}`}
                          placeholder={L.commodity}
                          value={row.commodity}
                          onChange={(e) => update(row.id, { commodity: e.target.value })}
                        />
                        <datalist id={`commodity-${row.id}`}>
                          {subcats.map((s) => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      </div>
                      {/* Status */}
                      <div className="col-span-12 flex flex-col gap-1 sm:col-span-6 lg:col-span-2">
                        <span className="text-xs text-muted-foreground">{L.status}</span>
                      <Select
                        value={row.status || EMPTY}
                        onValueChange={(v) =>
                          update(row.id, {
                            status: (v === EMPTY ? "" : v) as Row["status"],
                          })
                        }
                      >
                        <SelectTrigger className={CELL_TRIGGER + INVALID_RING} data-row={rowIndex} data-col={6} {...invalidCell(rowErrs, "status")}>
                          <SelectValue placeholder={L.status} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={EMPTY}>{L.status}</SelectItem>
                          {statuses.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      </div>
                      {/* Volume */}
                      <div className="col-span-12 flex flex-col gap-1 sm:col-span-6 lg:col-span-1">
                        <span className="text-xs text-muted-foreground">{L.volume}</span>
                      <Select
                        value={row.volume || EMPTY}
                        onValueChange={(v) =>
                          update(row.id, { volume: v === EMPTY ? "" : v })
                        }
                      >
                        <SelectTrigger className={CELL_TRIGGER + INVALID_RING} data-row={rowIndex} data-col={7} {...invalidCell(rowErrs, "volume")}>
                          <SelectValue placeholder={L.volume} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={EMPTY}>{L.volume}</SelectItem>
                          {VOLUME_OPTS.map((v) => (
                            <SelectItem key={v.value} value={v.value}>
                              {v.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      </div>
                      {/* Price */}
                      <div className="col-span-12 flex flex-col gap-1 sm:col-span-6 lg:col-span-1">
                        <span className="text-xs text-muted-foreground">{L.price}</span>
                      <Input
                        data-row={rowIndex} data-col={8}
                        className={CELL_INPUT + INVALID_RING}
                        {...invalidCell(rowErrs, "price")}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        placeholder="₱"
                        value={row.price}
                        onChange={(e) => update(row.id, { price: e.target.value })}
                      />
                      </div>
                      {/* Unit (auto, read-only) */}
                      <div className="col-span-12 flex flex-col gap-1 sm:col-span-6 lg:col-span-1">
                        <span className="text-xs text-muted-foreground">{L.unit}</span>
                      <div
                        className="flex min-h-[48px] items-center justify-center rounded-md border border-dashed bg-muted/40 px-2 text-sm text-muted-foreground"
                        title={meta.label}
                      >
                        {meta.unit}
                      </div>
                      </div>
                      {/* Season */}
                      <div className="col-span-12 flex flex-col gap-1 sm:col-span-6 lg:col-span-1">
                        <span className="text-xs text-muted-foreground">{L.season}</span>
                      <Select
                        value={row.season || EMPTY}
                        onValueChange={(v) =>
                          update(row.id, { season: v === EMPTY ? "" : v })
                        }
                      >
                        <SelectTrigger className={CELL_TRIGGER + INVALID_RING} data-row={rowIndex} data-col={10} {...invalidCell(rowErrs, "season")}>
                          <SelectValue placeholder={L.season} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={EMPTY}>{L.season}</SelectItem>
                          {SEASON_OPTS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      </div>
                      {/* Record type */}
                      <div className="col-span-12 flex flex-col gap-1 sm:col-span-6 lg:col-span-2">
                        <span className="text-xs text-muted-foreground">{L.recordType}</span>
                      <Select
                        value={row.record_type}
                        onValueChange={(v) =>
                          update(row.id, { record_type: v as RecordType })
                        }
                      >
                        <SelectTrigger className={CELL_TRIGGER + INVALID_RING} data-row={rowIndex} data-col={11} {...invalidCell(rowErrs, "record_type")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {recordTypes.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      </div>
                      {/* Barangay (plain text) */}
                      <div className="col-span-12 flex flex-col gap-1 sm:col-span-6 lg:col-span-2">
                        <span className="text-xs text-muted-foreground">{L.barangay}</span>
                      <Input
                        data-row={rowIndex} data-col={12}
                        className={CELL_INPUT + INVALID_RING}
                        {...invalidCell(rowErrs, "barangay")}
                        placeholder={L.barangay}
                        value={row.barangay}
                        onChange={(e) => update(row.id, { barangay: e.target.value })}
                      />
                      </div>
                      {/* Notes */}
                      <div className="col-span-12 flex flex-col gap-1 sm:col-span-6 lg:col-span-2">
                        <span className="text-xs text-muted-foreground">{L.notes}</span>
                      <Input
                        data-row={rowIndex} data-col={13}
                        className={CELL_INPUT + INVALID_RING}
                        {...invalidCell(rowErrs, "notes")}
                        placeholder={L.notes}
                        value={row.notes}
                        onChange={(e) => update(row.id, { notes: e.target.value })}
                      />
                      </div>
                      {/* Duplicate + Fill row down + Remove (top-right corner) */}
                      <div className="absolute right-2 top-2 flex items-center gap-1">
                        {rowIndex > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11"
                            onClick={() => fillRowDown(rowIndex)}
                            aria-label={
                              lang === "fil"
                                ? "Punan mula sa hilera sa itaas"
                                : "Fill from row above"
                            }
                            title={lang === "fil" ? "Punan pababa" : "Fill down"}
                          >
                            <ArrowDownToLine className="h-5 w-5" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11"
                          onClick={() => duplicateRow(rowIndex)}
                          aria-label={
                            lang === "fil"
                              ? "Kopyahin ang hilera"
                              : "Duplicate row"
                          }
                          title={lang === "fil" ? "Kopyahin" : "Duplicate"}
                        >
                          <Copy className="h-5 w-5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 text-destructive hover:text-destructive"
                          onClick={() => removeRow(row.id)}
                          aria-label={
                            lang === "fil" ? "Alisin ang hilera" : "Remove row"
                          }
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    {/* Planting-intention second line */}
                    {isPlanting && (
                      <div className="mt-2 grid grid-cols-2 gap-2 border-t pt-2 sm:grid-cols-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">
                            {dateLabels.start} *
                          </span>
                          <Input
                            className={CELL_INPUT + INVALID_RING}
                            {...invalidCell(rowErrs, "planted_date")}
                            type="date"
                            value={row.planted_date}
                            onChange={(e) =>
                              update(row.id, { planted_date: e.target.value })
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">
                            {dateLabels.end} *
                          </span>
                          <Input
                            className={CELL_INPUT + INVALID_RING}
                            {...invalidCell(rowErrs, "expected_harvest_date")}
                            type="date"
                            value={row.expected_harvest_date}
                            onChange={(e) =>
                              update(row.id, {
                                expected_harvest_date: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">
                            {L.growthStage}
                          </span>
                          <Select
                            value={row.growth_stage || EMPTY}
                            onValueChange={(v) =>
                              update(row.id, { growth_stage: v === EMPTY ? "" : v })
                            }
                          >
                            <SelectTrigger className={CELL_TRIGGER}>
                              <SelectValue placeholder={L.growthStage} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={EMPTY}>{L.growthStage}</SelectItem>
                              {stageOptions.map((g) => (
                                <SelectItem key={g.value} value={g.value}>
                                  {g.icon} {g.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">
                            {L.expectedVolume}
                          </span>
                          <Input
                            className={CELL_INPUT}
                            placeholder={L.expectedVolume}
                            value={row.expected_volume}
                            onChange={(e) =>
                              update(row.id, { expected_volume: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
  );
};

export default AdminDataEntry;
