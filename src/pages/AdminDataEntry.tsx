import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useAdminAccess } from "@/lib/profile";
import { VOLUME_VALUES, type RecordType } from "@/lib/reportSchema";
import {
  CATEGORIES,
  getCategoryDef,
  getPriceMeta,
  type CategoryKey,
} from "@/lib/categories";
import { STAGE_BY_CATEGORY, DATE_LABELS } from "@/lib/formOptions";
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

/** One spreadsheet row = one agri_report to be saved later. */
interface Row {
  id: string;
  farmer_name: string;
  contact_ok: boolean;
  phone: string;
  messenger: string;
  category: CategoryKey | "";
  commodity: string;
  status: "surplus" | "deficit" | "balanced";
  volume: string;
  price: string;
  season: string;
  record_type: RecordType;
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

// Column template shared by the header row and every data row so they align.
const MAIN_TEMPLATE =
  "190px 84px 140px 150px 150px 150px 120px 150px 110px 84px 120px 170px 150px 220px 56px";

const CELL_INPUT = "min-h-[48px] w-full text-base";
const CELL_TRIGGER = "min-h-[48px] w-full text-base";

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

  const area =
    [assigned_region, assigned_province, assigned_municipality].filter(Boolean).join(" · ") ||
    (lang === "fil" ? "Walang nakalaang lugar" : "No assigned area");

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

        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {rows.length}{" "}
            {lang === "fil" ? "hilera" : rows.length === 1 ? "row" : "rows"}
          </div>
          <Button onClick={addRow} className="min-h-[44px]">
            <Plus className="h-4 w-4" />
            {lang === "fil" ? "Magdagdag ng hilera" : "Add row"}
          </Button>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <div className="min-w-max space-y-2 p-2">
              {/* Header */}
              <div
                className="grid items-center gap-2 px-2 pb-1 text-xs font-medium text-muted-foreground"
                style={{ gridTemplateColumns: MAIN_TEMPLATE }}
              >
                <div>{L.farmer}</div>
                <div className="text-center">{L.contactOk}</div>
                <div>{L.phone}</div>
                <div>{L.messenger}</div>
                <div>{L.category}</div>
                <div>{L.commodity}</div>
                <div>{L.status}</div>
                <div>{L.volume}</div>
                <div>{L.price}</div>
                <div>{L.unit}</div>
                <div>{L.season}</div>
                <div>{L.recordType}</div>
                <div>{L.barangay}</div>
                <div>{L.notes}</div>
                <div />
              </div>

              {rows.map((row) => {
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
                    className="rounded-md border bg-background p-2"
                  >
                    <div
                      className="grid items-center gap-2"
                      style={{ gridTemplateColumns: MAIN_TEMPLATE }}
                    >
                      {/* Farmer name */}
                      <Input
                        className={CELL_INPUT}
                        placeholder={L.farmer}
                        value={row.farmer_name}
                        onChange={(e) => update(row.id, { farmer_name: e.target.value })}
                      />
                      {/* Contact OK */}
                      <div className="flex justify-center">
                        <Checkbox
                          className="h-6 w-6"
                          checked={row.contact_ok}
                          onCheckedChange={(v) => toggleContact(row, v === true)}
                          aria-label={L.contactOk}
                        />
                      </div>
                      {/* Phone */}
                      <Input
                        className={CELL_INPUT}
                        placeholder="09xx…"
                        inputMode="tel"
                        disabled={!row.contact_ok}
                        value={row.phone}
                        onChange={(e) => update(row.id, { phone: e.target.value })}
                      />
                      {/* Messenger */}
                      <Input
                        className={CELL_INPUT}
                        placeholder="username"
                        disabled={!row.contact_ok}
                        value={row.messenger}
                        onChange={(e) => update(row.id, { messenger: e.target.value })}
                      />
                      {/* Category */}
                      <Select
                        value={row.category || EMPTY}
                        onValueChange={(v) =>
                          update(row.id, {
                            category: (v === EMPTY ? "" : v) as CategoryKey | "",
                            commodity: "",
                          })
                        }
                      >
                        <SelectTrigger className={CELL_TRIGGER}>
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
                      {/* Commodity (autocomplete + free text) */}
                      <div>
                        <Input
                          className={CELL_INPUT}
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
                      <Select
                        value={row.status}
                        onValueChange={(v) =>
                          update(row.id, { status: v as Row["status"] })
                        }
                      >
                        <SelectTrigger className={CELL_TRIGGER}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Volume */}
                      <Select
                        value={row.volume || EMPTY}
                        onValueChange={(v) =>
                          update(row.id, { volume: v === EMPTY ? "" : v })
                        }
                      >
                        <SelectTrigger className={CELL_TRIGGER}>
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
                      {/* Price */}
                      <Input
                        className={CELL_INPUT}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        placeholder="₱"
                        value={row.price}
                        onChange={(e) => update(row.id, { price: e.target.value })}
                      />
                      {/* Unit (auto, read-only) */}
                      <div
                        className="flex min-h-[48px] items-center justify-center rounded-md border border-dashed bg-muted/40 px-2 text-sm text-muted-foreground"
                        title={meta.label}
                      >
                        {meta.unit}
                      </div>
                      {/* Season */}
                      <Select
                        value={row.season || EMPTY}
                        onValueChange={(v) =>
                          update(row.id, { season: v === EMPTY ? "" : v })
                        }
                      >
                        <SelectTrigger className={CELL_TRIGGER}>
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
                      {/* Record type */}
                      <Select
                        value={row.record_type}
                        onValueChange={(v) =>
                          update(row.id, { record_type: v as RecordType })
                        }
                      >
                        <SelectTrigger className={CELL_TRIGGER}>
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
                      {/* Barangay (plain text) */}
                      <Input
                        className={CELL_INPUT}
                        placeholder={L.barangay}
                        value={row.barangay}
                        onChange={(e) => update(row.id, { barangay: e.target.value })}
                      />
                      {/* Notes */}
                      <Input
                        className={CELL_INPUT}
                        placeholder={L.notes}
                        value={row.notes}
                        onChange={(e) => update(row.id, { notes: e.target.value })}
                      />
                      {/* Remove */}
                      <div className="flex justify-center">
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
                            className={CELL_INPUT}
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
                            className={CELL_INPUT}
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
    </div>
  );
};

export default AdminDataEntry;
