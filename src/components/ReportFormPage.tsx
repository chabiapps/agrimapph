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

interface Props {
  onSubmitted?: () => void;
}

const schema = z.object({
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

const ReportFormPage = ({ onSubmitted }: Props) => {
  const { t } = useLang();
  const [submitting, setSubmitting] = useState(false);
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
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Invalid input", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const d = parsed.data;

    let { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const { data: anon, error: anonErr } = await supabase.auth.signInAnonymously();
      if (anonErr || !anon.user) {
        setSubmitting(false);
        toast({ title: "Submission failed", description: "Hindi makagawa ng session.", variant: "destructive" });
        return;
      }
      user = anon.user;
    }

    const { error } = await supabase.from("agri_reports").insert({
      commodity: d.commodity,
      price: d.price,
      status: d.status,
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
    toast({ title: "Salamat!", description: "Naipadala ang ulat." });
    onSubmitted?.();
    setForm({ ...form, commodity: "", price: "", notes: "" });
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

  return (
    <div className="h-full w-full overflow-y-auto bg-background">
      <div className="max-w-lg mx-auto p-4 pb-8">
        <h1 className="text-3xl font-extrabold mb-6">Mag-ulat</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="commodity" className="text-base">Produkto / Commodity *</Label>
            <Input id="commodity" value={form.commodity} onChange={(e) => update("commodity", e.target.value)} className="min-h-[52px] text-base" required />
          </div>
          <div>
            <Label htmlFor="price" className="text-base">Presyo (₱/kg) *</Label>
            <Input id="price" type="number" step="0.01" value={form.price} onChange={(e) => update("price", e.target.value)} className="min-h-[52px] text-base" required />
          </div>
          <div>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="region" className="text-base">Rehiyon</Label>
              <Input id="region" value={form.region} onChange={(e) => update("region", e.target.value)} className="min-h-[52px] text-base" />
            </div>
            <div>
              <Label htmlFor="province" className="text-base">Lalawigan</Label>
              <Input id="province" value={form.province} onChange={(e) => update("province", e.target.value)} className="min-h-[52px] text-base" />
            </div>
            <div>
              <Label htmlFor="municipality" className="text-base">Bayan</Label>
              <Input id="municipality" value={form.municipality} onChange={(e) => update("municipality", e.target.value)} className="min-h-[52px] text-base" />
            </div>
            <div>
              <Label htmlFor="barangay" className="text-base">Barangay</Label>
              <Input id="barangay" value={form.barangay} onChange={(e) => update("barangay", e.target.value)} className="min-h-[52px] text-base" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lat" className="text-base">Latitude *</Label>
              <Input id="lat" type="number" step="any" value={form.lat} onChange={(e) => update("lat", e.target.value)} className="min-h-[52px] text-base" required />
            </div>
            <div>
              <Label htmlFor="lng" className="text-base">Longitude *</Label>
              <Input id="lng" type="number" step="any" value={form.lng} onChange={(e) => update("lng", e.target.value)} className="min-h-[52px] text-base" required />
            </div>
          </div>
          <Button type="button" variant="outline" onClick={useMyLocation} className="w-full min-h-[52px] text-base">
            📍 Gamitin ang aking lokasyon
          </Button>
          <div>
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
