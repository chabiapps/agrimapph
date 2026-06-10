import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "en" | "fil";

const dict = {
  en: {
    mapView: "Map View",
    tableView: "Table View",
    search: "Search region, province…",
    commodity: "Commodity",
    allCommodities: "All Commodities",
    status: "Status",
    allStatus: "All Status",
    surplus: "Surplus",
    deficit: "Deficit",
    balanced: "Balanced",
    exportCsv: "Export CSV",
    csv: "CSV",
    region: "Region",
    province: "Province",
    municipality: "Municipality",
    barangay: "Barangay",
    records: "Records",
    reports: "reports",
    report: "report",
    price: "Price",
    volume: "Volume",
    season: "Season",
    english: "English",
    filipino: "Filipino",
  },
  fil: {
    mapView: "Mapa",
    tableView: "Listahan",
    search: "Hanapin ang rehiyon, lalawigan…",
    commodity: "Produkto",
    allCommodities: "Lahat ng Produkto",
    status: "Kalagayan",
    allStatus: "Lahat",
    surplus: "Sobra",
    deficit: "Kulang",
    balanced: "Sapat",
    exportCsv: "I-download",
    csv: "I-download",
    region: "Rehiyon",
    province: "Lalawigan",
    municipality: "Bayan",
    barangay: "Barangay",
    records: "Mga Tala",
    reports: "tala",
    report: "tala",
    price: "Presyo",
    volume: "Dami",
    season: "Panahon",
    english: "English",
    filipino: "Filipino",
  },
} as const;

export type TKey = keyof typeof dict["en"];

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: TKey) => string;
}

const LangContext = createContext<Ctx | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return (localStorage.getItem("lang") as Lang) || "en";
  });
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("lang", l); } catch {}
  };
  const t = (k: TKey) => dict[lang][k];
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
};

export const useLang = () => {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
};
