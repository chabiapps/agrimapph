import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { UserProfile, fetchProfile, isProducer, tierMeta, userTypeMeta } from "@/lib/profile";
import QrCodeCard from "@/components/QrCodeCard";
import { Button } from "@/components/ui/button";
import { getCommodityIcon } from "@/lib/categories";

interface RecentReport {
  subcategory: string | null;
  status: string | null;
  record_type: string | null;
  municipality: string | null;
  province: string | null;
  created_at: string | null;
}

const PublicProfile = () => {
  const { userId = "" } = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [count, setCount] = useState(0);
  const [recent, setRecent] = useState<RecentReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const p = await fetchProfile(userId);
      const { data, count: c } = await supabase
        .from("agri_reports")
        .select("subcategory, status, record_type, municipality, province, created_at", { count: "exact" })
        .eq("reported_by", userId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (!active) return;
      setProfile(p);
      setCount(c ?? 0);
      setRecent(((data as unknown as RecentReport[]) ?? [])[0] ?? null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [userId]);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading...</div>;

  if (!profile) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center gap-4">
        <div>
          <p className="text-xl font-bold mb-2">Walang nakitang profile</p>
          <Link to="/" className="text-primary font-semibold underline-offset-4 hover:underline">Bumalik sa mapa</Link>
        </div>
      </div>
    );
  }

  const meta = userTypeMeta(profile.user_type);
  const tier = tierMeta(profile.verification_tier);
  const url = `${window.location.origin}/profile/${profile.id}`;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <section className="text-center space-y-3">
          <div className="text-6xl">{meta.emoji}</div>
          <h1 className="text-2xl font-extrabold">{profile.full_name ?? "AgriMap member"}</h1>
          <p className="text-base text-muted-foreground">{meta.label}</p>
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-base font-semibold ${tier.className}`}>
            {tier.emoji} {tier.label}
          </span>
        </section>

        {isProducer(profile.user_type) && (
          <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
            {profile.primary_commodity && (
              <p className="text-base">
                <span className="text-muted-foreground">Pangunahing produkto: </span>
                <span className="font-semibold">{getCommodityIcon(profile.primary_commodity)} {profile.primary_commodity}</span>
              </p>
            )}
            {profile.farm_location && (
              <p className="text-base">
                <span className="text-muted-foreground">Lokasyon: </span>
                <span className="font-semibold">{profile.farm_location}</span>
              </p>
            )}
            {profile.land_area && (
              <p className="text-base"><span className="text-muted-foreground">Laki ng lupa: </span><span className="font-semibold">{profile.land_area}</span></p>
            )}
            {profile.vessel_type && (
              <p className="text-base"><span className="text-muted-foreground">Vessel: </span><span className="font-semibold">{profile.vessel_type}</span></p>
            )}
          </section>
        )}

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-3xl font-extrabold text-primary">{count}</p>
            <p className="text-sm text-muted-foreground">Ulat na naipadala</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground mb-1">Pinakabagong ulat</p>
            {recent ? (
              <p className="text-base font-semibold leading-tight">
                {getCommodityIcon(recent.subcategory ?? "")} {recent.subcategory ?? "—"}
                <span className="block text-sm font-normal text-muted-foreground">
                  {[recent.municipality, recent.province].filter(Boolean).join(", ") || "—"}
                </span>
              </p>
            ) : (
              <p className="text-base text-muted-foreground">Wala pa</p>
            )}
          </div>
        </section>

        <QrCodeCard url={url} fileName={`agrimap-${profile.id.slice(0, 8)}`} caption={url} />

        <Button asChild variant="outline" className="w-full min-h-[52px] text-base font-semibold">
          <Link to="/">Bumalik sa AgriMap PH</Link>
        </Button>
      </main>
    </div>
  );
};

export default PublicProfile;
