import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Clock3, MapPin, Package, Users } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { CATEGORIES, getCommodityIcon, inferCategory } from "@/lib/categories";
import { tierMeta, userTypeMeta } from "@/lib/profile";
import {
  LocationReport,
  LocationSelection,
  locationName,
  matchesLocation,
} from "@/lib/locationProfile";

interface Reporter {
  id: string;
  full_name: string | null;
  user_type: string | null;
  verification_tier: string | null;
  primary_commodity: string | null;
}

interface Props {
  location: LocationSelection | null;
  reports: LocationReport[];
  onClose: () => void;
}

const statusMeta: Record<string, { label: string; className: string }> = {
  surplus: { label: "Sobra", className: "bg-surplus/15 text-surplus border-surplus/30" },
  deficit: { label: "Kulang", className: "bg-deficit/15 text-deficit border-deficit/30" },
  balanced: { label: "Sapat", className: "bg-balanced/15 text-balanced-foreground border-balanced/40" },
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fil-PH", { month: "short", day: "numeric", year: "numeric" });
};

const countdown = (value?: string | null) => {
  if (!value) return "";
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
  if (Number.isNaN(days)) return "";
  if (days < 0) return `${Math.abs(days)} araw na ang nakalipas`;
  if (days === 0) return "Ani ngayon";
  const weeks = Math.ceil(days / 7);
  return weeks === 1 ? "Ani sa 1 linggo" : `Ani sa ${weeks} linggo`;
};

const LocationProfileSheet = ({ location, reports, onClose }: Props) => {
  const [reporters, setReporters] = useState<Reporter[]>([]);

  const localReports = useMemo(
    () => location ? reports.filter((report) => matchesLocation(report, location)) : [],
    [location, reports],
  );

  const currentReports = useMemo(
    () => localReports.filter((report) => (report.record_type ?? "current_supply") === "current_supply"),
    [localReports],
  );

  const statusCounts = useMemo(() => ({
    surplus: currentReports.filter((report) => report.status === "surplus").length,
    deficit: currentReports.filter((report) => report.status === "deficit").length,
    balanced: currentReports.filter((report) => report.status === "balanced").length,
  }), [currentReports]);

  const products = useMemo(() => {
    const latest = new Map<string, LocationReport>();
    currentReports.forEach((report) => {
      const name = report.subcategory ?? report.commodity;
      if (!name) return;
      const previous = latest.get(name);
      const reportTime = new Date(report.updated_at ?? report.created_at ?? 0).getTime();
      const previousTime = new Date(previous?.updated_at ?? previous?.created_at ?? 0).getTime();
      if (!previous || reportTime >= previousTime) latest.set(name, report);
    });
    const grouped = new Map<string, LocationReport[]>();
    [...latest.values()]
      .sort((a, b) => new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime())
      .forEach((report) => {
        const category = report.category ?? inferCategory(report.subcategory ?? report.commodity);
        grouped.set(category, [...(grouped.get(category) ?? []), report]);
      });
    return [...grouped.entries()];
  }, [currentReports]);

  const planting = useMemo(
    () => localReports
      .filter((report) => report.record_type === "planting_intention")
      .sort((a, b) => new Date(a.expected_harvest_date ?? 0).getTime() - new Date(b.expected_harvest_date ?? 0).getTime()),
    [localReports],
  );

  useEffect(() => {
    const ids = [...new Set(localReports.map((report) => report.reported_by).filter(Boolean) as string[])];
    if (!location || ids.length === 0) {
      setReporters([]);
      return;
    }
    let active = true;
    db.from("user_profiles")
      .select("id, full_name, user_type, verification_tier, primary_commodity")
      .in("id", ids)
      .then(({ data }) => {
        if (active) setReporters((data ?? []) as Reporter[]);
      });
    return () => { active = false; };
  }, [location, localReports]);

  const latest = localReports.reduce<string | null>((value, report) => {
    const timestamp = report.updated_at ?? report.created_at ?? null;
    return timestamp && (!value || timestamp > value) ? timestamp : value;
  }, null);
  const statusTotal = statusCounts.surplus + statusCounts.deficit + statusCounts.balanced;

  return (
    <Sheet open={Boolean(location)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl p-0 max-h-[82vh] overflow-y-auto !bottom-[72px] z-[1200] [&_~_[data-radix-dialog-overlay]]:z-[1150]"
      >
        <div className="sticky top-0 z-10 border-b border-border bg-background px-5 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" aria-hidden />
          <SheetHeader className="pr-8 text-left">
            <SheetTitle className="flex items-start gap-2 text-xl font-extrabold leading-tight">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              {location ? locationName(location) : ""}
            </SheetTitle>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{localReports.length} ulat</span>
              <span>Huling update: {formatDate(latest)}</span>
            </div>
          </SheetHeader>
        </div>

        <div className="space-y-7 px-5 py-5">
          <section className="space-y-3">
            <h2 className="text-base font-bold">Kalagayan ng Pagkain</h2>
            <div className="grid grid-cols-3 gap-2">
              {(["surplus", "deficit", "balanced"] as const).map((status) => (
                <div key={status} className={`rounded-md border px-2 py-2 text-center ${statusMeta[status].className}`}>
                  <div className="text-xl font-extrabold">{statusCounts[status]}</div>
                  <div className="text-xs font-semibold">{statusMeta[status].label}</div>
                </div>
              ))}
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" aria-label="Bahagi ng bawat kalagayan">
              {statusTotal > 0 && <>
                <div className="bg-surplus" style={{ width: `${statusCounts.surplus / statusTotal * 100}%` }} />
                <div className="bg-deficit" style={{ width: `${statusCounts.deficit / statusTotal * 100}%` }} />
                <div className="bg-balanced" style={{ width: `${statusCounts.balanced / statusTotal * 100}%` }} />
              </>}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-bold"><Package className="h-4 w-4 text-primary" /> Mga Produkto</h2>
            {products.length === 0 && <p className="text-sm text-muted-foreground">Wala pang kasalukuyang ulat ng produkto.</p>}
            {products.map(([category, items]) => {
              const definition = CATEGORIES.find((item) => item.key === category);
              return (
                <div key={category} className="space-y-2">
                  <h3 className="text-xs font-bold uppercase text-muted-foreground">{definition?.icon ?? "🌿"} {definition?.label ?? "Iba Pa"}</h3>
                  <div className="divide-y divide-border border-y border-border">
                    {items.map((report) => {
                      const name = report.subcategory ?? report.commodity ?? "Produkto";
                      const status = statusMeta[report.status] ?? statusMeta.balanced;
                      return (
                        <div key={report.id} className="flex items-center gap-3 py-3">
                          <span className="text-2xl" aria-hidden>{getCommodityIcon(name, report.category)}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{name}</p>
                            <p className="text-sm text-muted-foreground">{report.price != null ? `₱${Number(report.price).toLocaleString("en-PH")}` : "Walang presyo"} · {report.volume ?? "Walang dami"}</p>
                          </div>
                          <Badge variant="outline" className={status.className}>{status.label}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>

          {planting.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-base font-bold"><CalendarDays className="h-4 w-4 text-primary" /> Paparating</h2>
              <div className="divide-y divide-border border-y border-border">
                {planting.map((report) => {
                  const name = report.subcategory ?? report.commodity ?? "Produkto";
                  return (
                    <div key={report.id} className="flex items-start gap-3 py-3">
                      <span className="text-2xl" aria-hidden>{getCommodityIcon(name, report.category)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{name}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(report.expected_harvest_date)} · {report.expected_volume ?? report.volume ?? "—"}</p>
                        {report.growth_stage && <p className="text-sm text-muted-foreground">{report.growth_stage}</p>}
                      </div>
                      <span className="max-w-[112px] text-right text-xs font-bold text-primary"><Clock3 className="mb-1 ml-auto h-4 w-4" />{countdown(report.expected_harvest_date)}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="space-y-3 pb-3">
            <h2 className="flex items-center gap-2 text-base font-bold"><Users className="h-4 w-4 text-primary" /> Mga Nagtatrabaho Dito</h2>
            {reporters.length === 0 && <p className="text-sm text-muted-foreground">Wala pang pampublikong reporter profile.</p>}
            <div className="divide-y divide-border border-y border-border">
              {reporters.map((reporter) => {
                const userType = userTypeMeta(reporter.user_type);
                const tier = tierMeta(reporter.verification_tier);
                return (
                  <Link key={reporter.id} to={`/profile/${reporter.id}`} onClick={onClose} className="flex min-h-[64px] items-center gap-3 py-3">
                    <span className="text-2xl" aria-hidden>{userType.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{reporter.full_name ?? "AgriMap member"}</p>
                      <p className="truncate text-sm text-muted-foreground">{reporter.primary_commodity ? `${getCommodityIcon(reporter.primary_commodity)} ${reporter.primary_commodity}` : userType.label}</p>
                    </div>
                    <Badge variant="outline" className={tier.className}>{tier.emoji} {tier.label}</Badge>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LocationProfileSheet;