import { useMemo, useState } from "react";
import { z } from "zod";
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
import { CATEGORIES, CategoryKey, getCommodityIcon } from "@/lib/categories";

interface Props {
  onSubmitted?: (recordType?: "current_supply" | "planting_intention") => void;
}

type RecordType = "current_supply" | "planting_intention";

const todayStr = () => new Date().toISOString().slice(0, 10);

const nonEmpty = (label: string) => z.string().trim().min(1, { message: `${label} ay kailangan` }).max(100);

const harvestSchema = z.object({
  commodity: nonEmpty("Produkto"),
  price: z.coerce.number().min(0).max(100000),
  status: z.enum(["surplus", "deficit", "balanced"]),
  region: nonEmpty("Rehiyon"),
  province: nonEmpty("Probinsya"),
  municipality: nonEmpty("Munisipyo"),
  barangay: nonEmpty("Barangay"),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

const plantingSchema = z.object({
  commodity: nonEmpty("Produkto"),
  planted_date: z.string().min(1),
  expected_harvest_date: z.string().min(1),
  region: nonEmpty("Rehiyon"),
  province: nonEmpty("Probinsya"),
  municipality: nonEmpty("Munisipyo"),
  barangay: nonEmpty("Barangay"),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

type StageOption = { value: string; label: string; icon: string };

const STAGE_BY_CATEGORY: Record<string, StageOption[]> = {
  crops: [
    { value: "Planted", label: "Itinanim", icon: "🌱" },
    { value: "Growing", label: "Lumalaki", icon: "🌿" },
    { value: "Near Harvest", label: "Malapit nang Anihin", icon: "🌾" },
  ],
  fish: [
    { value: "Newly Stocked", label: "Bagong Lagay", icon: "🐣" },
    { value: "Growing", label: "Lumalaki", icon: "🐠" },
    { value: "Near Harvest", label: "Handa nang Anihin", icon: "🐟" },
  ],
  poultry: [
    { value: "Newly Placed", label: "Bagong Sisiw", icon: "🐣" },
    { value: "Growing", label: "Lumalaki", icon: "🐥" },
    { value: "Near Harvest", label: "Handa na", icon: "🐔" },
  ],
  livestock: [
    { value: "Newly Acquired", label: "Bagong Bili", icon: "🐣" },
    { value: "Growing", label: "Lumalaki", icon: "🐷" },
    { value: "Near Harvest", label: "Handa nang Ibenta", icon: "🐖" },
  ],
  dairy: [
    { value: "Newly Acquired", label: "Bagong Bili", icon: "🐣" },
    { value: "Growing", label: "Lumalaki", icon: "🐄" },
    { value: "Near Harvest", label: "Nagagatasan na", icon: "🥛" },
  ],
  other: [
    { value: "Planted", label: "Itinanim", icon: "🌱" },
    { value: "Growing", label: "Lumalaki", icon: "🌿" },
    { value: "Near Harvest", label: "Handa na", icon: "✅" },
  ],
};

const DATE_LABELS: Record<string, { start: string; end: string }> = {
  crops: { start: "📅 Kailan mo ito itinanim?", end: "📅 Kailan mo aanihin?" },
  fish: { start: "📅 Kailan mo sila inilagay sa tubig?", end: "📅 Inaasahang petsa ng huli" },
  poultry: { start: "📅 Petsa ng paglalagay ng sisiw", end: "📅 Inaasahang petsa ng karne/itlog" },
  livestock: { start: "📅 Petsa ng pagbili ng alagang hayop", end: "📅 Inaasahang petsa ng pagbenta" },
  dairy: { start: "📅 Petsa ng pagbili", end: "📅 Inaasahang petsa" },
  other: { start: "📅 Petsa ng simula", end: "📅 Inaasahang petsa ng ani" },
};

const VOLUME_LEVELS = [
  { value: "Napakataas", label: "Napakataas" },
  { value: "Mataas", label: "Mataas" },
  { value: "Katamtaman", label: "Katamtaman" },
  { value: "Mababa", label: "Mababa" },
];

const ReportFormPage = ({ onSubmitted }: Props) => {
  const { t } = useLang();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [recordType, setRecordType] = useState<RecordType>("current_supply");
  const [category, setCategory] = useState<CategoryKey>("crops");
  const [form, setForm] = useState({
    commodity: "",
    price: "",
    status: "balanced",
    region: "",
    province: "",
    municipality: "",
    barangay: "",
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
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const isPlanting = recordType === "planting_intention";
  const subOptions = useMemo(
    () => CATEGORIES.find((c) => c.key === category)?.subcategories ?? [],
    [category]
  );

  const weeksFromNow = useMemo(() => {
    if (!form.expected_harvest_date) return null;
    const diff = new Date(form.expected_harvest_date).getTime() - Date.now();
    if (isNaN(diff)) return null;
    const weeks = Math.round(diff / (1000 * 60 * 60 * 24 * 7));
    return weeks;
  }, [form.expected_harvest_date]);

  const ensureUser = async () => {
    let { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const { data: anon, error: anonErr } = await supabase.auth.signInAnonymously();
      if (anonErr || !anon.user) return null;
      user = anon.user;
    }
    return user;
  };

  const changeCategory = (k: CategoryKey) => {
    setCategory(k);
    update("commodity", "");
    update("growth_stage", "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (!isPlanting) {
      const parsed = harvestSchema.safeParse(form);
      if (!parsed.success) {
        setSubmitting(false);
        toast({ title: "Invalid input", description: parsed.error.issues[0].message, variant: "destructive" });
        return;
      }
      const user = await ensureUser();
      if (!user) { setSubmitting(false); toast({ title: "Submission failed", variant: "destructive" }); return; }
      const d = parsed.data;
      const isAnimal = category === "poultry" || category === "livestock";
      const isFish = category === "fish";
      const volumeStr = isAnimal
        ? [form.heads && `${form.heads} ulo`, form.weight && `${form.weight} kg`].filter(Boolean).join(", ") || null
        : null;
      const insertPayload = {
        record_type: "current_supply",
        category, subcategory: d.commodity,
        price: d.price, status: d.status,
        region: d.region || null, province: d.province || null,
        municipality: d.municipality || null, barangay: d.barangay || null,
        lat: d.lat, lng: d.lng, notes: d.notes || null, volume: volumeStr,
        planted_date: isFish ? form.date_caught : null,
        reported_by: user.id,
      };
      console.log("[agri_reports] INSERT current_supply payload:", insertPayload);
      const { data: insData, error } = await supabase.from("agri_reports").insert(insertPayload).select();
      console.log("[agri_reports] INSERT current_supply response:", { insData, error });
      setSubmitting(false);
      if (error) {
        console.error("[agri_reports] INSERT error:", error);
        return toast({ title: "Submission failed", description: error.message, variant: "destructive" });
      }
      toast({ title: "Salamat!", description: "Naipadala ang ulat." });
      onSubmitted?.("current_supply");
      setForm((f) => ({ ...f, commodity: "", price: "", notes: "" }));
      return;
    }

    // Planting intention
    const parsed = plantingSchema.safeParse(form);
    if (!parsed.success) {
      setSubmitting(false);
      toast({ title: "Kulang ang detalye", description: "Pakikumpleto ang produkto, petsa at lokasyon.", variant: "destructive" });
      return;
    }
    const user = await ensureUser();
    if (!user) { setSubmitting(false); toast({ title: "Submission failed", variant: "destructive" }); return; }
    const d = parsed.data;
    const volumeCombined = [form.volume_level, form.expected_volume].filter(Boolean).join(" — ") || null;
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
      expected_volume: volumeCombined,
      growth_stage: form.growth_stage || null,
      region: form.region || null, province: form.province || null,
      municipality: form.municipality || null, barangay: form.barangay || null,
      lat: d.lat, lng: d.lng,
      notes: notesCombined,
      reported_by: user.id,
    };
    console.log("[agri_reports] INSERT planting_intention payload:", plantingPayload);
    const { data: insData, error } = await supabase.from("agri_reports").insert(plantingPayload).select();
    console.log("[agri_reports] INSERT planting_intention response:", { insData, error });
    setSubmitting(false);
    if (error) {
      console.error("[agri_reports] INSERT error:", error);
      return toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    }
    toast({
      title: "Salamat!",
      description: "Nai-record na ang iyong Paparating na ani. Aabisuhan ka namin kung malapit na ang iyong inaasahang ani.",
    });
    onSubmitted?.("planting_intention");
    setForm((f) => ({
      ...f, commodity: "", planted_date: todayStr(), expected_harvest_date: "",
      expected_volume: "", volume_level: "", growth_stage: "", notes: "",
    }));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { update("lat", String(pos.coords.latitude)); update("lng", String(pos.coords.longitude)); },
      () => toast({ title: "Hindi makuha ang lokasyon", variant: "destructive" })
    );
  };

  const stageOptions = STAGE_BY_CATEGORY[category] ?? STAGE_BY_CATEGORY.other;
  const dateLabels = DATE_LABELS[category] ?? DATE_LABELS.other;

  return (
    <div className="h-full w-full overflow-y-auto bg-background">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-10">
        <header className="mb-6 pr-12">
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

        <div className="bg-muted rounded-full p-1 flex mb-6">
          <button
            type="button"
            onClick={() => setRecordType("current_supply")}
            className={`flex-1 px-3 py-2.5 text-sm font-semibold rounded-full transition-colors ${!isPlanting ? "bg-primary text-primary-foreground shadow" : "text-foreground/70"}`}
          >
            Ano ang ani mo ngayon?
          </button>
          <button
            type="button"
            onClick={() => setRecordType("planting_intention")}
            className={`flex-1 px-3 py-2.5 text-sm font-semibold rounded-full transition-colors ${isPlanting ? "bg-primary text-primary-foreground shadow" : "text-foreground/70"}`}
          >
            🌱 Itinanim Ko
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Category */}
          <div className="space-y-3">
            <Label className="text-base font-bold">Hakbang 1: Piliin ang Uri *</Label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => {
                const isActive = category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => changeCategory(c.key)}
                    aria-pressed={isActive}
                    className={`flex flex-col items-center justify-center gap-1 min-h-[96px] rounded-2xl border-2 px-1 py-3 transition-all ${
                      isActive
                        ? "bg-primary/10 border-primary text-foreground shadow-md scale-[1.02]"
                        : "bg-card border-border text-foreground/80"
                    }`}
                  >
                    <span className="text-4xl leading-none">{c.icon}</span>
                    <span className="text-xs font-semibold text-center leading-tight">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Commodity */}
          <div className="space-y-2">
            <Label htmlFor="commodity" className="text-base font-bold">Hakbang 2: Produkto *</Label>
            {isPlanting && subOptions.length > 0 ? (
              <Select value={form.commodity} onValueChange={(v) => update("commodity", v)}>
                <SelectTrigger className="min-h-[52px] text-base">
                  <SelectValue placeholder="Pumili ng produkto" />
                </SelectTrigger>
                <SelectContent>
                  {subOptions.map((s) => (
                    <SelectItem key={s} value={s} className="text-base">
                      <span className="mr-2">{getCommodityIcon(s, category)}</span>{s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <>
                <Input
                  id="commodity"
                  list="commodity-suggestions"
                  value={form.commodity}
                  onChange={(e) => update("commodity", e.target.value)}
                  className="min-h-[52px] text-base"
                  placeholder={subOptions[0] ?? ""}
                  required
                />
                <datalist id="commodity-suggestions">
                  {subOptions.map((s) => <option key={s} value={s} />)}
                </datalist>
              </>
            )}
          </div>

          {!isPlanting && (
            <>
              <div className="space-y-2">
                <Label htmlFor="price" className="text-base">Presyo (₱/kg) *</Label>
                <Input id="price" type="number" step="0.01" value={form.price} onChange={(e) => update("price", e.target.value)} className="min-h-[52px] text-base" required />
              </div>
              <div className="space-y-2">
                <Label className="text-base">Kalagayan *</Label>
                <Select value={form.status} onValueChange={(v) => update("status", v)}>
                  <SelectTrigger className="min-h-[52px] text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="surplus" className="text-base">{t("surplus")} (Surplus)</SelectItem>
                    <SelectItem value="deficit" className="text-base">{t("deficit")} (Deficit)</SelectItem>
                    <SelectItem value="balanced" className="text-base">{t("balanced")} (Balanced)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {category === "fish" && (
                <div className="space-y-2">
                  <Label htmlFor="date_caught" className="text-base">Petsa ng Huli *</Label>
                  <Input id="date_caught" type="date" value={form.date_caught} onChange={(e) => update("date_caught", e.target.value)} className="min-h-[52px] text-base" required />
                </div>
              )}
              {(category === "poultry" || category === "livestock") && (
                <div className="grid grid-cols-2 gap-3">
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
            </>
          )}

          {isPlanting && (
            <>
              {/* Step 3: Dates + growth stage */}
              <div className="space-y-2">
                <Label htmlFor="planted_date" className="text-base font-bold">{dateLabels.start} *</Label>
                <Input id="planted_date" type="date" value={form.planted_date} onChange={(e) => update("planted_date", e.target.value)} className="min-h-[52px] text-base" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected_harvest_date" className="text-base font-bold">{dateLabels.end} *</Label>
                <Input id="expected_harvest_date" type="date" value={form.expected_harvest_date} onChange={(e) => update("expected_harvest_date", e.target.value)} className="min-h-[52px] text-base" required />
                {weeksFromNow !== null && (
                  <p className="text-sm font-semibold text-green-700">
                    {weeksFromNow <= 0
                      ? "Handa na ngayon"
                      : `Mga ${weeksFromNow} linggo mula ngayon`}
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

              {/* Step 4: Volume */}
              <div className="space-y-2">
                <Label className="text-base font-bold">Magkano ang inaasahan mong ani?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {VOLUME_LEVELS.map((v) => {
                    const active = form.volume_level === v.value;
                    return (
                      <button
                        key={v.value}
                        type="button"
                        onClick={() => update("volume_level", v.value)}
                        className={`min-h-[52px] rounded-xl border-2 px-3 text-sm font-semibold transition-all ${
                          active ? "bg-primary/10 border-primary" : "bg-card border-border text-foreground/80"
                        }`}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
                <Input
                  placeholder="Ilagay ang tinatayang dami (hal. 500 kilo, 200 ulo)"
                  value={form.expected_volume}
                  onChange={(e) => update("expected_volume", e.target.value)}
                  className="min-h-[52px] text-base mt-2"
                />
              </div>
            </>
          )}

          {/* Step 5: Location */}
          <div className="space-y-3">
            {isPlanting && <Label className="text-base font-bold">Lokasyon</Label>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="region" className="text-base">Rehiyon</Label>
                <Input id="region" value={form.region} onChange={(e) => update("region", e.target.value)} className="min-h-[52px] text-base" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province" className="text-base">Lalawigan</Label>
                <Input id="province" value={form.province} onChange={(e) => update("province", e.target.value)} className="min-h-[52px] text-base" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="municipality" className="text-base">Bayan</Label>
                <Input id="municipality" value={form.municipality} onChange={(e) => update("municipality", e.target.value)} className="min-h-[52px] text-base" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barangay" className="text-base">Barangay</Label>
                <Input id="barangay" value={form.barangay} onChange={(e) => update("barangay", e.target.value)} className="min-h-[52px] text-base" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="lat" className="text-base">Latitude *</Label>
                <Input id="lat" type="number" step="any" value={form.lat} onChange={(e) => update("lat", e.target.value)} className="min-h-[52px] text-base" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng" className="text-base">Longitude *</Label>
                <Input id="lng" type="number" step="any" value={form.lng} onChange={(e) => update("lng", e.target.value)} className="min-h-[52px] text-base" required />
              </div>
            </div>
            <Button type="button" variant="outline" onClick={useMyLocation} className="w-full min-h-[52px] text-base">
              📍 Gamitin ang aking lokasyon
            </Button>
          </div>

          {/* Step 6: Reporter info (planting only) */}
          {isPlanting && (
            <div className="grid grid-cols-1 gap-3">
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

          {/* Step 7: Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base">Mga Tala</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className="text-base"
              rows={3}
              placeholder={isPlanting ? "Halimbawa: Organic ang aking pagtatanim. May sakit ang ilang halaman. Etc." : ""}
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[56px] text-lg font-bold bg-green-600 hover:bg-green-700 text-white"
          >
            {submitting
              ? "Pinapadala…"
              : isPlanting
                ? "🌱 Ipadala ang Paparating na Ulat"
                : "Ipadala ang Ulat"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ReportFormPage;
