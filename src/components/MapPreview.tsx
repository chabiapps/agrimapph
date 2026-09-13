import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  lat: number;
  lng: number;
  emoji?: string;
  label?: string;
  onChange?: (lat: number, lng: number) => void;
}

const makeIcon = (emoji: string) =>
  L.divIcon({
    className: "",
    html: `<div style="width:38px;height:38px;border-radius:50%;border:3px solid #16a34a;background:#f0fdf4;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 6px rgba(0,0,0,.28);">${emoji}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });

const MapPreview = ({ lat, lng, emoji = "📍", label, onChange }: Props) => {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { attributionControl: false }).setView([lat, lng], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map.current);
    marker.current = L.marker([lat, lng], { icon: makeIcon(emoji), draggable: true }).addTo(map.current);
    marker.current.on("dragend", () => {
      const p = marker.current!.getLatLng();
      onChangeRef.current?.(p.lat, p.lng);
    });
    map.current.on("click", (e: L.LeafletMouseEvent) => {
      marker.current?.setLatLng(e.latlng);
      onChangeRef.current?.(e.latlng.lat, e.latlng.lng);
    });
    return () => {
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current || !marker.current) return;
    marker.current.setLatLng([lat, lng]);
    marker.current.setIcon(makeIcon(emoji));
    map.current.setView([lat, lng], Math.max(map.current.getZoom(), 12));
  }, [lat, lng, emoji]);

  return (
    <div className="space-y-1.5">
      <div ref={el} className="h-48 w-full rounded-lg border border-border overflow-hidden z-0" />
      <p className="text-xs text-muted-foreground">
        {label ?? "I-drag ang pin o pindutin ang mapa para itama ang lokasyon."}
      </p>
    </div>
  );
};

export default MapPreview;
