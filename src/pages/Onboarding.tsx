import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import {
  Commodity, PROFILE_COLS, USER_TYPES, UserProfile, UserType,
  fetchCommodities, isProducer, tierMeta, userTypeMeta,
} from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const sanitizeMessenger = (raw: string) =>
  raw.trim()
    .replace(/^https?:\/\/(www\.)?(m\.me|facebook\.com|fb\.com)\//i, "")
    .replace(/[?#].*$/, "")
    .replace(/[^A-Za-z0-9._-]/g, "");

const Onboarding = ({ embedded = false, onDone }: { embedded?: boolean; onDone?: () => void } = {}) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [commodities, setCommodities] = useState<Commodity[]>([]);

  const [userType, setUserType] = useState<UserType | "">("");
  const [form, setForm] = useState({
    full_name: "",
    phone_number: "",
    messenger_username: "",
    primary_commodity: "",
    farm_location: "",
    land_area: "",
    vessel_type: "",
    rsbsa_number: "",
    philsys_id: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!embedded && !loading && !user) navigate("/", { replace: true });
  }, [embedded, loading, user, navigate]);

  useEffect(() => {
    fetchCommodities().then(setCommodities);
  }, []);

  useEffect(() => {
    if (!user) return;
    db.from("user_profiles").select(PROFILE_COLS).eq("id", user.id).maybeSingle().then(({ data }) => {
      const p = data as UserProfile | null;
      if (!p) return;
      setUserType((p.user_type as UserType) ?? "");
      setForm((f) => ({
        ...f,
        full_name: p.full_name ?? "",
        phone_number: p.phone_number ?? "",
        messenger_username: p.messenger_username ?? "",
        primary_commodity: p.primary_commodity ?? "",
        farm_location: p.farm_location ?? "",
        land_area: p.land_area ?? "",
        vessel_type: p.vessel_type ?? "",
        rsbsa_number: p.rsbsa_number ?? "",
        philsys_id: p.philsys_id ?? "",
      }));
    });
  }, [user]);

  const producer = isProducer(userType);
  const catCommodities = useMemo(() => {
    const cat = userType === "farmer" ? "crops" : userType === "fisherfolk" ? "fish" : null;
    if (!cat) return commodities;
    const inCat = commodities.filter((c) => c.category === cat);
    return inCat.length ? inCat : commodities;
  }, [commodities, userType]);

  const save = async () => {
    if (!user) return false;
    setSaving(true);
    const payload = {
      id: user.id,
      user_type: userType || "public",
      full_name: form.full_name.trim(),
      phone_number: form.phone_number.trim() || null,
      messenger_username: sanitizeMessenger(form.messenger_username) || null,
      primary_commodity: producer ? form.primary_commodity || null : null,
      farm_location: producer ? form.farm_location.trim() || null : null,
      land_area: producer && userType !== "fisherfolk" ? form.land_area.trim() || null : null,
      vessel_type: userType === "fisherfolk" ? form.vessel_type.trim() || null : null,
      rsbsa_number: producer ? form.rsbsa_number.trim() || null : null,
      philsys_id: producer ? form.philsys_id.trim() || null : null,
      verification_tier: "basic",
    };
    const { error } = await db.from("user_profiles").upsert(payload, { onConflict: "id" });
    setSaving(false);
    if (error) {
      toast({ title: "Hindi na-save ang profile", description: error.message, variant: "destructive" });
      return false;
    }
    return true;
  };

  const next = async () => {
    if (step === 1) {
      if (!userType) return toast({ title: "Pumili muna ng uri ng user", variant: "destructive" });
      return setStep(2);
    }
    if (step === 2) {
      if (!form.full_name.trim()) return toast({ title: "Kailangan ang buong pangalan", variant: "destructive" });
      if (producer) return setStep(3);
      if (await save()) setStep(4);
      return;
    }
    if (step === 3) {
      if (await save()) setStep(4);
    }
  };

  if (loading) return <div className="h-screen grid place-items-center text-muted-foreground">Loading...</div>;

  const tier = tierMeta("basic");
  const meta = userTypeMeta(userType);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        {step > 1 && step < 4 && (
          <button onClick={() => setStep(step === 4 ? 3 : step - 1)} aria-label="Bumalik" className="p-2 -ml-2">
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <div>
          <h1 className="text-lg font-bold leading-tight">Gawin ang iyong profile</h1>
          <p className="text-sm text-muted-foreground">Hakbang {Math.min(step, 4)} ng 4</p>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 space-y-6 max-w-lg w-full mx-auto">
        {step === 1 && (
          <>
            <h2 className="text-2xl font-extrabold">Sino ka?</h2>
            <div className="grid grid-cols-2 gap-3">
              {USER_TYPES.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setUserType(u.id)}
                  className={`rounded-2xl border-2 p-4 min-h-[120px] flex flex-col items-center justify-center gap-2 text-center transition-colors ${
                    userType === u.id ? "border-primary bg-primary/10" : "border-border bg-card"
                  }`}
                >
                  <span className="text-4xl">{u.emoji}</span>
                  <span className="text-base font-bold leading-tight">{u.label}</span>
                  <span className="text-xs text-muted-foreground">{u.sub}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-2xl font-extrabold">Basic na impormasyon</h2>
            <div className="space-y-2">
              <Label htmlFor="ob-name">Buong pangalan *</Label>
              <Input id="ob-name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className="min-h-[52px] text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ob-phone">Numero ng telepono (opsyonal)</Label>
              <Input id="ob-phone" inputMode="tel" value={form.phone_number} onChange={(e) => set("phone_number", e.target.value)} className="min-h-[52px] text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ob-msgr">Messenger username (opsyonal)</Label>
              <Input id="ob-msgr" value={form.messenger_username} onChange={(e) => set("messenger_username", e.target.value)} className="min-h-[52px] text-base" />
              {sanitizeMessenger(form.messenger_username) && (
                <p className="text-sm text-muted-foreground">m.me/{sanitizeMessenger(form.messenger_username)}</p>
              )}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-2xl font-extrabold">Detalye ng iyong produksyon</h2>
            <div className="space-y-2">
              <Label>Pangunahing produkto</Label>
              <Select value={form.primary_commodity} onValueChange={(v) => set("primary_commodity", v)}>
                <SelectTrigger className="min-h-[52px] text-base"><SelectValue placeholder="Pumili ng produkto" /></SelectTrigger>
                <SelectContent className="z-[2000]">
                  {catCommodities.map((c) => (
                    <SelectItem key={c.id} value={c.name} className="text-base">
                      {c.emoji ? `${c.emoji} ` : ""}{c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ob-loc">Lokasyon ng sakahan / pangisdaan</Label>
              <Textarea id="ob-loc" rows={2} placeholder="Brgy. Poblacion, Bambang, Nueva Vizcaya"
                value={form.farm_location} onChange={(e) => set("farm_location", e.target.value)} className="text-base" />
            </div>
            {userType === "fisherfolk" ? (
              <div className="space-y-2">
                <Label htmlFor="ob-vessel">Uri ng bangka / vessel</Label>
                <Input id="ob-vessel" placeholder="Bangka, motorized, commercial..." value={form.vessel_type}
                  onChange={(e) => set("vessel_type", e.target.value)} className="min-h-[52px] text-base" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="ob-area">Laki ng lupa (hektarya)</Label>
                <Input id="ob-area" placeholder="hal. 1.5" value={form.land_area}
                  onChange={(e) => set("land_area", e.target.value)} className="min-h-[52px] text-base" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="ob-rsbsa">RSBSA Number — para sa mas mataas na verification</Label>
              <Input id="ob-rsbsa" value={form.rsbsa_number} onChange={(e) => set("rsbsa_number", e.target.value)} className="min-h-[52px] text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ob-philsys">PhilSys ID — para sa government verification</Label>
              <Input id="ob-philsys" value={form.philsys_id} onChange={(e) => set("philsys_id", e.target.value)} className="min-h-[52px] text-base" />
            </div>
          </>
        )}

        {step === 4 && (
          <div className="text-center space-y-5 pt-8">
            <CheckCircle2 className="h-24 w-24 mx-auto text-green-600 animate-scale-in" />
            <div>
              <p className="text-2xl font-extrabold">{form.full_name}</p>
              <p className="text-base text-muted-foreground">{meta.emoji} {meta.label}</p>
            </div>
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-base font-semibold ${tier.className}`}>
              {tier.emoji} {tier.label}
            </span>
            <p className="text-base leading-relaxed">
              Maligayang pagdating sa AgriMap PH! Handa ka nang mag-ulat ng iyong ani.
            </p>
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 bg-card border-t border-border px-4 py-3 max-w-lg w-full mx-auto">
        {step === 4 ? (
          <Button onClick={() => (onDone ? onDone() : navigate("/"))} className="w-full min-h-[56px] text-base font-bold bg-primary hover:bg-primary/90">
            {onDone ? "Magpatuloy sa Mag-ulat" : "Pumunta sa Mapa"}
          </Button>

        ) : (
          <Button onClick={next} disabled={saving} className="w-full min-h-[56px] text-base font-bold bg-primary hover:bg-primary/90">
            {saving ? "Sandali..." : step === 1 ? "Magpatuloy" : step === 2 && !isProducer(userType) ? "Tapusin" : step === 3 ? "Tapusin" : "Magpatuloy"}
          </Button>
        )}
      </footer>
    </div>
  );
};

export default Onboarding;
