import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

interface AgriMapProps {
  reports: AgriReport[];
  onPinClick: (report: AgriReport) => void;
}

const statusColor: Record<string, string> = {
  surplus: "#22c55e",
  deficit: "#ef4444",
  balanced: "#eab308",
};

const AgriMap = ({ reports, onPinClick }: AgriMapProps) => {
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

    // Clear existing markers (collect first to avoid mutation during iteration)
    const toRemove: L.Layer[] = [];
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) toRemove.push(layer);
    });
    toRemove.forEach((l) => map.removeLayer(l));

    reports.forEach((report) => {
      const color = statusColor[report.status] || "#9ca3af";
      L.circleMarker([report.lat, report.lng], {
        radius: 10,
        fillColor: color,
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      })
        .addTo(map)
        .on("click", () => onPinClick(report));
    });
  }, [reports, onPinClick]);

  return <div ref={mapRef} className="h-full w-full" />;
};

export default AgriMap;
