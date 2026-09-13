import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, LogOut } from "lucide-react";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import {
  Commodity, PROFILE_COLS, UserProfile, fetchCommodities, isProducer, tierMeta, userTypeMeta,
} from "@/lib/profile";
import QrCodeCard from "@/components/QrCodeCard";
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

const UPGRADE_HINT: Record<string, string> = {
  basic: "Para maabot ang Community Verified, hilingin sa 5 verified na magsasaka sa inyong lugar na mag-vouch para sa iyo — malapit nang dumating.",
  community: "Para maabot ang Government Verified, kailangan ng RSBSA o PhilSys verification mula sa LGU/DA — malapit nang dumating.",
  government: "Ikaw ay government verified. Salamat sa iyong kontribusyon!",
};

const ProfileSettings = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const [form, setForm] = useState({
    full_name: "", phone_number: "", messenger_username: "",
    primary_commodity: "", farm_location: "", land_area: "", vessel_type: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!loading && !user) navigate("/", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => { fetchCommodities().then(setCommodities); }, []);

  useEffect(() => {
    if (!user) return;
    db.from("user_profiles").select(PROFILE_COLS).eq("id", user.id).maybeSingle().then(({ data }) => {
      const p = (data as UserProfile | null) ?? null;
      setProfile(p);
      if (p) {
        setForm({
          full_name: p.full_name ?? "",
          phone_number: p.phone_number ?? "",
          messenger_username: p.messenger_username ?? "",
          primary_commodity: p.primary_commodity ?? "",
          farm_location: p.farm_location ?? "",
          land_area: p.land_area ?? "",
          vessel_type: p.vessel_type ?? "",
        });
      }
      setReady(true);
    });
  }, [user]);

  const producer = isProducer(profile?.user_type);
  const meta = userTypeMeta(profile?.user_type);
  const tier = tierMeta(profile?.verification_tier);
  const profileUrl = useMemo(() => (user ? `${window.location.origin}/profile/${user.id}` : ""), [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await db.from("user_profiles").upsert({
      id: user.id,
      user_type: profile?.user_type ?? "public",
      full_name: form.full_name.trim(),
      phone_number: form.phone_number.trim() || null,
      messenger_username: sanitizeMessenger(form.messenger_username) || null,
      primary_commodity: producer ? form.primary_commodity || null : null,
      farm_location: producer ? form.farm_location.trim() || null : null,
      land_area: producer && profile?.user_type !== "fisherfolk" ? form.land_area.trim() || null : null,
      vessel_type: profile?.user_type === "fisherfolk" ? form.vessel_type.trim() || null : null,
      verification_tier: profile?.verification_tier ?? "basic",
    }, { onConflict: "id" });
    setBusy(false);
    if (error) return toast({ title: "Hindi na-save", description: error.message, variant: "destructive" });
    toast({ title: "Na-save ang profile" });
  };

  if (loading || !ready) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" aria-label="Bumalik" className="p-2 -ml-2"><ChevronLeft className="h-6 w-6" /></Link>
          <h1 className="text-lg font-bold">Aking Profile</h1>
        </div>
        <button onClick={() => { signOut(); navigate("/"); }} className="flex items-center gap-1 text-sm font-semibold text-muted-foreground">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-16">
        <section className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
          <span className="text-4xl">{meta.emoji}</span>
          <div className="flex-1">
            <p className="text-lg font-bold leading-tight">{profile?.full_name ?? user?.email}</p>
            <p className="text-sm text-muted-foreground">{meta.label}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full border text-sm font-semibold whitespace-nowrap ${tier.className}`}>
            {tier.emoji} {tier.label}
          </span>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ps-name">Pangalan</Label>
            <Input id="ps-name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className="min-h-[52px] text-base" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ps-phone">Numero ng telepono</Label>
            <Input id="ps-phone" inputMode="tel" value={form.phone_number} onChange={(e) => set("phone_number", e.target.value)} className="min-h-[52px] text-base" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ps-msgr">Messenger username</Label>
            <Input id="ps-msgr" value={form.messenger_username} onChange={(e) => set("messenger_username", e.target.value)} className="min-h-[52px] text-base" />
            {sanitizeMessenger(form.messenger_username) && (
              <p className="text-sm text-muted-foreground">m.me/{sanitizeMessenger(form.messenger_username)}</p>
            )}
          </div>

          {producer && (
            <>
              <div className="space-y-2">
                <Label>Pangunahing produkto</Label>
                <Select value={form.primary_commodity} onValueChange={(v) => set("primary_commodity", v)}>
                  <SelectTrigger className="min-h-[52px] text-base"><SelectValue placeholder="Pumili ng produkto" /></SelectTrigger>
                  <SelectContent className="z-[2000]">
                    {commodities.map((c) => (
                      <SelectItem key={c.id} value={c.name} className="text-base">
                        {c.emoji ? `${c.emoji} ` : ""}{c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ps-loc">Lokasyon ng sakahan / pangisdaan</Label>
                <Textarea id="ps-loc" rows={2} value={form.farm_location} onChange={(e) => set("farm_location", e.target.value)} className="text-base" />
              </div>
              {profile?.user_type === "fisherfolk" ? (
                <div className="space-y-2">
                  <Label htmlFor="ps-vessel">Uri ng bangka / vessel</Label>
                  <Input id="ps-vessel" value={form.vessel_type} onChange={(e) => set("vessel_type", e.target.value)} className="min-h-[52px] text-base" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="ps-area">Laki ng lupa (hektarya)</Label>
                  <Input id="ps-area" value={form.land_area} onChange={(e) => set("land_area", e.target.value)} className="min-h-[52px] text-base" />
                </div>
              )}
            </>
          )}

          <Button onClick={save} disabled={busy} className="w-full min-h-[56px] text-base font-bold bg-primary hover:bg-primary/90">
            {busy ? "Sandali..." : "I-save ang pagbabago"}
          </Button>
        </section>

        <section className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
          <p className="text-base font-bold">Verification tier: {tier.emoji} {tier.label}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {UPGRADE_HINT[(profile?.verification_tier as string) ?? "basic"] ?? UPGRADE_HINT.basic}
          </p>
        </section>

        {profileUrl && (
          <section className="space-y-2">
            <p className="text-base font-bold">Aking QR profile</p>
            <QrCodeCard url={profileUrl} fileName={`agrimap-${user?.id.slice(0, 8)}`} caption={profileUrl} />
            <Button asChild variant="ghost" className="w-full min-h-[48px] text-base">
              <Link to={`/profile/${user?.id}`}>Tingnan ang pampublikong profile</Link>
            </Button>
          </section>
        )}
      </main>
    </div>
  );
};

export default ProfileSettings;
