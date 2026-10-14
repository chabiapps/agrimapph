import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { reportSchema, type RecordType } from "@/lib/reportSchema";
import { ChevronDown, Send } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useLang } from "@/lib/i18n";
import { MAG_ULAT_FORM_ID } from "@/lib/routes";
import type { ProgressStep } from "@/components/ReportProgressCard";
import { CATEGORIES, CategoryKey, getCommodityIcon, getPriceMeta, PRICE_UNITS, PriceUnit } from "@/lib/categories";
import LocationDropdowns, { LocationValue } from "@/components/LocationDropdowns";
import MapPreview from "@/components/MapPreview";
import { geocodeMunicipality, getProvinceCenter } from "@/lib/geoCoords";
import { STAGE_BY_CATEGORY, DATE_LABELS } from "@/lib/formOptions";

interface Props {
  onSubmitted?: (recordType?: "current_supply" | "planting_intention") => void;
  /**
   * Live per-step completion, pushed to the sidebar progress card. Owned here
   * (the form holds all field state) and forwarded via ReportTabGate → Index.
   */
  onProgress?: (steps: ProgressStep[]) => void;
}

// Report validation now lives in @/lib/reportSchema (shared with the admin
// data-entry grid). reportSchema and RecordType are imported above so the
// Mag-ulat form behaves exactly as before.

const todayStr = () => new Date().toISOString().slice(0, 10);


type FieldErrors = Record<string, string>;

const VOLUME_OPTIONS = [
  { value: "Napakataas", label: "Napakataas", sub: "Very High" },
  { value: "Mataas", label: "Mataas", sub: "High" },
  { value: "Katamtaman", label: "Katamtaman", sub: "Medium" },
  { value: "Mababa", label: "Mababa", sub: "Low" },
];

const emptyLocation = (): LocationValue => ({
  region: "", province: "", municipality: "", barangay: "",
  provinceCode: "", municipalityCode: "",
});

/**
 * Numbered section heading. The badge + title + subtext are a desktop-only
 * enhancement (hidden below md:) — on mobile the form's existing plain
 * "Hakbang N:" labels render unchanged, so the mobile view is untouched.
 *
 * Defined at MODULE scope (not inside the component): a component defined in
 * the render body gets a new type every render, which remounts its whole
 * subtree — that visibly kicked focus out of open dropdowns inside step cards
 * whenever a background update re-rendered the page.
 */
const StepHeading = ({ n, title, hint }: { n: number; title: string; hint?: string }) => (
  <div className="hidden md:flex items-start gap-3">
    <span
      aria-hidden
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#16a34a] text-sm font-extrabold text-white"
    >
      {n}
    </span>
    <span>
      <span className="block text-base font-extrabold text-foreground">{title}</span>
      {hint && <span className="mt-0.5 block text-sm text-muted-foreground">{hint}</span>}
    </span>
  </div>
);

/**
 * Bordered card shell for a step's fields. ALL visual styles are md:-prefixed,
 * so on mobile this is a plain unstyled div and the form renders exactly as
 * before. Inner wrappers replicate the form's base gaps (see each usage) so
 * mobile spacing is pixel-identical. Module scope for the same remount reason
 * as StepHeading.
 */
const StepCard = ({ children }: { children: ReactNode }) => (
  <div className="md:rounded-2xl md:border md:border-[#e5e7eb] md:bg-white md:p-5 md:shadow-sm">
    {children}
  </div>
);

const ReportFormPage = ({ onSubmitted, onProgress }: Props) => {
  const { t } = useLang();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [recordType, setRecordType] = useState<RecordType>("current_supply");
  const [category, setCategory] = useState<CategoryKey>("crops");
  const [location, setLocation] = useState<LocationValue>(emptyLocation());
  const [volumeError, setVolumeError] = useState(false);
  const [locErrors, setLocErrors] = useState<{ region?: string; province?: string; municipality?: string; barangay?: string }>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    commodity: "",
    price: "",
    status: "balanced",
    lat: "12.8797",
    lng: "121.774",
    notes: "",
    planted_date: todayStr(),
    expected_harvest_date: "",
    expected_volume: "",
    volume_level: "",
    growth_stage: "",
    date_caught: todayStr(),
    heads: "",
    weight: "",
    reporter_name: "",
    reporter_contact: "",
    phone_number: "",
    messenger_username: "",
  });

  const update = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setFieldErrors((prev) => {
      if (!prev[k]) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  const FieldError = ({ field }: { field: string }) =>
    fieldErrors[field] ? (
      <p className="text-sm text-destructive font-medium" role="alert">{fieldErrors[field]}</p>
    ) : null;

  /** Strip URLs, @, spaces and any invalid characters from a Messenger handle. */
  const sanitizeMessenger = (raw: string) => {
    let v = (raw ?? "").trim();
    v = v.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    v = v.replace(/^(m\.me|facebook\.com|fb\.com|messenger\.com)\//i, "");
    v = v.split(/[?#]/)[0];
    v = v.split("/").filter(Boolean)[0] ?? "";
    v = v.replace(/@/g, "").replace(/\s+/g, "");
    return v.replace(/[^A-Za-z0-9._-]/g, "");
  };

  // Coordinate resolution: dropdown lookup, overridden only by GPS / manual pin drag
  const [coordSource, setCoordSource] = useState<"none" | "province" | "municipality" | "gps" | "manual">("none");
  const [geoLoading, setGeoLoading] = useState(false);
  const gpsLocked = useRef(false);

  const setCoords = (lat: number, lng: number, source: typeof coordSource) => {
    setForm((f) => ({ ...f, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
    setCoordSource(source);
  };

  useEffect(() => {
    if (gpsLocked.current) return;
    const { province, municipality } = location;
    if (!province) return;

    const center = getProvinceCenter(province);
    if (!municipality) {
      if (center) setCoords(center[0], center[1], "province");
      return;
    }

    let cancelled = false;
    setGeoLoading(true);
    geocodeMunicipality(municipality, province)
      .then((coords) => {
        if (cancelled || gpsLocked.current) return;
        if (coords) setCoords(coords[0], coords[1], "municipality");
        else if (center) setCoords(center[0], center[1], "province");
      })
      .finally(() => { if (!cancelled) setGeoLoading(false); });

    return () => { cancelled = true; };
  }, [location.province, location.municipality]);


  const isPlanting = recordType === "planting_intention";
  const subOptions = useMemo(
    () => CATEGORIES.find((c) => c.key === category)?.subcategories ?? [],
    [category]
  );

  const priceMeta = useMemo(
    () => getPriceMeta(category, form.commodity),
    [category, form.commodity]
  );

  /**
   * Status options for the Kalagayan dropdown — same emoji + label pattern as
   * the ListStats "Lahat ng Status" filter (🟢 Sobra / 🟡 Sapat / 🔴 Kulang),
   * with the bilingual t() label the form already used.
   */
  const STATUS_OPTIONS = useMemo(() => [
    { value: "surplus", icon: "🟢", label: `${t("surplus")} (Surplus)` },
    { value: "balanced", icon: "🟡", label: `${t("balanced")} (Balanced)` },
    { value: "deficit", icon: "🔴", label: `${t("deficit")} (Deficit)` },
  ], [t]);
  const [unitOverride, setUnitOverride] = useState<PriceUnit | null>(null);
  const priceUnit: PriceUnit = unitOverride ?? priceMeta.unit;

  const weeksFromNow = useMemo(() => {
    if (!form.expected_harvest_date) return null;
    const diff = new Date(form.expected_harvest_date).getTime() - Date.now();
    if (isNaN(diff)) return null;
    return Math.round(diff / (1000 * 60 * 60 * 24 * 7));
  }, [form.expected_harvest_date]);

  const changeCategory = (k: CategoryKey) => {
    setCategory(k);
    setUnitOverride(null);
    update("commodity", "");
    update("growth_stage", "");
  };

  /**
   * The exact object submit validation runs against — extracted so both
   * handleSubmit AND the live progress memo below validate the same values.
   * Progress reuses real validation state (no second rule set): the memo runs
   * this candidate through reportSchema.safeParse and maps each error path to
   * its numbered step, so the sidebar reflects genuine completion.
   */
  const buildCandidate = useCallback(() => ({
    record_type: recordType,
    category,
    commodity: form.commodity,
    volume_level: form.volume_level,
    status: form.status,
    price: form.price,
    ...location,
    lat: form.lat.trim() === "" ? "0" : form.lat,
    lng: form.lng.trim() === "" ? "0" : form.lng,
    planted_date: form.planted_date,
    expected_harvest_date: form.expected_harvest_date,
    notes: form.notes,
  }), [recordType, category, form, location]);

  /**
   * Live per-step completion for the sidebar "Progreso ng Ulat" card. One
   * safeParse per render over the same candidate the submit handler validates;
   * each step is done iff none of that step's required fields appear in the
   * error list. Steps 5 (contact) and 6 (notes) have no required fields in the
   * schema — they count as done once any prior content exists, else pending.
   * Numbered 1–6 to match the StepHeading badges above.
   */
  const progressSteps: ProgressStep[] = useMemo(() => {
    const errFields = new Set<string>();
    const parsed = reportSchema.safeParse(buildCandidate());
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key) errFields.add(key);
      }
    }
    const has = (keys: string[]) => keys.every((k) => !errFields.has(k));
    const step1 = category.trim() !== "";
    const step2 = has(["commodity"]);
    const step3 = isPlanting
      ? has(["planted_date", "expected_harvest_date", "volume_level"])
      : has(["price", "volume_level", "status"]);
    const step4 = has(["region", "province", "municipality", "barangay", "lat", "lng"]);
    const filledSomething = step1 || step2 || step3 || step4;
    // Contact + notes are schema-optional: they read as done once the user has
    // started the report (any prior step valid), otherwise pending.
    const step5 = filledSomething;
    const step6 = filledSomething;
    return isPlanting
      ? [
          { en: "Category", fil: "Uri", done: step1 },
          { en: "Product", fil: "Produkto", done: step2 },
          { en: "Planting details", fil: "Detalye ng Itinanim", done: step3 },
          { en: "Location", fil: "Lokasyon", done: step4 },
          { en: "Contact", fil: "Makipag-ugnayan", done: step5 },
          { en: "Notes", fil: "Mga Tala", done: step6 },
        ]
      : [
          { en: "Category", fil: "Uri", done: step1 },
          { en: "Product", fil: "Produkto", done: step2 },
          { en: "Price & Volume", fil: "Presyo at Dami", done: step3 },
          { en: "Location", fil: "Lokasyon", done: step4 },
          { en: "Contact", fil: "Makipag-ugnayan", done: step5 },
          { en: "Notes", fil: "Mga Tala", done: step6 },
        ];
  }, [buildCandidate, category, isPlanting]);

  // Push live progress up to the sidebar; the memo identity only changes when
  // a tracked field changes, so the parent doesn't re-render on every keystroke
  // beyond what the form itself already does.
  useEffect(() => {
    onProgress?.(progressSteps);
  }, [onProgress, progressSteps]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!user) {
      toast({ title: "Mag-login muna", variant: "destructive" });
      return;
    }

    // Validate the entire form object against reportSchema BEFORE any Supabase
    // INSERT. On failure: show inline errors next to each failing field and stop.
    const candidate = buildCandidate();

    const parsed = reportSchema.safeParse(candidate);
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      setLocErrors({
        region: errs.region, province: errs.province,
        municipality: errs.municipality, barangay: errs.barangay,
      });
      setVolumeError(Boolean(errs.volume_level));
      toast({ title: "Kulang ang detalye", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setFieldErrors({});
    setLocErrors({});
    setVolumeError(false);
    setSubmitting(true);

    const d = parsed.data;

    if (!isPlanting) {
      const isAnimal = category === "poultry" || category === "livestock";
      const isFish = category === "fish";
      const volumeStr = isAnimal
        ? [form.heads && `${form.heads} ulo`, form.weight && `${form.weight} kg`].filter(Boolean).join(", ") || d.volume_level
        : d.volume_level;

      const insertPayload = {
        record_type: "current_supply",
        category, subcategory: d.commodity,
        price: Number(d.price), price_unit: priceUnit, status: d.status,
        region: d.region, province: d.province,
        municipality: d.municipality, barangay: d.barangay,
        lat: d.lat, lng: d.lng, notes: d.notes || null, volume: volumeStr,
        planted_date: isFish ? form.date_caught : null,
        phone_number: form.phone_number.trim() || null,
        messenger_username: sanitizeMessenger(form.messenger_username) || null,
        reported_by: user.id,
      };
      const { error } = await supabase.from("agri_reports").insert(insertPayload as never).select();
      setSubmitting(false);
      if (error) {
        const msg = `${error.message}${error.details ? ` — ${error.details}` : ""}${error.hint ? ` (${error.hint})` : ""}`;
        setSubmitError(msg);
        return toast({ title: "Submission failed", description: msg, variant: "destructive" });
      }
      toast({ title: "Salamat!", description: "Naipadala ang ulat." });
      onSubmitted?.("current_supply");
      setForm((f) => ({ ...f, commodity: "", price: "", notes: "", volume_level: "" }));
      return;
    }

    const volumeCombined = [d.volume_level, form.expected_volume].filter(Boolean).join(" — ") || null;
    const notesCombined = [
      form.reporter_name && `Pangalan: ${form.reporter_name}`,
      form.reporter_contact && `Contact: ${form.reporter_contact}`,
      form.notes,
    ].filter(Boolean).join("\n") || null;

    const plantingPayload = {
      record_type: "planting_intention",
      category, subcategory: d.commodity,
      status: "balanced",
      planted_date: d.planted_date,
      expected_harvest_date: d.expected_harvest_date,
      volume: d.volume_level,
      expected_volume: volumeCombined,
      growth_stage: form.growth_stage || null,
      region: d.region, province: d.province,
      municipality: d.municipality, barangay: d.barangay,
      lat: d.lat, lng: d.lng,
      notes: notesCombined,
      phone_number: form.phone_number.trim() || null,
      messenger_username: sanitizeMessenger(form.messenger_username) || null,
      reported_by: user.id,
    };
    const { error } = await supabase.from("agri_reports").insert(plantingPayload as never).select();
    setSubmitting(false);
    if (error) {
      const msg = `${error.message}${error.details ? ` — ${error.details}` : ""}${error.hint ? ` (${error.hint})` : ""}`;
      setSubmitError(msg);
      return toast({ title: "Submission failed", description: msg, variant: "destructive" });
    }
    toast({
      title: "Salamat!",
      description: "Nai-record na ang iyong Paparating na ani.",
    });
    onSubmitted?.("planting_intention");
    setForm((f) => ({
      ...f, commodity: "", planted_date: todayStr(), expected_harvest_date: "",
      expected_volume: "", volume_level: "", growth_stage: "", notes: "",
    }));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Hindi suportado ang GPS sa device na ito", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        gpsLocked.current = true;
        setCoords(pos.coords.latitude, pos.coords.longitude, "gps");
        toast({ title: "Nakuha ang iyong lokasyon" });
      },
      () => toast({ title: "Hindi makuha ang lokasyon", variant: "destructive" })
    );
  };


  const stageOptions = STAGE_BY_CATEGORY[category] ?? STAGE_BY_CATEGORY.other;
  const dateLabels = DATE_LABELS[category] ?? DATE_LABELS.other;

  // (StepHeading and StepCard live at module scope — see the note above
  // StepHeading for why in-render definitions would remount form fields.)

  const VolumeToggle = ({ gridClassName = "grid grid-cols-2 gap-3" }: { gridClassName?: string }) => (
    <div className="space-y-2">
      <Label className={`text-base font-bold ${volumeError ? "text-destructive" : ""}`}>
        Dami ng Produkto *
      </Label>
      <div className={gridClassName}>
        {VOLUME_OPTIONS.map((v) => {
          const active = form.volume_level === v.value;
          return (
            <button
              key={v.value}
              type="button"
              onClick={() => { update("volume_level", v.value); setVolumeError(false); }}
              className={`min-h-[64px] rounded-xl border-2 px-3 py-2 flex flex-col items-center justify-center gap-0.5 font-semibold transition-all ${
                active
                  ? "bg-green-600 border-green-600 text-white shadow-md scale-[1.02]"
                  : volumeError
                  ? "bg-card border-destructive text-foreground/80"
                  : "bg-card border-border text-foreground/80 hover:border-green-400"
              }`}
            >
              <span className="text-sm">{v.label}</span>
              <span className={`text-xs ${active ? "text-white/80" : "text-muted-foreground"}`}>{v.sub}</span>
            </button>
          );
        })}
      </div>
      {volumeError && (
        <p className="text-sm text-destructive font-medium">Piliin ang dami ng produkto</p>
      )}
    </div>
  );

  return (
    <div className="h-full w-full overflow-y-auto bg-background">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-10 md:mx-0 md:max-w-none md:px-6 md:py-6">
        {/* Desktop-only page header: green icon badge + title + "Report" subtitle.
            Hidden below md: so mobile keeps its existing inline <header>. */}
        <div className="hidden md:mb-6 md:flex md:items-center md:gap-3">
          <span
            aria-hidden
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#16a34a]/10 text-2xl"
          >
            📝
          </span>
          <span>
            <span className="block text-2xl font-extrabold tracking-tight text-foreground">
              Mag-ulat
            </span>
            <span className="block text-sm text-muted-foreground">Report</span>
          </span>
        </div>

        {/* Mobile-only title (hidden from md: up, where the badge page header
            above is the single title). Kept verbatim: it swaps with the
            record type on mobile ("Itinanim Ko" vs "Mag-ulat"). */}
        <header className="mb-6 pr-12 md:hidden">
          {isPlanting ? (
            <>
              <h1 className="text-3xl font-extrabold leading-tight">🌱 Itinanim Ko</h1>
              <p className="text-base text-muted-foreground mt-1">
                I-record ang iyong itinanim para malaman ng lahat kung ano ang paparating.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-extrabold leading-tight">Mag-ulat</h1>
              <p className="text-base text-muted-foreground mt-1">Report</p>
            </>
          )}
        </header>

        {/* Record-type pill selector. Desktop (md+) renders it large; the base
            (mobile) classes are unchanged. */}
        <div className="bg-muted rounded-full p-1 flex mb-6 md:gap-1 md:bg-[#e5e7eb] md:p-1.5">
          <button
            type="button"
            onClick={() => { setRecordType("current_supply"); update("volume_level", ""); setVolumeError(false); }}
            aria-pressed={!isPlanting}
            className={`flex-1 px-3 py-2.5 text-sm font-semibold rounded-full transition-colors ${!isPlanting ? "bg-primary text-primary-foreground shadow" : "text-foreground/70"} md:py-3 md:text-base md:font-bold ${!isPlanting ? "md:bg-[#16a34a] md:text-white md:shadow" : "md:bg-transparent md:text-[#6b7280] md:hover:text-[#111827]"}`}
          >
            <span className="md:hidden">Ano ang ani mo ngayon?</span>
            <span className="hidden md:inline">🌾 Ani Ko Ngayon</span>
          </button>
          <button
            type="button"
            onClick={() => { setRecordType("planting_intention"); update("volume_level", ""); setVolumeError(false); }}
            aria-pressed={isPlanting}
            className={`flex-1 px-3 py-2.5 text-sm font-semibold rounded-full transition-colors ${isPlanting ? "bg-primary text-primary-foreground shadow" : "text-foreground/70"} md:py-3 md:text-base md:font-bold ${isPlanting ? "md:bg-[#16a34a] md:text-white md:shadow" : "md:bg-transparent md:text-[#6b7280] md:hover:text-[#111827]"}`}
          >
            🌱 Itinanim Ko
          </button>
        </div>

        <form id={MAG_ULAT_FORM_ID} onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
          {/* Step 1: Category — desktop gets numbered heading + card grid;
              mobile keeps the existing "Hakbang 1" label + 3-col grid. */}
          <div>
            <div className="md:mb-4">
              <StepHeading n={1} title="Piliin ang Uri" hint="Pumili ng kategorya ng iyong produkto" />
            </div>
            <StepCard>
            <div className="space-y-3">
            <Label className="text-base font-bold"><span className="md:hidden">Hakbang 1: </span>Piliin ang Uri *</Label>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {CATEGORIES.map((c) => {
                const isActive = category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => changeCategory(c.key)}
                    aria-pressed={isActive}
                    className={`relative flex flex-col items-center justify-center gap-1 min-h-[96px] rounded-2xl border-2 px-1 py-3 transition-all ${
                      isActive
                        ? "bg-primary/10 border-primary text-foreground shadow-md scale-[1.02] md:border-[#16a34a] md:bg-[#16a34a]/10 md:shadow"
                        : "bg-card border-border text-foreground/80 md:hover:border-[#16a34a]/50"
                    }`}
                  >
                    {/* Desktop-only checkmark badge on the selected card */}
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute right-2 top-2 hidden h-5 w-5 place-items-center rounded-full bg-[#16a34a] text-[11px] font-bold text-white md:grid"
                      >
                        ✓
                      </span>
                    )}
                    <span className="text-4xl leading-none md:text-3xl">{c.icon}</span>
                    <span className="text-xs font-semibold text-center leading-tight md:text-sm md:font-bold">{c.label}</span>
                    {/* Desktop-only English subtitle (from categories.ts) */}
                    <span className="hidden text-xs text-muted-foreground md:block">{c.subLabel}</span>
                  </button>
                );
              })}
            </div>
            </div>
            </StepCard>
          </div>

          {/* Step 2: Commodity — desktop gets the numbered heading + bordered card;
              mobile keeps the existing "Hakbang 2" label with unchanged fields.
              Wrapper has no base space-y: the inner div already reproduces HEAD's
              gap, and `space-y` would add a phantom margin before the hidden
              heading (Tailwind targets the [hidden] attribute, not the class). */}
          <div>
            <div className="md:mb-4">
              <StepHeading n={2} title="Piliin ang Produkto" hint="Ano ang iyong produkto?" />
            </div>
            <StepCard>
            <div className="space-y-2">
            <Label htmlFor="commodity" className="text-base font-bold"><span className="md:hidden">Hakbang 2: </span>Produkto *</Label>
            {/* Step-2 combo box: native <select> is the picker (same
                control + chevron pattern as the app's other shadcn
                dropdowns); the text input stays the editable value and
                accepts custom commodities not in the list.
                Mobile keeps the original input + datalist only (the select
                is `hidden`, shown from md: up), so mobile is unchanged. */}
            <div className="relative md:flex md:items-stretch md:gap-0 md:overflow-hidden md:rounded-md md:border md:border-input md:bg-background md:focus-within:ring-2 md:focus-within:ring-ring md:focus-within:ring-offset-2">
              <span
                aria-hidden
                className="hidden shrink-0 place-items-center pl-3 text-xl leading-none md:grid"
              >
                {form.commodity ? getCommodityIcon(form.commodity, category) : getCommodityIcon(subOptions[0], category)}
              </span>
              <Input
                id="commodity"
                list="commodity-suggestions"
                value={form.commodity}
                onChange={(e) => update("commodity", e.target.value)}
                className="min-h-[52px] text-base md:min-h-[52px] md:flex-1 md:border-0 md:bg-transparent md:shadow-none md:focus-visible:ring-0"
                placeholder={subOptions[0] ?? ""}
                required
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 text-muted-foreground md:block" aria-hidden>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </span>
              <select
                aria-label="Pumili ng produkto mula sa listahan"
                value={subOptions.includes(form.commodity) ? form.commodity : ""}
                onChange={(e) => update("commodity", e.target.value)}
                className="hidden md:absolute md:inset-y-0 md:right-0 md:w-10 md:cursor-pointer md:opacity-0"
              >
                <option value="" disabled>Pumili ng produkto</option>
                {subOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <datalist id="commodity-suggestions">
                {subOptions.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
            <FieldError field="commodity" />
            </div>
            </StepCard>
          </div>

          {/* Step 3: current-supply price + volume — heading + bordered card on
              desktop; on mobile the same fields render with unchanged markup
              inside a plain div. Inner wrappers replicate the base gaps. */}
          {!isPlanting && (
            <div>
              <div className="md:mb-4">
                <StepHeading n={3} title="Presyo at Dami" hint="Magkano, gaano karami, at ano ang kalagayan" />
              </div>
              <StepCard>
              {/*
                Balanced 2-col grid on desktop: Presyo (compound control) and
                Kalagayan side by side; Dami ng Produkto spans full width
                below as a 4-button row; category extras (if any) span full
                width last. The old 3-col grid left column 3 permanently empty
                (extras render only for fish/poultry/livestock), which is what
                squeezed Presyo/Kalagayan and left the volume grid dangling in
                half a column.
              */}
              <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-base">{priceMeta.label} *</Label>
                {/*
                  Single inline compound control: ₱ prefix + number input + unit
                  dropdown in one row. min-w-0 on the input wrapper keeps the
                  flex item shrinkable so the unit keeps its width instead of
                  wrapping below (the old `flex-1` without min-w-0 let the input
                  force the unit onto its own line in the narrow grid column).
                */}
                <div className="flex items-stretch gap-2">
                  <div className="relative min-w-0 flex-1">
                    <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">₱</span>
                    <Input id="price" type="number" step="0.01" value={form.price} onChange={(e) => update("price", e.target.value)} className="h-full min-h-[52px] w-full text-base md:pl-8" required />
                  </div>
                  <Select value={priceUnit} onValueChange={(v) => setUnitOverride(v as PriceUnit)}>
                    <SelectTrigger className="min-h-[52px] w-[110px] shrink-0 text-base" aria-label="Yunit ng presyo"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRICE_UNITS.map((u) => (
                        <SelectItem key={u} value={u} className="text-base">{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FieldError field="price" />
              </div>
              <div className="space-y-2">
                <Label className="text-base">Kalagayan *</Label>
                <Select value={form.status} onValueChange={(v) => update("status", v)}>
                  <SelectTrigger className="min-h-[52px] text-base">
                    {/*
                      Colored status dot matching the selected option
                      (green/red/yellow). DESKTOP-ONLY: at HEAD the trigger was
                      `<SelectValue />` bare, so on mobile it must stay hidden
                      for pixel parity. Plain `hidden` can't win against the
                      shared SelectTrigger's `[&>span]:line-clamp-1`
                      (`.trigger > span` = 0,1,1 beats 0,1,0), hence the
                      `!important` variants — they also cancel the -webkit-box
                      display line-clamp applies on desktop.
                    */}
                    <span
                      aria-hidden
                      className={`mr-2 h-2.5 w-2.5 shrink-0 rounded-full !hidden md:!inline-block ${
                        form.status === "surplus" ? "bg-green-500"
                        : form.status === "deficit" ? "bg-red-500"
                        : "bg-yellow-500"
                      }`}
                    />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-base">
                        {s.icon} {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError field="status" />
              </div>
              <div className="md:col-span-2">
                {/* Volume toggles — full-width 4-button row on desktop */}
                <VolumeToggle gridClassName="grid grid-cols-2 gap-3 md:grid-cols-4" />
              </div>

              {(category === "fish" || category === "poultry" || category === "livestock") && (
              <div className="space-y-2 md:space-y-4 md:pt-0 md:col-span-2">
              {category === "fish" && (
                <div className="space-y-2">
                  <Label htmlFor="date_caught" className="text-base">Petsa ng Huli *</Label>
                  <Input id="date_caught" type="date" value={form.date_caught} onChange={(e) => update("date_caught", e.target.value)} className="min-h-[52px] text-base" required />
                </div>
              )}
              {(category === "poultry" || category === "livestock") && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
                  <div className="space-y-2">
                    <Label htmlFor="heads" className="text-base">Bilang ng Ulo *</Label>
                    <Input id="heads" type="number" min="0" placeholder="hal. 10" value={form.heads} onChange={(e) => update("heads", e.target.value)} className="min-h-[52px] text-base" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight" className="text-base">Timbang (kg)</Label>
                    <Input id="weight" type="number" step="0.1" min="0" placeholder="hal. 50" value={form.weight} onChange={(e) => update("weight", e.target.value)} className="min-h-[52px] text-base" />
                  </div>
                </div>
              )}
              </div>
              )}
              </div>
              </StepCard>
            </div>
          )}

          {/* Step 3 (planting): dates + growth stage + volume — same step/card
              pattern as the current-supply step 3. */}
          {isPlanting && (
            <div>
              <div className="md:mb-4">
                <StepHeading n={3} title="Detalye ng Itinanim" hint="Petsa, yugto, at dami ng iyong itinanim" />
              </div>
              <StepCard>
              <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="planted_date" className="text-base font-bold">{dateLabels.start} *</Label>
                <Input id="planted_date" type="date" value={form.planted_date} onChange={(e) => update("planted_date", e.target.value)} className="min-h-[52px] text-base" required />
                <FieldError field="planted_date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected_harvest_date" className="text-base font-bold">{dateLabels.end} *</Label>
                <Input id="expected_harvest_date" type="date" value={form.expected_harvest_date} onChange={(e) => update("expected_harvest_date", e.target.value)} className="min-h-[52px] text-base" required />
                <FieldError field="expected_harvest_date" />
                {weeksFromNow !== null && (
                  <p className="text-sm font-semibold text-green-700">
                    {weeksFromNow <= 0 ? "Handa na ngayon" : `Mga ${weeksFromNow} linggo mula ngayon`}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-base font-bold">Yugtong Paglaki</Label>
                <div className="grid grid-cols-3 gap-2">
                  {stageOptions.map((s) => {
                    const active = form.growth_stage === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => update("growth_stage", s.value)}
                        className={`flex flex-col items-center gap-1 min-h-[80px] rounded-2xl border-2 px-1 py-2 transition-all ${
                          active
                            ? "bg-primary/10 border-primary shadow-md scale-[1.02]"
                            : "bg-card border-border text-foreground/80"
                        }`}
                      >
                        <span className="text-3xl leading-none">{s.icon}</span>
                        <span className="text-[11px] font-semibold text-center leading-tight">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Volume toggles — planting intention */}
              <div className="md:pt-1">
                <VolumeToggle />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-base">Tinatayang Dami (opsyonal)</Label>
                <Input
                  placeholder="hal. 500 kilo, 200 ulo"
                  value={form.expected_volume}
                  onChange={(e) => update("expected_volume", e.target.value)}
                  className="min-h-[52px] text-base"
                />
              </div>
              </div>
              </StepCard>
            </div>
          )}

          {/* Step 4: Location — cascading dropdowns + coords + GPS + preview in one
              card on desktop; unchanged stacked fields on mobile. */}
          <div>
            <div className="md:mb-4">
              <StepHeading n={4} title="Lokasyon" hint="Saan matatagpuan ang iyong ani o taniman" />
            </div>
            {/* Planting-only label. HEAD kept this inside the location block's
                `space-y-3`, so it needs a 12px gap on mobile (mb-3) to stay
                pixel-identical; hidden at md where the step heading replaces it. */}
            {isPlanting && (
              <Label className="text-base font-bold mb-3 md:hidden">Lokasyon</Label>
            )}
            <StepCard>
            <div className="space-y-3 md:space-y-4">
            <LocationDropdowns
              value={location}
              onChange={(v) => {
                setLocation(v);
                setLocErrors((prev) => {
                  const next = { ...prev };
                  if (v.region) delete next.region;
                  if (v.province) delete next.province;
                  if (v.municipality) delete next.municipality;
                  if (v.barangay) delete next.barangay;
                  return next;
                });
              }}
            />
            {(locErrors.region || locErrors.province || locErrors.municipality || locErrors.barangay) && (
              <ul className="text-sm text-destructive font-medium space-y-0.5 mt-1">
                {locErrors.region && <li>• {locErrors.region}</li>}
                {locErrors.province && <li>• {locErrors.province}</li>}
                {locErrors.municipality && <li>• {locErrors.municipality}</li>}
                {locErrors.barangay && <li>• {locErrors.barangay}</li>}
              </ul>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="lat" className="text-base">Latitude *</Label>
                <Input id="lat" type="number" step="any" value={form.lat} onChange={(e) => { gpsLocked.current = true; update("lat", e.target.value); setCoordSource("manual"); }} className="min-h-[52px] text-base" required />
                <FieldError field="lat" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng" className="text-base">Longitude *</Label>
                <Input id="lng" type="number" step="any" value={form.lng} onChange={(e) => { gpsLocked.current = true; update("lng", e.target.value); setCoordSource("manual"); }} className="min-h-[52px] text-base" required />
                <FieldError field="lng" />
              </div>
            </div>
            <Button type="button" variant="outline" onClick={useMyLocation} className="w-full min-h-[52px] text-base md:w-auto md:px-6">
              📍 Gamitin ang aking lokasyon
            </Button>

            {coordSource !== "none" && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {geoLoading
                    ? "Hinahanap ang koordinado…"
                    : coordSource === "gps"
                      ? "📍 Mula sa GPS ng iyong device"
                      : coordSource === "municipality"
                        ? `📌 Mula sa ${location.municipality}`
                        : coordSource === "province"
                          ? `📌 Gitna ng ${location.province} (walang eksaktong tugma sa bayan)`
                          : "✍️ Manwal na inilagay"}
                </p>
                <MapPreview
                  lat={Number(form.lat) || 12.8797}
                  lng={Number(form.lng) || 121.774}
                  emoji={getCommodityIcon(form.commodity, category)}
                  onChange={(la, ln) => { gpsLocked.current = true; setCoords(la, ln, "manual"); }}
                />
              </div>
            )}

            </div>
            </StepCard>
          </div>

          {/* Step 5: contact — planting-only reporter fields fold into the same
              numbered step on desktop; on mobile they render as before. */}
          <div>
            <div className="md:mb-4">
              <StepHeading n={5} title="Impormasyon sa Pakikipag-ugnayan" hint="Opsyonal — para makontak ka ng mga mamimili" />
            </div>
            <StepCard>
            <div className="space-y-6 md:space-y-4">
            {/* Reporter info (planting only) */}
            {isPlanting && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reporter_name" className="text-base">Pangalan</Label>
                  <Input id="reporter_name" value={form.reporter_name} onChange={(e) => update("reporter_name", e.target.value)} className="min-h-[52px] text-base" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reporter_contact" className="text-base">Pakikipag-ugnayan</Label>
                  <Input id="reporter_contact" placeholder="Telepono o Facebook" value={form.reporter_contact} onChange={(e) => update("reporter_contact", e.target.value)} className="min-h-[52px] text-base" />
                </div>
              </div>
            )}

            {/* Contact info (optional) */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone_number" className="text-base">Numero ng Telepono (opsyonal)</Label>
              <Input
                id="phone_number"
                type="tel"
                inputMode="tel"
                placeholder="hal. 09171234567"
                value={form.phone_number}
                onChange={(e) => update("phone_number", e.target.value.replace(/[^0-9+]/g, "").slice(0, 20))}
                className="min-h-[52px] text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="messenger_username" className="text-base">Messenger Username (opsyonal)</Label>
              <Input
                id="messenger_username"
                placeholder="hal. juandelacruz"
                value={form.messenger_username}
                onChange={(e) => update("messenger_username", sanitizeMessenger(e.target.value).slice(0, 50))}
                className="min-h-[52px] text-base"
              />
              {form.messenger_username && (
                <p className="text-sm text-muted-foreground">
                  Ang iyong Messenger link: <span className="font-medium text-foreground">m.me/{form.messenger_username}</span>
                </p>
              )}
            </div>
            </div>
            </div>
            </StepCard>
          </div>



          {/* Step 6: notes — same card pattern; mobile keeps its label + textarea. */}
          <div>
            <div className="md:mb-4">
              <StepHeading n={6} title="Mga Tala" hint="Dagdag na detalye tungkol sa iyong ulat (opsyonal)" />
            </div>
            <StepCard>
            <div className="space-y-2">
            <Label htmlFor="notes" className="text-base">Mga Tala</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className="text-base md:min-h-[120px]"
              rows={3}
              placeholder={isPlanting ? "Halimbawa: Organic ang aking pagtatanim. May sakit ang ilang halaman. Etc." : ""}
            />
            </div>
            </StepCard>
          </div>

          {submitError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-semibold mb-0.5">Hindi naipadala — Supabase error:</p>
              <p className="font-mono break-words whitespace-pre-wrap">{submitError}</p>
            </div>
          )}

          {/* Submit — final element of the form, directly below Mga Tala.
              Mobile keeps its original button styling/labels untouched; on
              desktop the button wears the styling the right rail used to
              carry (Send icon, #16a34a, helper text beneath). Same single
              submit handler — this button just lives inside the form. */}
          <div className="space-y-2">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[56px] text-lg font-bold bg-green-600 hover:bg-green-700 text-white md:min-h-[52px] md:text-base md:rounded-xl md:bg-[#16a34a] md:hover:bg-[#15803d] md:[&_svg]:size-5"
            >
              <Send className="hidden md:inline-block" aria-hidden />
              <span className="md:hidden">
                {submitting
                  ? "Pinapadala…"
                  : isPlanting
                    ? "🌱 Ipadala ang Paparating na Ulat"
                    : "Ipadala ang Ulat"}
              </span>
              <span className="hidden md:inline">
                {submitting
                  ? "Pinapadala…"
                  : isPlanting
                    ? "🌱 I-submit ang Ulat"
                    : "I-submit ang Ulat"}
              </span>
            </Button>
            <p className="hidden md:block text-center text-[11px] leading-snug text-[#6b7280]">
              Siguraduhin na kumpleto at tama ang lahat ng impormasyon bago i-submit.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportFormPage;
