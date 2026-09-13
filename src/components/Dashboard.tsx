import { useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";
import { getCommodityIcon } from "@/lib/categories";

interface Row {
  subcategory: string | null;
  category: string | null;
  status: string | null;
  price: number | null;
  region: string | null;
  province: string | null;
  municipality: string | null;
  reported_by: string | null;
  created_at: string | null;
}

const peso = (n: number) => `₱${Math.round(n).toLocaleString("en-PH")}`;

const locLabel = (r: Row) =>
  [r.municipality, r.province].filter(Boolean).join(", ") || r.region || "—";

const monthKey = (iso: string) => iso.slice(0, 7);
const monthLabel = (k: string) => {
  const [y, m] = k.split("-");
  const names = ["Ene","Peb","Mar","Abr","May","Hun","Hul","Ago","Set","Okt","Nob","Dis"];
  return `${names[Number(m) - 1]} ${y.slice(2)}`;
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-[16px] font-bold text-foreground">{children}</h2>
);

const Dashboard = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendCommodity, setTrendCommodity] = useState<string>("");

  useEffect(() => {
    let active = true;
    supabase
      .from("agri_reports")
      .select("subcategory, category, status, price, region, province, municipality, reported_by, created_at")
      .then(({ data }) => {
        if (!active) return;
        setRows((data ?? []) as unknown as Row[]);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => ({
    total: rows.length,
    surplus: rows.filter((r) => r.status === "surplus").length,
    deficit: rows.filter((r) => r.status === "deficit").length,
    reporters: new Set(rows.map((r) => r.reported_by).filter(Boolean)).size,
  }), [rows]);

  // Biggest price gaps: same subcategory priced low in a surplus area and
  // high in a deficit area (different locations).
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
      if (gap <= 0 || locLabel(low) === locLabel(high)) return;
      out.push({ commodity, category: low.category, low, high, gap });
    });
    return out.sort((a, b) => b.gap - a.gap).slice(0, 5);
  }, [rows]);

  const commodities = useMemo(
    () => [...new Set(rows.map((r) => r.subcategory).filter(Boolean) as string[])].sort(),
    [rows]
  );

  useEffect(() => {
    if (!trendCommodity && commodities.length) setTrendCommodity(commodities[0]);
  }, [commodities, trendCommodity]);

  const trend = useMemo(() => {
    const buckets = new Map<string, { sum: number; n: number }>();
    rows.forEach((r) => {
      if (!r.created_at || r.price == null || r.subcategory !== trendCommodity) return;
      const k = monthKey(r.created_at);
      const b = buckets.get(k) ?? { sum: 0, n: 0 };
      b.sum += Number(r.price);
      b.n += 1;
      buckets.set(k, b);
    });
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, b]) => ({ month: monthLabel(k), avg: Math.round(b.sum / b.n) }));
  }, [rows, trendCommodity]);

  const topCommodities = useMemo(() => {
    const counts = new Map<string, { n: number; category: string | null }>();
    rows.forEach((r) => {
      if (!r.subcategory) return;
      const c = counts.get(r.subcategory) ?? { n: 0, category: r.category };
      c.n += 1;
      counts.set(r.subcategory, c);
    });
    return [...counts.entries()]
      .map(([name, c]) => ({ name: `${getCommodityIcon(name, c.category)} ${name}`, count: c.n }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [rows]);

  return (
    <div className="h-full w-full overflow-y-auto bg-background">
      <div className="p-4 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold">📊 Dashboard</h1>
          <span className="text-xs text-muted-foreground mt-1 shrink-0">Na-update ngayon</span>
        </div>

        {/* 1. Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Kabuuang Ulat", value: stats.total, cls: "text-foreground" },
            { label: "Sobra na Lugar", value: stats.surplus, cls: "text-[hsl(var(--surplus))]" },
            { label: "Kulang na Lugar", value: stats.deficit, cls: "text-[hsl(var(--deficit))]" },
            { label: "Aktibong Nag-uulat", value: stats.reporters, cls: "text-primary" },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className={`text-3xl font-bold ${c.cls}`}>{loading ? "—" : c.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        {/* 2. Price gaps */}
        <section className="space-y-3">
          <SectionTitle>Pinakamalaking Pagkakaiba ng Presyo</SectionTitle>
          {gaps.length === 0 && (
            <p className="text-sm text-muted-foreground">Wala pang sapat na datos.</p>
          )}
          {gaps.map((g) => (
            <div key={g.commodity} className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2">
              <p className="font-semibold">{getCommodityIcon(g.commodity, g.category)} {g.commodity}</p>
              <div className="text-sm space-y-1">
                <p className="text-[hsl(var(--surplus))] font-medium">
                  🟢 {locLabel(g.low)} — {peso(g.low.price ?? 0)}
                </p>
                <p className="text-[hsl(var(--deficit))] font-medium">
                  🔴 {locLabel(g.high)} — {peso(g.high.price ?? 0)}
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">{peso(g.gap)} pagkakaiba</p>
            </div>
          ))}
        </section>

        {/* 3. Price trend */}
        <section className="space-y-3">
          <SectionTitle>Trend ng Presyo</SectionTitle>
          <select
            value={trendCommodity}
            onChange={(e) => setTrendCommodity(e.target.value)}
            className="w-full min-h-[48px] rounded-xl border border-input bg-card px-3 text-base"
            aria-label="Pumili ng produkto"
          >
            {commodities.map((c) => (
              <option key={c} value={c}>{`${getCommodityIcon(c)} ${c}`}</option>
            ))}
          </select>
          <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            {trend.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Walang datos ng presyo.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₱${v}`} />
                  <Tooltip formatter={(v: number) => peso(v)} />
                  <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* 4. Top commodities */}
        <section className="space-y-3 pb-4">
          <SectionTitle>Pinaka-aktibong Produkto</SectionTitle>
          <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            {topCommodities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Wala pang ulat.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, topCommodities.length * 38)}>
                <BarChart data={topCommodities} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
