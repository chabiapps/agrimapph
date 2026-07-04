import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
}

interface AgriMapProps {
  reports: AgriReport[];
  onPinClick: (report: AgriReport) => void;
  mode?: "current_supply" | "planting_intention";
}

const statusColor: Record<string, string> = {
  surplus: "#22c55e",
  deficit: "#ef4444",
  balanced: "#eab308",
};

const makePlantingIcon = (emoji: string, nearHarvest = false) =>
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
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

const makeSupplyIcon = (color: string, emoji: string) =>
  L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
      <div style="
        width:32px;height:32px;border-radius:50%;
        background:${color};border:3px solid #fff;
        box-shadow:0 2px 5px rgba(0,0,0,0.30);
      "></div>
      <div style="font-size:14px;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.3));">${emoji}</div>
    </div>`,
    iconSize: [32, 50],
    iconAnchor: [16, 16],
  });

const AgriMap = ({ reports, onPinClick, mode = "current_supply" }: AgriMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

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

    const toRemove: L.Layer[] = [];
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Marker) toRemove.push(layer);
    });
    toRemove.forEach((l) => map.removeLayer(l));

    reports.forEach((report) => {
      const emoji = getCommodityIcon(report.subcategory, report.category);

      if (mode === "planting_intention") {
        let nearHarvest = false;
        if (report.expected_harvest_date) {
          const diffDays = (new Date(report.expected_harvest_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          if (!isNaN(diffDays) && diffDays >= 0 && diffDays <= 14) nearHarvest = true;
        }
        L.marker([report.lat, report.lng], { icon: makePlantingIcon(emoji, nearHarvest) })
          .addTo(map)
          .on("click", () => onPinClick(report));
      } else {
        const color = statusColor[report.status] || "#9ca3af";
        L.marker([report.lat, report.lng], { icon: makeSupplyIcon(color, emoji) })
          .addTo(map)
          .on("click", () => onPinClick(report));
      }
    });
  }, [reports, onPinClick, mode]);

  return <div ref={mapRef} className="h-full w-full" />;
};

export default AgriMap;
