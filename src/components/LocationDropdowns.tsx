import { useEffect, useState, useRef } from "react";
import { REGIONS, getProvinces } from "@/lib/psgc";
import { Label } from "@/components/ui/label";
import { ChevronDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationValue {
  region: string;
  province: string;
  municipality: string;
  barangay: string;
  provinceCode: string;
  municipalityCode: string;
}

interface Props {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
}

interface GeoItem {
  code: string;
  name: string;
}

function SearchableSelect({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  placeholder: string;
  options: GeoItem[];
  value: string;
  onChange: (item: GeoItem) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query
    ? options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.name === value);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base">{label}</Label>
      <div ref={ref} className="relative">
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => { if (!disabled) { setOpen((o) => !o); setQuery(""); } }}
          className={cn(
            "w-full min-h-[52px] px-4 pr-10 rounded-md border text-base text-left flex items-center transition-colors",
            disabled
              ? "bg-muted text-muted-foreground cursor-not-allowed border-border/50"
              : "bg-background border-input hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring",
            open && "ring-2 ring-ring border-ring",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate flex-1">{value || placeholder}</span>
          <ChevronDown className={cn("absolute right-3 h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute z-[2000] mt-1 w-full rounded-md border border-border bg-popover shadow-xl">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Maghanap…"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-4 py-2 text-sm text-muted-foreground">Walang resulta</li>
              )}
              {filtered.map((item) => (
                <li key={item.code}>
                  <button
                    type="button"
                    className={cn(
                      "w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent transition-colors",
                      selected?.code === item.code && "bg-primary/10 font-semibold"
                    )}
                    onClick={() => { onChange(item); setOpen(false); setQuery(""); }}
                  >
                    {selected?.code === item.code && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const PSGC_API = "https://psgc.gitlab.io/api";

const LocationDropdowns = ({ value, onChange }: Props) => {
  const [municipalities, setMunicipalities] = useState<GeoItem[]>([]);
  const [barangays, setBarangays] = useState<GeoItem[]>([]);
  const [loadingMuni, setLoadingMuni] = useState(false);
  const [loadingBrgy, setLoadingBrgy] = useState(false);

  const regionOptions: GeoItem[] = REGIONS.map((r) => ({ code: r.code, name: r.name }));
  const provinceOptions: GeoItem[] = value.region
    ? getProvinces(value.region).map((p) => ({ code: p.code, name: p.name }))
    : [];

  useEffect(() => {
    if (!value.provinceCode) { setMunicipalities([]); return; }
    setLoadingMuni(true);
    fetch(`${PSGC_API}/provinces/${value.provinceCode}/cities-municipalities/`)
      .then((r) => r.json())
      .then((data: { code: string; name: string }[]) => {
        setMunicipalities(
          [...data].sort((a, b) => a.name.localeCompare(b.name)).map((d) => ({ code: d.code, name: d.name }))
        );
      })
      .catch(() => setMunicipalities([]))
      .finally(() => setLoadingMuni(false));
  }, [value.provinceCode]);

  useEffect(() => {
    if (!value.municipalityCode) { setBarangays([]); return; }
    setLoadingBrgy(true);
    fetch(`${PSGC_API}/cities-municipalities/${value.municipalityCode}/barangays/`)
      .then((r) => r.json())
      .then((data: { code: string; name: string }[]) => {
        setBarangays(
          [...data].sort((a, b) => a.name.localeCompare(b.name)).map((d) => ({ code: d.code, name: d.name }))
        );
      })
      .catch(() => setBarangays([]))
      .finally(() => setLoadingBrgy(false));
  }, [value.municipalityCode]);

  const handleRegion = (item: GeoItem) => {
    onChange({ region: item.name, province: "", municipality: "", barangay: "", provinceCode: "", municipalityCode: "" });
    setMunicipalities([]);
    setBarangays([]);
  };

  const handleProvince = (item: GeoItem) => {
    onChange({ ...value, province: item.name, municipality: "", barangay: "", provinceCode: item.code, municipalityCode: "" });
    setBarangays([]);
  };

  const handleMunicipality = (item: GeoItem) => {
    onChange({ ...value, municipality: item.name, barangay: "", municipalityCode: item.code });
    setBarangays([]);
  };

  const handleBarangay = (item: GeoItem) => {
    onChange({ ...value, barangay: item.name });
  };

  return (
    <div className="space-y-3">
      <SearchableSelect
        id="region"
        label="Rehiyon *"
        placeholder="Pumili ng rehiyon"
        options={regionOptions}
        value={value.region}
        onChange={handleRegion}
      />
      <SearchableSelect
        id="province"
        label="Lalawigan *"
        placeholder={value.region ? "Pumili ng lalawigan" : "Pumili muna ng rehiyon"}
        options={provinceOptions}
        value={value.province}
        onChange={handleProvince}
        disabled={!value.region}
      />
      <SearchableSelect
        id="municipality"
        label="Bayan *"
        placeholder={
          loadingMuni ? "Naglo-load…" :
          value.province ? "Pumili ng bayan/lungsod" : "Pumili muna ng lalawigan"
        }
        options={municipalities}
        value={value.municipality}
        onChange={handleMunicipality}
        disabled={!value.province || loadingMuni}
      />
      <SearchableSelect
        id="barangay"
        label="Barangay *"
        placeholder={
          loadingBrgy ? "Naglo-load…" :
          value.municipality ? "Pumili ng barangay" : "Pumili muna ng bayan"
        }
        options={barangays}
        value={value.barangay}
        onChange={handleBarangay}
        disabled={!value.municipality || loadingBrgy}
      />
    </div>
  );
};

export default LocationDropdowns;
export type { LocationValue };
