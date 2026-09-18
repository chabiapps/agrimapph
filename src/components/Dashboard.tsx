import { useEffect, useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile"; // wait, it should be "@/hooks/use-mobile"
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { X, MapPin, Calendar, Clock, TrendingUp, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getCommodityIcon } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardProps {
  setTab: (tab: "map" | "list" | "dashboard" | "report") => void;
  setCommodity: (c: string) => void;
  setStatus: (s: string[]) => void;
  setMapMode: (m: "current_supply" | "planting_intention") => void;
  setSelected: (report: any) => void;
}

interface Row {
  id: string;
  subcategory: string | null;
  category: string | null;
  status: string | null;
  price: number | null;
  region: string | null;
  province: string | null;
  municipality: string | null;
  barangay: string | null;
  reported_by: string | null;
  created_at: string | null;
  lat: number;
  lng: number;
  record_type: string | null;
  expected_harvest_date: string | null;
}

const peso = (n: number) => `₱${Math.round(n).toLocaleString("en-PH")}`;

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const Dashboard = ({ setTab, setCommodity, setStatus, setMapMode, setSelected }: DashboardProps) => {
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [trendCommodity, setTrendCommodity] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await supabase
          .from("agri_reports")
          .select("*")
          .order("created_at", { ascending: false });
        if (data) setRows((data as unknown as Row[]));
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchCoords = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // Gracefully ignore denial
      );
    };

    fetchData();
    fetchCoords();
  }, []);

  useEffect(() => {
    if (!trendCommodity && rows.length) {
      const commodities = [...new Set(rows.map(r => r.subcategory).filter(Boolean) as string[])].sort();
      if (commodities.length) setTrendCommodity(commodities[0]);
    }
  }, [rows, trendCommodity]);

  // 1. Hero: High Need (Deficit) commodities sorted by price descending
  const highNeed = useMemo(() => {
    const deficits = rows.filter(r => r.status === "deficit" && r.record_type === "current_supply");
    const bestPricePerCommodity = new Map<string, Row>();
    deficits.forEach(r => {
      if (!r.subcategory) return;
      const current = bestPricePerCommodity.get(r.subcategory);
      if (!current || (r.price ?? 0) > (current.price ?? 0)) {
        bestPricePerCommodity.set(r.subcategory, r);
      }
    });
    return [...bestPricePerCommodity.values()].sort((a, b) => (b.price ?? 0) - (a.price ?? 0)).slice(0, 10);
  }, [rows]);

  // 2. Nearby Active Listings
  const nearbyActive = useMemo(() => {
    if (!userCoords) return [];
    return rows
      .filter(r => r.record_type === "current_supply")
      .map(r => ({ ...r, distance: calculateDistance(userCoords.lat, userCoords.lng, r.lat, r.lng) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }, [rows, userCoords]);

  // 3. Weekly New Reports
  const newReportsCount = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return rows.filter(r => r.created_at && new Date(r.created_at) > oneWeekAgo).length;
  }, [rows]);

  // 4. Price Gaps
  const gaps = useMemo(() => {
    const byCommodity = new Map<string, Row[]>();
    rows.forEach((r) => {
      if (!r.subcategory || r.price == null) return;
      const list = byCommodity.get(r.subcategory) ?? [];
      list.push(r);
      byCommodity.set(r.subcategory, list);
    });
    const out: { commodity: string; category: string | null; low: Row; high: Row; gap: number }[] = [];
    byCommodity.forEach((list, commodity) => {
      const sur = list.filter((r) => r.status === "surplus");
      const def = list.filter((r) => r.status === "deficit");
      if (!sur.length || !def.length) return;
      const low = sur.reduce((a, b) => ((a.price ?? 0) <= (b.price ?? 0) ? a : b));
      const high = def.reduce((a, b) => ((a.price ?? 0) >= (b.price ?? 0) ? a : b));
      const gap = (high.price ?? 0) - (low.price ?? 0);
      if (gap <= 0) return;
      out.push({ commodity, category: low.category, low, high, gap });
    });
    return out.sort((a, b) => b.gap - a.gap).slice(0, 5);
  }, [rows]);

  // 5. Upcoming Harvests Nearby
  const upcomingNearby = useMemo(() => {
    if (!userCoords) return [];
    const now = new Date();
    const fourWeeksOut = new Date();
    fourWeeksOut.setDate(fourWeeksOut.getDate() + 28);

    return rows
      .filter(r => {
        if (r.record_type !== "planting_intention" || !r.expected_harvest_date) return false;
        const d = new Date(r.expected_harvest_date);
        return d >= now && d <= fourWeeksOut;
      })
      .map(r => ({ ...r, distance: calculateDistance(userCoords.lat, userCoords.lng, r.lat, r.lng) }))
      .sort((a, b) => {
        const dateA = new Date(a.expected_harvest_date!).getTime();
        const dateB = new Date(b.expected_harvest_date!).getTime();
        return dateA - dateB;
      })
      .slice(0, 5);
  }, [rows, userCoords]);

  // Trend data
  const trend = useMemo(() => {
    const buckets = new Map<string, { sum: number; n: number }>();
    rows.forEach((r) => {
      if (!r.created_at || r.price == null || r.subcategory !== trendCommodity) return;
      const k = r.created_at.slice(0, 7);
      const b = buckets.get(k) ?? { sum: 0, n: 0 };
      b.sum += Number(r.price);
      b.n += 1;
      buckets.set(k, b);
    });
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, b]) => ({ month: k, avg: Math.round(b.sum / b.n) }));
  }, [rows, trendCommodity]);

  return (
    <div className="h-full w-full overflow-y-auto bg-background pb-10">
      <div className={cn("p-4 space-y-8", !isMobile && "max-w-7xl mx-auto")}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">📊 Buod</h1>
          <span className="text-xs text-muted-foreground">Na-update ngayon</span>
        </div>

        {/* Hero: High Need */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔴</span>
            <h2 className="text-lg font-bold">Pinakamataas na Kailangan Ngayon</h2>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-2 snap-x no-scrollbar">
            {highNeed.length === 0 ? (
              <p className="text-sm text-muted-foreground">Walang kasalukuyang deficit.</p>
            ) : (
              highNeed.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setCommodity(item.subcategory!);
                    setStatus(['deficit']);
                    setTab('map');
                  }}
                  className="snap-start shrink-0 w-[200px] rounded-2xl border-2 border-red-100 bg-white p-4 shadow-sm hover:border-red-500 transition-all cursor-pointer active:scale-95"
                >
                  <div className="text-3xl mb-2">{getCommodityIcon(item.subcategory!, item.category!)}</div>
                  <p className="font-bold text-lg truncate">{item.subcategory}</p>
                  <p className="text-2xl font-extrabold text-red-600 my-1">{peso(item.price ?? 0)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.municipality}, {item.province}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Stats Section */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {loading ? (
            <>
              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div
                onClick={() => {
                  setTab('list');
                }}
                className="rounded-2xl border border-border bg-white p-5 shadow-sm flex items-center justify-between cursor-pointer active:scale-95 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-2xl">📈</div>
                  <div>
                    <p className="text-3xl font-extrabold text-primary">{rows.filter(r => {
                      const d = new Date(r.created_at!);
                      return d > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    }).length}</p>
                    <p className="text-sm text-muted-foreground font-medium">Bagong Presyo Ngayong Linggo</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              {userCoords && (
                <div className="rounded-2xl border border-border bg-white p-5 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">📍</div>
                    <div>
                      <p className="text-3xl font-extrabold text-blue-600">{nearbyActive.length}</p>
                      <p className="text-sm text-muted-foreground font-medium">Presyo Malapit Sa Iyo</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Nearby Prices & Price Gaps Row */}
        <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-2")}>
          {userCoords && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <h2 className="text-lg font-bold">Presyo Malapit Sa Iyo</h2>
              </div>
              <div className="grid gap-3">
                {nearbyActive.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Walang ulat sa iyong area.</p>
                ) : (
                  nearbyActive.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className="flex items-center justify-between p-4 rounded-2xl border border-border bg-white hover:bg-gray-50 cursor-pointer active:scale-95 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getCommodityIcon(r.subcategory!, r.category!)}</span>
                        <div>
                          <p className="font-bold">{r.subcategory}</p>
                          <p className="text-xs text-muted-foreground">{r.municipality}, {r.province} · {Math.round(r.distance)}km</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-extrabold text-lg">{peso(r.price ?? 0)}</p>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📉</span>
              <h2 className="text-lg font-bold">Pinakamalaking Pagkakaiba ng Presyo</h2>
            </div>
            <div className="grid gap-3">
              {gaps.length === 0 ? (
                <p className="text-sm text-muted-foreground">Wala pang sapat na datos.</p>
              ) : (
                gaps.map((g) => (
                  <div
                    key={g.commodity}
                    onClick={() => {
                      setCommodity(g.commodity);
                      setStatus(['surplus', 'deficit']);
                      setTab('map');
                    }}
                    className="rounded-2xl border border-border bg-white p-4 shadow-sm hover:border-primary transition-all cursor-pointer active:scale-95"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-bold flex items-center gap-2">
                        {getCommodityIcon(g.commodity, g.category!)} {g.commodity}
                      </p>
                      <Badge variant="outline" className="text-xs">{peso(g.gap)} gap</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-2 rounded-lg bg-green-50 border border-green-100">
                        <p className="text-green-700 font-bold">🟢 {g.low.municipality}</p>
                        <p className="text-green-600 font-medium">{peso(g.low.price ?? 0)}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-red-50 border border-red-100">
                        <p className="text-red-700 font-bold">🔴 {g.high.municipality}</p>
                        <p className="text-red-600 font-medium">{peso(g.high.price ?? 0)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Upcoming Harvests */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌱</span>
            <h2 className="text-lg font-bold">Aanihin Malapit</h2>
          </div>
          <div className="grid gap-3">
            {upcomingNearby.length === 0 ? (
              <p className="text-sm text-muted-foreground">Walang inaasahang ani malapit sa iyo.</p>
            ) : (
              upcomingNearby.map((r) => (
                <div
                  key={r.id}
                  onClick={() => {
                    setCommodity(r.subcategory!);
                    setTab('list');
                    setMapMode('planting_intention');
                  }}
                  className="flex items-center justify-between p-4 rounded-2xl border border-border bg-white hover:bg-gray-50 cursor-pointer active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getCommodityIcon(r.subcategory!, r.category!)}</span>
                    <div>
                      <p className="font-bold">{r.subcategory}</p>
                      <p className="text-xs text-muted-foreground">{r.municipality}, {r.province}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-600 font-bold text-sm">
                      <Calendar className="h-3 w-3" />
                      {new Date(r.expected_harvest_date!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Expected</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Trend Chart */}
        <section className="space-y-3 pb-10">
          <div className="flex items-center gap-2">
            <span className="text-lg">📈</span>
            <h2 className="text-lg font-bold">Trend ng Presyo</h2>
          </div>
          <div className="space-y-3">
            <select
              value={trendCommodity}
              onChange={(e) => setTrendCommodity(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-input bg-white px-3 text-base outline-none focus:ring-2 focus:ring-primary/20"
            >
              {[...new Set(rows.map(r => r.subcategory).filter(Boolean) as string[])].sort().map((c) => (
                <option key={c} value={c}>{`${getCommodityIcon(c)} ${c}`}</option>
              ))}
            </select>
            <div
              onClick={() => {
                setCommodity(trendCommodity);
                setTab('list');
              }}
              className="rounded-2xl border border-border bg-white p-3 shadow-sm cursor-pointer hover:border-primary transition-all"
            >
              {trend.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Walang datos ng presyo.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `₱${v}`} />
                    <Tooltip formatter={(v: number) => peso(v)} />
                    <Line type="monotone" dataKey="avg" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
