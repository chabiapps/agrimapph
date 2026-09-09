import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { getCommodityIcon } from "@/lib/categories";

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
  record_type?: string | null;
  subcategory?: string | null;
  category?: string | null;
  expected_harvest_date?: string | null;
  reported_by?: string | null;
}

interface AgriMapProps {
  reports: AgriReport[];
  onPinClick: (report: AgriReport) => void;
  mode?: "current_supply" | "planting_intention";
  /** reported_by (user id) -> verification_tier */
  verifiedTiers?: Record<string, string>;
}

const statusColor: Record<string, string> = {
  surplus: "#22c55e",
  deficit: "#ef4444",
  balanced: "#eab308",
};

const badgeHtml = (tier?: string) => {
  if (tier !== "community" && tier !== "government") return "";
  const glyph = tier === "government" ? "✅" : "⭐";
  return `<div title="${tier === "government" ? "Government verified" : "Community verified"}" style="
    position:absolute;top:-6px;right:-8px;width:18px;height:18px;border-radius:50%;
    background:#fff;border:1.5px solid ${tier === "government" ? "#16a34a" : "#eab308"};
    display:flex;align-items:center;justify-content:center;font-size:10px;line-height:1;
    box-shadow:0 1px 3px rgba(0,0,0,0.3);">${glyph}</div>`;
};

const makePlantingIcon = (emoji: string, nearHarvest = false, tier?: string) =>
  L.divIcon({
    className: "",
    html: `<div style="position:relative;width:40px;height:40px;">
      ${nearHarvest ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:3px solid #f97316;animation:agri-pulse 1.4s ease-out infinite;"></div>` : ""}
      <div style="
        position:relative;width:40px;height:40px;border-radius:50%;
        border:3px solid ${nearHarvest ? "#f97316" : "#16a34a"};
        background:#f0fdf4;
        display:flex;align-items:center;justify-content:center;
        font-size:22px;line-height:1;
        box-shadow:0 2px 6px rgba(0,0,0,0.28);
      ">${emoji}</div>
      ${badgeHtml(tier)}
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

const makeSupplyIcon = (color: string, emoji: string, tier?: string) =>
  L.divIcon({
    className: "",
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;">
      <div style="
        width:32px;height:32px;border-radius:50%;
        background:${color};border:3px solid #fff;
        box-shadow:0 2px 5px rgba(0,0,0,0.30);
      "></div>
      <div style="font-size:14px;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.3));">${emoji}</div>
      ${badgeHtml(tier)}
    </div>`,
    iconSize: [32, 50],
    iconAnchor: [16, 16],
  });


const makeClusterIcon = (cluster: { getChildCount: () => number }) => {
  const count = cluster.getChildCount();
  const size = count < 10 ? 38 : count < 50 ? 46 : 56;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:rgba(22,163,74,0.85);border:3px solid #fff;color:#fff;
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:${count < 100 ? 14 : 12}px;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const AgriMap = ({ reports, onPinClick, mode = "current_supply", verifiedTiers = {} }: AgriMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);


  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current).setView([12.8797, 121.774], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapInstance.current);

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (!clusterRef.current) {
      clusterRef.current = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: makeClusterIcon,
      });
      map.addLayer(clusterRef.current);
    }
    const group = clusterRef.current;
    group.clearLayers();

    reports.forEach((report) => {
      const emoji = getCommodityIcon(report.subcategory, report.category);
      const tier = report.reported_by ? verifiedTiers[report.reported_by] : undefined;

      let marker: L.Marker;
      if (mode === "planting_intention") {
        let nearHarvest = false;
        if (report.expected_harvest_date) {
          const diffDays = (new Date(report.expected_harvest_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          if (!isNaN(diffDays) && diffDays >= 0 && diffDays <= 14) nearHarvest = true;
        }
        marker = L.marker([report.lat, report.lng], { icon: makePlantingIcon(emoji, nearHarvest, tier) });
      } else {
        const color = statusColor[report.status] || "#9ca3af";
        marker = L.marker([report.lat, report.lng], { icon: makeSupplyIcon(color, emoji, tier) });
      }
      marker.on("click", () => onPinClick(report));
      group.addLayer(marker);
    });
  }, [reports, onPinClick, mode, verifiedTiers]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />
      <div className="absolute left-3 bottom-[84px] z-[500] bg-card/95 backdrop-blur border border-border rounded-full shadow-lg px-2.5 py-1 text-[10px] leading-tight text-foreground pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#22c55e]" />
            <span>Sobra</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#ef4444]" />
            <span>Kulang</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#eab308]" />
            <span>Sapat</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🌱</span>
            <span>Paparating</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgriMap;
