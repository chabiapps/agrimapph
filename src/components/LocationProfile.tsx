import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";
import { getCommodityIcon, CATEGORIES, inferCategory } from "@/lib/categories";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface Location {
  barangay: string | null;
  municipality: string | null;
  province: string | null;
  region: string | null;
}

interface LocationProfileProps {
  location: Location | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Report {
  status: string;
  created_at: string;
  subcategory: string | null;
  category: string | null;
  price: number | null;
  price_unit: string | null;
  volume: string | null;
  record_type: string | null;
  expected_harvest_date: string | null;
  growth_stage: string | null;
  expected_volume: string | null;
  user_id: string | null;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  user_type: string | null;
  verification_tier: string | null;
}

export const LocationProfile = ({ location, isOpen, onClose }: LocationProfileProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    surplus: 0,
    deficit: 0,
    balanced: 0,
    lastUpdated: "",
  });
  const [reports, setReports] = useState<Report[]>([]);
  const [reporters, setReporters] = useState<{ profile: UserProfile; primaryCommodity: string }[]>([]);

  const getCountdown = (dateStr?: string | null) => {
    if (!dateStr) return "";
    const harvestDate = new Date(dateStr);
    const today = new Date();
    const diffTime = harvestDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "Ani na!";
    if (diffDays < 7) return `Ani sa ${diffDays} araw`;
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;
    return days === 0 ? `Ani sa ${weeks} linggo` : `Ani sa ${weeks} linggo at ${days} araw`;
  };

  useEffect(() => {
    if (!location || !isOpen) return;

    const fetchLocationData = async () => {
      setLoading(true);
      try {
        const { data: reportsData, error: reportsError } = await supabase
          .from("agri_reports")
          .select("status, created_at, subcategory, category, price, price_unit, volume, record_type, expected_harvest_date, growth_stage, expected_volume, user_id")
          .eq("barangay", location.barangay)
          .eq("municipality", location.municipality)
          .eq("province", location.province)
          .order("created_at", { ascending: false });

        if (reportsError) throw reportsError;

        if (reportsData && reportsData.length > 0) {
          const surplus = reportsData.filter((r) => r.status === "surplus").length;
          const deficit = reportsData.filter((r) => r.status === "deficit").length;
          const balanced = reportsData.filter((r) => r.status === "balanced").length;

          const lastUpdated = new Date(reportsData[0].created_at!).toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          setStats({
            total: reportsData.length,
            surplus,
            deficit,
            balanced,
            lastUpdated,
          });
          setReports(reportsData);

          const userIds = [...new Set(reportsData.map(r => r.user_id).filter(Boolean))] as string[];
          if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from("user_profiles")
              .select("id, full_name, user_type, verification_tier")
              .in("id", userIds);

            if (!profilesError && profilesData) {
              const reporterList = profilesData.map(profile => {
                const userReport = reportsData.find(r => r.user_id === profile.id);
                return {
                  profile: profile as UserProfile,
                  primaryCommodity: userReport?.subcategory || "Unknown",
                };
              });
              setReporters(reporterList);
            }
          }
        } else {
          setStats({ total: 0, surplus: 0, deficit: 0, balanced: 0, lastUpdated: "No data" });
          setReports([]);
          setReporters([]);
        }
      } catch (err) {
        console.error("Error fetching location profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocationData();
  }, [location, isOpen]);

  if (!isOpen || !location) return null;

  const content = (
    <div className="flex flex-col h-full w-full space-y-8 py-4 overflow-y-auto">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2">
          {isMobile ? (
            <DrawerTitle className="text-2xl font-bold leading-tight">
              {location.barangay} <span className="text-muted-foreground text-lg">→</span> {location.municipality} <span className="text-muted-foreground text-lg">→</span> {location.province}
            </DrawerTitle>
          ) : (
            <SheetTitle className="text-2xl font-bold leading-tight">
              {location.barangay} <span className="text-muted-foreground text-lg">→</span> {location.municipality} <span className="text-muted-foreground text-lg">→</span> {location.province}
            </SheetTitle>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{stats.total} Total Reports</span>
            <span>•</span>
            <span>Updated: {stats.lastUpdated}</span>
          </div>
        </div>
        {isMobile && (
          <button onClick={onClose} className="p-2 rounded-full hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Kukuha ng datos...</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center p-3 rounded-2xl border border-border bg-card space-y-1">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Sobra</Badge>
              <span className="text-2xl font-bold text-green-600">{stats.surplus}</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-2xl border border-border bg-card space-y-1">
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Kulang</Badge>
              <span className="text-2xl font-bold text-red-600">{stats.deficit}</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-2xl border border-border bg-card space-y-1">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Sapat</Badge>
              <span className="text-2xl font-bold text-yellow-600">{stats.balanced}</span>
            </div>
          </div>

          <section className="space-y-4">
            <h2 className="text-lg font-bold">Mga Produkto</h2>
            {reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">Walang mga produktong naiulat.</p>
            ) : (
              CATEGORIES.map((cat) => {
                const catReports = reports.filter((r) => (r.category || inferCategory(r.subcategory)).toLowerCase() === cat.key);
                if (catReports.length === 0) return null;
                return (
                  <div key={cat.key} className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{cat.label}</h3>
                    <div className="space-y-2">
                      {catReports.map((r, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{getCommodityIcon(r.subcategory, r.category)}</span>
                            <div>
                              <p className="text-sm font-medium">{r.subcategory}</p>
                              <p className="text-xs text-muted-foreground">
                                {r.price != null ? `₱${r.price} ${r.price_unit || ""}` : "No price"} • {r.volume || "—"}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              r.status === "surplus" ? "bg-green-50 text-green-700 border-green-200" :
                              r.status === "deficit" ? "bg-red-50 text-red-700 border-red-200" :
                              "bg-yellow-50 text-yellow-700 border-yellow-200"
                            }
                          >
                            {r.status === "surplus" ? "Sobra" : r.status === "deficit" ? "Kulang" : "Sapat"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold">Paparating</h2>
            {reports.filter(r => r.record_type === "planting_intention").length === 0 ? (
              <p className="text-sm text-muted-foreground">Walang mga paparating na ani.</p>
            ) : (
              <div className="space-y-3">
                {reports.filter(r => r.record_type === "planting_intention").map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getCommodityIcon(r.subcategory, r.category)}</span>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{r.subcategory}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{r.expected_harvest_date ? new Date(r.expected_harvest_date).toLocaleDateString("en-PH", { month: 'short', day: 'numeric' }) : "—"}</span>
                          <span>•</span>
                          <span className="font-medium text-primary">{getCountdown(r.expected_harvest_date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant="outline"
                        className={
                          r.growth_stage === "Bagong Tanim" ? "bg-blue-50 text-blue-700 border-blue-200" :
                          r.growth_stage === "Lumalaki" ? "bg-green-50 text-green-700 border-green-200" :
                          r.growth_stage === "Malapit nang Anihin" ? "bg-orange-50 text-orange-700 border-orange-200" :
                          "bg-gray-50 text-gray-700 border-gray-200"
                        }
                      >
                        {r.growth_stage || "—"}
                      </Badge>
                      <span className="text-xs font-medium">{r.expected_volume || "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold">Mga Nagtatrabaho Dito</h2>
            {reporters.length === 0 ? (
              <p className="text-sm text-muted-foreground">Walang mga reporter na nakita sa lugar na ito.</p>
            ) : (
              <div className="space-y-3">
                {reporters.map((rep, i) => {
                  const typeIcons: Record<string, string> = { farmer: "🌾", fisherman: "🐟", livestock: "🐖", trader: "🚚" };
                  const tierColors: Record<string, string> = { basic: "bg-blue-50 text-blue-700 border-blue-200", community: "bg-yellow-50 text-yellow-700 border-yellow-200", government: "bg-green-50 text-green-700 border-green-200" };
                  const tierLabels: Record<string, string> = { basic: "Basic", community: "LGU Verified", government: "Government" };
                  return (
                    <div
                      key={i}
                      onClick={() => navigate(`/profile/${rep.profile.id}`)}
                      className="flex items-center justify-between p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{typeIcons[rep.profile.user_type || ""] || "👤"}</span>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{rep.profile.full_name || "Anonymous"}</p>
                          <p className="text-xs text-muted-foreground">Primary: {rep.primaryCommodity}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={tierColors[rep.profile.verification_tier || "basic"] || tierColors.basic}>
                        {tierLabels[rep.profile.verification_tier || "basic"] || "Basic"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[80vh]">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[360px] p-0">
        <div className="h-full flex flex-col p-6">
          {content}
        </div>
      </SheetContent>
    </Sheet>
  );
};
