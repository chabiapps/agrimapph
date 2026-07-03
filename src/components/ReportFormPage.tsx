import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useLang } from "@/lib/i18n";
import { CATEGORIES, CategoryKey } from "@/lib/categories";

interface Props {
  onSubmitted?: () => void;
}

type RecordType = "current_supply" | "planting_intention";

const todayStr = () => new Date().toISOString().slice(0, 10);

const harvestSchema = z.object({
  commodity: z.string().trim().min(1).max(100),
  price: z.coerce.number().min(0).max(100000),
  status: z.enum(["surplus", "deficit", "balanced"]),
  region: z.string().trim().max(100).optional().or(z.literal("")),
  province: z.string().trim().max(100).optional().or(z.literal("")),
  municipality: z.string().trim().max(100).optional().or(z.literal("")),
  barangay: z.string().trim().max(100).optional().or(z.literal("")),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

const plantingSchema = z.object({
  commodity: z.string().trim().min(1).max(100),
  planted_date: z.string().min(1, "Planted date required"),
  expected_harvest_date: z.string().min(1, "Expected harvest date required"),
  expected_volume: z.string().trim().max(100).optional().or(z.literal("")),
  region: z.string().trim().max(100).optional().or(z.literal("")),
  province: z.string().trim().max(100).optional().or(z.literal("")),
  municipality: z.string().trim().max(100).optional().or(z.literal("")),
  barangay: z.string().trim().max(100).optional().or(z.literal("")),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

const ReportFormPage = ({ onSubmitted }: Props) => {
  const { t } = useLang();
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
    date_caught: todayStr(),
    heads: "",
    weight: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const ensureUser = async () => {
    let { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const { data: anon, error: anonErr } = await supabase.auth.signInAnonymously();
      if (anonErr || !anon.user) return null;
      user = anon.user;
    }
    return user;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (recordType === "current_supply") {
      const parsed = harvestSchema.safeParse(form);
      if (!parsed.success) {
        setSubmitting(false);
        toast({ title: "Invalid input", description: parsed.error.issues[0].message, variant: "destructive" });
        return;
      }
      const user = await ensureUser();
      if (!user) {
        setSubmitting(false);
        toast({ title: "Submission failed", description: "Hindi makagawa ng session.", variant: "destructive" });
        return;
      }
      const d = parsed.data;
      const isAnimal = category === "poultry" || category === "livestock";
      const isFish = category === "fish";
      const volumeStr = isAnimal
        ? [form.heads && `${form.heads} ulo`, form.weight && `${form.weight} kg`].filter(Boolean).join(", ") || null
        : null;
      const { error } = await supabase.from("agri_reports").insert({
        record_type: "current_supply",
        commodity: d.commodity,
        category,
        subcategory: d.commodity,
        price: d.price,
        status: d.status,
        region: d.region || null,
        province: d.province || null,
        municipality: d.municipality || null,
        barangay: d.barangay || null,
        lat: d.lat,
        lng: d.lng,
        notes: d.notes || null,
        volume: volumeStr,
        planted_date: isFish ? form.date_caught : null,
        reported_by: user.id,
      });
      setSubmitting(false);
      if (error) {
        toast({ title: "Submission failed", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const parsed = plantingSchema.safeParse(form);
      if (!parsed.success) {
        setSubmitting(false);
        toast({ title: "Invalid input", description: parsed.error.issues[0].message, variant: "destructive" });
        return;
      }
      const user = await ensureUser();
      if (!user) {
        setSubmitting(false);
        toast({ title: "Submission failed", description: "Hindi makagawa ng session.", variant: "destructive" });
        return;
      }
      const d = parsed.data;
      const { error } = await supabase.from("agri_reports").insert({
        record_type: "planting_intention",
        commodity: d.commodity,
        category,
        subcategory: d.commodity,
        status: "balanced",
        planted_date: d.planted_date,
        expected_harvest_date: d.expected_harvest_date,
        expected_volume: d.expected_volume || null,
        region: d.region || null,
        province: d.province || null,
        municipality: d.municipality || null,
        barangay: d.barangay || null,
        lat: d.lat,
        lng: d.lng,
        notes: d.notes || null,
        reported_by: user.id,
      });
      setSubmitting(false);
      if (error) {
        toast({ title: "Submission failed", description: error.message, variant: "destructive" });
        return;
      }
    }

    toast({ title: "Salamat!", description: "Naipadala ang ulat." });
    onSubmitted?.();
    setForm((f) => ({ ...f, commodity: "", price: "", notes: "", expected_volume: "", expected_harvest_date: "" }));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update("lat", String(pos.coords.latitude));
        update("lng", String(pos.coords.longitude));
      },
      () => toast({ title: "Hindi makuha ang lokasyon", variant: "destructive" })
    );
  };

  const isPlanting = recordType === "planting_intention";

  return (
    <div className="h-full w-full overflow-y-auto bg-background">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-10">
        <header className="mb-6 pr-12">
          <h1 className="text-3xl font-extrabold leading-tight">Mag-ulat</h1>
          <p className="text-base text-muted-foreground mt-1">Report</p>
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
            🌱 Ano ang itinanim mo?
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-bold">Hakbang 1: Piliin ang Uri / Step 1: Category *</Label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => {
                const isActive = category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
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

          <div className="space-y-2">
            <Label htmlFor="commodity" className="text-base">Produkto / Commodity *</Label>
            <Input
              id="commodity"
              list="commodity-suggestions"
              value={form.commodity}
              onChange={(e) => update("commodity", e.target.value)}
              className="min-h-[52px] text-base"
              placeholder={CATEGORIES.find((c) => c.key === category)?.subcategories[0] ?? ""}
              required
            />
            <datalist id="commodity-suggestions">
              {(CATEGORIES.find((c) => c.key === category)?.subcategories ?? []).map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
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
            </>
          )}

          {isPlanting && (
            <>
              <div className="space-y-2">
                <Label htmlFor="planted_date" className="text-base">Petsa ng Pagtanim *</Label>
                <Input id="planted_date" type="date" value={form.planted_date} onChange={(e) => update("planted_date", e.target.value)} className="min-h-[52px] text-base" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected_harvest_date" className="text-base">Inaasahang Petsa ng Ani *</Label>
                <Input id="expected_harvest_date" type="date" value={form.expected_harvest_date} onChange={(e) => update("expected_harvest_date", e.target.value)} className="min-h-[52px] text-base" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected_volume" className="text-base">Inaasahang Dami (Volume)</Label>
                <Input id="expected_volume" placeholder="hal. 500 kg" value={form.expected_volume} onChange={(e) => update("expected_volume", e.target.value)} className="min-h-[52px] text-base" />
              </div>
            </>
          )}

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
          <div className="space-y-2">
            <Label htmlFor="lat" className="text-base">Latitude *</Label>
            <Input id="lat" type="number" step="any" value={form.lat} onChange={(e) => update("lat", e.target.value)} className="min-h-[52px] text-base" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lng" className="text-base">Longitude *</Label>
            <Input id="lng" type="number" step="any" value={form.lng} onChange={(e) => update("lng", e.target.value)} className="min-h-[52px] text-base" required />
          </div>
          <Button type="button" variant="outline" onClick={useMyLocation} className="w-full min-h-[52px] text-base">
            📍 Gamitin ang aking lokasyon
          </Button>
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base">Mga Tala</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} className="text-base" rows={3} />
          </div>
          <Button type="submit" disabled={submitting} className="w-full min-h-[60px] text-lg font-bold bg-green-600 hover:bg-green-700 text-white">
            {submitting ? "Pinapadala…" : "Ipadala ang Ulat"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ReportFormPage;
