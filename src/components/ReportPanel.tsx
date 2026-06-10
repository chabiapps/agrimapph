import { useMemo, useState } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AgriReport {
  id: string;
  lat: number;
  lng: number;
  status: string;
  region: string | null;
  province: string | null;
  municipality: string | null;
  barangay: string | null;
  commodity: string | null;
  price: number | null;
  volume: string | null;
  season: string | null;
}

interface ReportPanelProps {
  reports: AgriReport[];
  initialReport: AgriReport;
  onClose: () => void;
}

const statusBadge: Record<string, string> = {
  surplus: "bg-green-500/15 text-green-700 border-green-500/30",
  deficit: "bg-red-500/15 text-red-700 border-red-500/30",
  balanced: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
};

type DrillLevel = "region" | "province" | "municipality" | "barangay";
const levels: DrillLevel[] = ["region", "province", "municipality", "barangay"];
const levelKeys: Record<DrillLevel, TKey> = {
  region: "region",
  province: "province",
  municipality: "municipality",
  barangay: "barangay",
};

function SummaryBar({ items }: { items: AgriReport[] }) {
  const counts = useMemo(() => {
    const c = { surplus: 0, deficit: 0, balanced: 0 };
    items.forEach((r) => {
      if (r.status in c) c[r.status as keyof typeof c]++;
    });
    return c;
  }, [items]);

  return (
    <div className="flex items-center gap-2 text-xs mb-3">
      <span className="font-semibold text-muted-foreground">{items.length} report{items.length !== 1 ? "s" : ""}</span>
      <Badge className={`${statusBadge.surplus} text-[10px] px-1.5 py-0`}>{counts.surplus} surplus</Badge>
      <Badge className={`${statusBadge.deficit} text-[10px] px-1.5 py-0`}>{counts.deficit} deficit</Badge>
      <Badge className={`${statusBadge.balanced} text-[10px] px-1.5 py-0`}>{counts.balanced} balanced</Badge>
    </div>
  );
}

const ReportPanel = ({ reports, initialReport, onClose }: ReportPanelProps) => {
  const initialRegion = initialReport.region;

  // drill path: e.g. { region: "Region III", province: "Pampanga" }
  const [path, setPath] = useState<Partial<Record<DrillLevel, string>>>({
    region: initialRegion ?? undefined,
  });

  // Current depth
  const currentDepth = useMemo(() => {
    for (let i = levels.length - 1; i >= 0; i--) {
      if (path[levels[i]]) return i + 1;
    }
    return 0;
  }, [path]);

  const currentLevel: DrillLevel = levels[Math.min(currentDepth, levels.length - 1)];

  // Filter reports matching the current path
  const filtered = useMemo(() => {
    return reports.filter((r) => {
      for (const [key, val] of Object.entries(path)) {
        if (r[key as keyof AgriReport] !== val) return false;
      }
      return true;
    });
  }, [reports, path]);

  // Group by current level's field
  const groups = useMemo(() => {
    if (currentDepth >= levels.length) return null; // at barangay level, show individual records
    const field = levels[currentDepth];
    const map = new Map<string, AgriReport[]>();
    filtered.forEach((r) => {
      const key = (r[field as keyof AgriReport] as string) || "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, currentDepth]);

  const breadcrumbs = useMemo(() => {
    const crumbs: { label: string; level: DrillLevel; value: string }[] = [];
    for (let i = 0; i < currentDepth && i < levels.length; i++) {
      const l = levels[i];
      if (path[l]) crumbs.push({ label: levelLabels[l], level: l, value: path[l]! });
    }
    return crumbs;
  }, [path, currentDepth]);

  const goBack = () => {
    if (currentDepth <= 1) return;
    const newPath = { ...path };
    delete newPath[levels[currentDepth - 1]];
    setPath(newPath);
  };

  const drillInto = (level: DrillLevel, value: string) => {
    setPath((prev) => ({ ...prev, [level]: value }));
  };

  const goToBreadcrumb = (depth: number) => {
    const newPath: Partial<Record<DrillLevel, string>> = {};
    for (let i = 0; i <= depth; i++) {
      const l = levels[i];
      if (path[l]) newPath[l] = path[l];
    }
    setPath(newPath);
  };

  return (
    <div className="absolute z-[1000] bg-card/95 backdrop-blur-md shadow-2xl flex flex-col animate-in duration-300
      inset-x-0 bottom-0 max-h-[75vh] rounded-t-2xl border-t border-border slide-in-from-bottom
      sm:inset-x-auto sm:bottom-auto sm:top-0 sm:right-0 sm:h-full sm:max-h-none sm:w-80 sm:rounded-none sm:border-t-0 sm:border-l sm:slide-in-from-right">
      <div className="sm:hidden mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted shrink-0" />
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          {currentDepth > 1 && (
            <button onClick={goBack} className="rounded-full p-1 hover:bg-muted transition-colors shrink-0">
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <h2 className="text-sm font-bold text-card-foreground truncate">
            {currentDepth < levels.length ? levelLabels[currentLevel] : "Records"}
          </h2>
        </div>
        <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors shrink-0">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1 px-4 py-2 text-xs text-muted-foreground overflow-x-auto border-b border-border/50">
          {breadcrumbs.map((c, i) => (
            <span key={c.level} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <button
                onClick={() => goToBreadcrumb(i)}
                className="hover:text-foreground transition-colors truncate max-w-[100px]"
                title={c.value}
              >
                {c.value}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="px-4 pt-3">
        <SummaryBar items={filtered} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {groups ? (
          <div className="space-y-1">
            {groups.map(([name, items]) => (
              <button
                key={name}
                onClick={() => drillInto(levels[currentDepth], name)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/60 transition-colors text-left group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-green-600 font-medium">{items.filter((r) => r.status === "surplus").length}S</span>
                    <span className="text-[10px] text-red-600 font-medium">{items.filter((r) => r.status === "deficit").length}D</span>
                    <span className="text-[10px] text-yellow-600 font-medium">{items.filter((r) => r.status === "balanced").length}B</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          /* Individual records at barangay level */
          <div className="space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{r.commodity || "Unknown"}</span>
                  <Badge className={`text-[10px] capitalize ${statusBadge[r.status] || ""}`}>{r.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium text-right">{r.price != null ? `₱${Number(r.price).toLocaleString()}` : "—"}</span>
                  <span className="text-muted-foreground">Volume</span>
                  <span className="font-medium text-right">{r.volume ?? "—"}</span>
                  <span className="text-muted-foreground">Season</span>
                  <span className="font-medium text-right">{r.season ?? "—"}</span>
                  <span className="text-muted-foreground">Barangay</span>
                  <span className="font-medium text-right">{r.barangay ?? "—"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportPanel;
