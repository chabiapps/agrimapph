import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft, LogOut, MapPin, MessageCircle, Phone, Ruler, Save, ShieldCheck, Ship, User,
} from "lucide-react";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import {
  Commodity, PROFILE_COLS, UserProfile, fetchCommodities, isProducer, tierMeta, userTypeMeta,
} from "@/lib/profile";
import { getCommodityIcon } from "@/lib/categories";
import { useIsMobile } from "@/hooks/use-mobile";
import LanguageToggle from "@/components/LanguageToggle";
import ProfileButton from "@/components/ProfileButton";
import DesktopLayout from "@/components/DesktopLayout";
import ProfileHeader from "@/components/ProfileHeader";
import QrCodeCard from "@/components/QrCodeCard";
import ProfileQrPanel from "@/components/ProfileQrPanel";
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

  const isMobile = useIsMobile();

  if (loading || !ready) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading...</div>;

  // Desktop-only building blocks. Mobile renders the original stacked fields
  // verbatim; all new layout (2-col grid, icon prefixes, card chrome) is
  // md:-prefixed or hidden below md:, matching the Mag-ulat restyle approach.

  /** Icon prefix for an input, same placement as Mag-ulat's ₱ symbol. */
  const FieldIcon = ({ Icon }: { Icon: typeof User }) => (
    <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
      <Icon className="h-4 w-4" />
    </span>
  );

  // Shared profile content (form sections, QR card) — rendered by both the
  // mobile page and the desktop shared-shell branch below.
  const body = (
    <>
      {/* Identity header: category icon reuses the user_type meta emoji.
          Desktop gets a light-green band, circular icon badge, name heading
          with live form value, role subtitle, and the tier pill at right. */}
      <section className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 md:bg-[#16a34a]/10 md:border-[#16a34a]/30 md:p-5">
        <span aria-hidden className="hidden md:grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-2xl shadow-sm ring-1 ring-[#16a34a]/20">
          {meta.emoji}
        </span>
        <span className="text-4xl md:hidden">{meta.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold leading-tight truncate md:text-xl md:text-[#111827]">
            {form.full_name || profile?.full_name || user?.email}
          </p>
          <p className="text-sm text-muted-foreground md:text-[#15803d] md:font-semibold">{meta.label}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full border text-sm font-semibold whitespace-nowrap shrink-0 ${tier.className}`}>
          {tier.emoji} {tier.label}
        </span>
      </section>

      {/* Fields card: base = original mobile sections; md: = one bordered card
          with a 2-col grid (Mag-ulat step-3 pattern) reusing Mag-ulat's input
          styling (min-h-[52px] text-base) plus icon prefixes. Location, land
          size, and the save button span both desktop columns. */}
      <section className="space-y-4 md:rounded-2xl md:border md:border-border md:bg-card md:p-5 md:space-y-5">
        <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          <div className="space-y-2">
            <Label htmlFor="ps-name">Pangalan</Label>
            <div className="relative">
              <span className="hidden md:block"><FieldIcon Icon={User} /></span>
              <Input id="ps-name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className="min-h-[52px] text-base md:pl-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ps-phone">Numero ng telepono</Label>
            <div className="relative">
              <span className="hidden md:block"><FieldIcon Icon={Phone} /></span>
              <Input id="ps-phone" inputMode="tel" value={form.phone_number} onChange={(e) => set("phone_number", e.target.value)} className="min-h-[52px] text-base md:pl-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ps-msgr">Messenger username</Label>
            <div className="relative">
              <span className="hidden md:block"><FieldIcon Icon={MessageCircle} /></span>
              <Input id="ps-msgr" value={form.messenger_username} onChange={(e) => set("messenger_username", e.target.value)} className="min-h-[52px] text-base md:pl-10" />
            </div>
            {sanitizeMessenger(form.messenger_username) && (
              <p className="text-sm text-muted-foreground">m.me/{sanitizeMessenger(form.messenger_username)}</p>
            )}
          </div>

          {producer && (
            <>
              <div className="space-y-2">
                <Label>Pangunahing produkto</Label>
                <div className="relative">
                  {/* Desktop-only commodity icon inline in the trigger, same
                      pattern as Mag-ulat step 2. The shadcn Select already
                      renders its own chevron. */}
                  {form.primary_commodity && (
                    <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 hidden -translate-y-1/2 text-xl leading-none md:block">
                      {getCommodityIcon(form.primary_commodity)}
                    </span>
                  )}
                  <Select value={form.primary_commodity} onValueChange={(v) => set("primary_commodity", v)}>
                    <SelectTrigger className="min-h-[52px] text-base md:pl-10">
                      <SelectValue placeholder="Pumili ng produkto" />
                    </SelectTrigger>
                    <SelectContent className="z-[2000]">
                      {commodities.map((c) => (
                        <SelectItem key={c.id} value={c.name} className="text-base">
                          {c.emoji ? `${c.emoji} ` : ""}{c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ps-loc">Lokasyon ng sakahan / pangisdaan</Label>
                <div className="relative">
                  <span className="hidden md:block"><FieldIcon Icon={MapPin} /></span>
                  <Textarea id="ps-loc" rows={2} value={form.farm_location} onChange={(e) => set("farm_location", e.target.value)} className="text-base md:pl-10 md:pt-3" />
                </div>
              </div>
              {profile?.user_type === "fisherfolk" ? (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="ps-vessel">Uri ng bangka / vessel</Label>
                  <div className="relative">
                    <span className="hidden md:block"><FieldIcon Icon={Ship} /></span>
                    <Input id="ps-vessel" value={form.vessel_type} onChange={(e) => set("vessel_type", e.target.value)} className="min-h-[52px] text-base md:pl-10" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="ps-area">Laki ng lupa (hektarya)</Label>
                  <div className="relative">
                    <span className="hidden md:block"><FieldIcon Icon={Ruler} /></span>
                    <Input id="ps-area" value={form.land_area} onChange={(e) => set("land_area", e.target.value)} className="min-h-[52px] text-base md:pl-10" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <Button onClick={save} disabled={busy} className="w-full min-h-[56px] text-base font-bold bg-primary hover:bg-primary/90 md:bg-[#16a34a] md:hover:bg-[#15803d]">
          <Save aria-hidden className="hidden md:inline h-5 w-5" />
          {busy ? "Sandali..." : "I-save ang pagbabago"}
        </Button>
      </section>

        {/* Verification info box: shield icon + live tier heading + next-tier
            hint. Same light muted band on both breakpoints.
            BACKEND NOTE: `tier` is read from user_profiles.verification_tier
            (real per-user data, not a placeholder), but the upgrade/vouching
            flow behind it does not exist yet — the hints themselves say
            "malapit nang dumating". Tier promotion is a separate task. */}
        <section className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
          <p className="text-base font-bold flex items-center gap-2">
            <ShieldCheck aria-hidden className="h-5 w-5 text-[#2563eb] shrink-0" />
            Verification tier: {tier.emoji} {tier.label}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {UPGRADE_HINT[(profile?.verification_tier as string) ?? "basic"] ?? UPGRADE_HINT.basic}
          </p>
        </section>

        {/* Mobile-only QR section (kept inline). On desktop this same content
            lives in the right rail — see the DesktopLayout rightPanel below. */}
        {profileUrl && (
          <section className="space-y-2 md:hidden">
            <p className="text-base font-bold">Aking QR profile</p>
            <QrCodeCard url={profileUrl} fileName={`agrimap-${user?.id.slice(0, 8)}`} caption={profileUrl} />
            <Button asChild variant="ghost" className="w-full min-h-[48px] text-base">
              <Link to={`/profile/${user?.id}`}>Tingnan ang pampublikong profile</Link>
            </Button>
          </section>
        )}
    </>
  );

  // Logout is kept next to the title on both branches (mobile keeps the
  // original sticky header verbatim).
  const logoutButton = (
    <button onClick={() => { signOut(); navigate("/"); }} className="flex items-center gap-1 text-sm font-semibold text-muted-foreground shrink-0">
      <LogOut className="h-4 w-4" /> Logout
    </button>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" aria-label="Bumalik" className="p-2 -ml-2"><ChevronLeft className="h-6 w-6" /></Link>
            <h1 className="text-lg font-bold">Aking Profile</h1>
          </div>
          {logoutButton}
        </header>

        <main className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-16">
          {body}
        </main>
      </div>
    );
  }

  // Desktop: same shared shell as Mapa/Listahan/Mag-ulat (sidebar + header).
  // tab={null} so no nav item highlights — Profile is not a tab. The sidebar
  // category list is inert for live filtering here; MapSidebar hands those
  // clicks off to /mapa?category=... instead. The desktop page keeps a small
  // account-icon action on the header's far right — the existing
  // ProfileButton (initial/avatar linking to this page), shared with the
  // other pages, rather than a new icon.
  return (
    <div className="flex h-screen w-screen overflow-hidden flex-col bg-[#f9fafb]">
      <div className="relative flex-1 flex flex-col h-full">
        <main className="flex-1 min-h-0 flex min-h-0">
          <DesktopLayout
            tab={null}
            category="all"
            onCategoryChange={() => {}}
            onCommodityChange={() => {}}
            rightPanel={
              <ProfileQrPanel profileUrl={profileUrl} userId={user?.id} />
            }
            header={
              <ProfileHeader
                rightSlot={
                  <div className="flex items-center gap-2">
                    <LanguageToggle inline />
                    <ProfileButton inline />
                  </div>
                }
              />
            }
          >
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-6 py-6 space-y-6 pb-16">
                {/* Page title row: back chevron + left-aligned heading */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Link
                      to="/mapa"
                      aria-label="Bumalik sa Mapa"
                      className="p-2 -ml-2 text-[#6b7280] hover:text-[#111827] transition-colors shrink-0"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Link>
                    <h1 className="text-2xl font-extrabold tracking-tight text-[#111827]">Aking Profile</h1>
                  </div>
                  {logoutButton}
                </div>
                {body}
              </div>
            </div>
          </DesktopLayout>
        </main>
      </div>
    </div>
  );
};

export default ProfileSettings;
