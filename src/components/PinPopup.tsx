import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Clock, User, ChevronLeft, ChevronRight,
  Navigation, ImageOff, FileText, X,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import { getCommodityIcon, getCategoryDef, inferCategory, type CategoryKey } from "@/lib/categories";
import { STATUS_BADGE_CLASS, STATUS_TEXT_CLASS, asStatusKey } from "@/lib/status";
import { formatRelativeTime } from "@/lib/time";
import { ContactButtons, hasContact } from "@/components/ContactButtons";
import { cn } from "@/lib/utils";

export interface PinReport {
  id: string;
  status: string;
  region: string | null;
  province: string | null;
  municipality: string | null;
  barangay: string | null;
  commodity: string | null;
  price: number | null;
  price_unit?: string | null;
  volume: string | null;
  season: string | null;
  record_type?: string | null;
  planted_date?: string | null;
  expected_harvest_date?: string | null;
  expected_volume?: string | null;
  growth_stage?: string | null;
  subcategory?: string | null;
  category?: string | null;
  phone_number?: string | null;
  messenger_username?: string | null;
  has_phone?: boolean;
  has_messenger?: boolean;
  reported_by?: string | null;
  notes?: string | null;
  description?: string | null;
  created_at?: string | null;
  /** Not yet present in agri_reports — rendered only when populated. */
  image_url?: string | null;
  image_urls?: string[] | null;
  /** Canonical coordinate columns on agri_reports are lat/lng. */
  lat?: number | null;
  lng?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface Props {
  report: PinReport | null;
  onClose: () => void;
  isMobile?: boolean;
  onLogin?: () => void;
}

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const weeksUntil = (iso?: string | null): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7));
};

/** Small label-over-value block (Presyo / Dami / Panahon). */
const StatBlock = ({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) => (
  <div className="rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-2">
    <div className="text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">{label}</div>
    <div className={cn("mt-0.5 truncate text-sm font-bold text-[#111827]", valueClass)} title={value}>
      {value}
    </div>
  </div>
);

/** Label/value row used by the "Karagdagang Impormasyon" list. */
const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-3 py-1.5">
    <span className="shrink-0 text-[12px] text-[#6b7280]">{label}</span>
    <span className="text-right text-[12px] font-semibold text-[#111827]">{value}</span>
  </div>
);

/** Photo area with an optional "1/3" counter overlay. */
const PhotoArea = ({ photos, commodity }: { photos: string[]; commodity: string }) => {
  const [idx, setIdx] = useState(0);
  const { t } = useLang();

  // Clamp when the report (and therefore its photo list) changes.
  const photoKey = photos.join("|");
  useEffect(() => setIdx(0), [photoKey]);

  if (photos.length === 0) {
    return (
      <div className="flex h-[200px] w-full shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#e5e7eb] bg-[#f9fafb] p-3 text-center">
        <ImageOff className="h-6 w-6 text-[#9ca3af]" />
        <p className="px-3 text-[11px] leading-snug text-[#6b7280]">{t("noPhoto")}</p>
      </div>
    );
  }

  const clamp = (n: number) => Math.min(Math.max(n, 0), photos.length - 1);

  return (
    <div className="relative h-[200px] w-full shrink-0 overflow-hidden rounded-xl border border-[#e5e7eb] bg-[#f9fafb]">
      <img
        src={photos[idx]}
        alt={commodity}
        className="h-full w-full object-cover"
        loading="lazy"
      />
      {photos.length > 1 && (
        <>
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
            {idx + 1}/{photos.length}
          </span>
          <button
            type="button"
            aria-label="Bumalik sa dating larawan"
            onClick={() => setIdx((i) => clamp(i - 1))}
            disabled={idx === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white transition-opacity hover:bg-black/70 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Susunod na larawan"
            onClick={() => setIdx((i) => clamp(i + 1))}
            disabled={idx === photos.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white transition-opacity hover:bg-black/70 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
};

/** The panel body: left = identity/contact/notes, right = photo + extra info. */
const PinDetail = ({ report, onLogin }: { report: PinReport; onLogin?: () => void }) => {
  const { t, lang } = useLang();

  const isPlanting = report.record_type === "planting_intention";
  const statusKey = asStatusKey(report.status);
  const statusClass = STATUS_BADGE_CLASS[statusKey];
  const priceClass = STATUS_TEXT_CLASS[statusKey];

  const emoji = getCommodityIcon(report.subcategory, report.category);
  const categoryKey: CategoryKey = (report.category as CategoryKey) ?? inferCategory(report.commodity);
  const categoryDef = getCategoryDef(categoryKey);

  const photos = (
    report.image_urls?.length ? report.image_urls : report.image_url ? [report.image_url] : []
  ).filter(Boolean);

  const notes = (report.notes ?? report.description ?? "").trim();
  // agri_reports stores coordinates in lat/lng; accept the longer aliases too.
  const lat = report.lat ?? report.latitude ?? null;
  const lng = report.lng ?? report.longitude ?? null;
  const hasLatLng = typeof lat === "number" && typeof lng === "number";
  const coords = hasLatLng ? `${lat!.toFixed(4)}, ${lng!.toFixed(4)}` : "—";

  const weeks = weeksUntil(report.expected_harvest_date);
  const countdownLabel =
    weeks == null ? "—" :
    weeks < 0 ? `${t("harvested")} ${Math.abs(weeks)} ${t("weeksUnit")} ${t("ago")}` :
    weeks === 0 ? t("harvestThisWeek") :
    `${t("harvestIn")} ${weeks} ${t("weeksUnit")}`;

  // Region → Province, then Municipality · Barangay
  const locationChain = [report.region, report.province].filter(Boolean) as string[];
  const locality = [report.municipality, report.barangay].filter(Boolean) as string[];

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {/* ---------------- Left column ---------------- */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl"
          >
            {emoji}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-extrabold leading-tight text-[#111827]">
              {report.commodity ?? "—"}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={cn("border text-[11px] font-bold", statusClass)}>
                {t(statusKey)}
              </Badge>
              {isPlanting && (
                <Badge variant="outline" className="border-green-500/30 bg-green-500/15 text-[11px] font-bold text-green-700">
                  {t("plantingIntention")}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Presyo / Dami / Panahon */}
        <div className="grid grid-cols-3 gap-2">
          <StatBlock
            label={t("price")}
            value={report.price == null ? "—" : `₱${report.price}${report.price_unit ? `/${report.price_unit}` : ""}`}
            valueClass={priceClass}
          />
          <StatBlock label={t("volume")} value={report.volume ?? "—"} />
          <StatBlock label={t("season")} value={report.season ?? "—"} />
        </div>

        {/* Location breakdown */}
        <div className="flex items-start gap-2 rounded-lg bg-[#f9fafb] px-3 py-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]" />
          <div className="min-w-0 text-[12px] leading-relaxed">
            {locationChain.length > 0 && (
              <div className="text-[#6b7280]">
                {locationChain.map((part, i) => (
                  <span key={`${part}-${i}`}>
                    {i > 0 && <span className="mx-1 text-[#9ca3af]">→</span>}
                    {part}
                  </span>
                ))}
              </div>
            )}
            <div className="font-semibold text-[#111827]">
              {locality.length > 0 ? locality.join(" · ") : "—"}
            </div>
          </div>
        </div>

        {/* Reporter */}
        <div className="flex items-center gap-2 text-[13px]">
          <User className="h-4 w-4 shrink-0 text-[#6b7280]" />
          <span className="font-semibold text-[#111827]">
            {report.reported_by?.trim() || t("unknownReporter")}
          </span>
        </div>

        {/* Contact actions — reused from ContactButtons; each renders only
            when that method was provided. */}
        {hasContact(report) && (
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-2.5">
            <ContactButtons report={report} onLogin={onLogin} />
          </div>
        )}


        {/* Planting-intention extras (kept from the previous panel) */}
        {isPlanting && (
          <div className="grid grid-cols-2 gap-2">
            <StatBlock label={t("planted")} value={formatDate(report.planted_date)} />
            <StatBlock label={t("expectedHarvest")} value={countdownLabel} />
            {report.growth_stage && <StatBlock label={t("growthStage")} value={report.growth_stage} />}
            {report.expected_volume && <StatBlock label={t("expectedVolume")} value={report.expected_volume} />}
          </div>
        )}

        {/* Notes + relative timestamp */}
        {(notes || report.created_at) && (
          <div className="mt-auto border-t border-[#e5e7eb] pt-3">
            {notes && (
              <>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                  <FileText className="h-3.5 w-3.5" /> {t("notes")}
                </div>
                <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-[#374151]">{notes}</p>
              </>
            )}
            {report.created_at && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#6b7280]">
                <Clock className="h-3.5 w-3.5" />
                {formatRelativeTime(report.created_at, lang)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ---------------- Right column ---------------- */}
      <div className="flex min-w-0 flex-col gap-3">
        <PhotoArea photos={photos} commodity={report.commodity ?? ""} />

        <div className="rounded-xl border border-[#e5e7eb] bg-white">
          <div className="border-b border-[#e5e7eb] px-3 py-2 text-[12px] font-bold text-[#111827]">
            {t("additionalInfo")}
          </div>
          <div className="divide-y divide-[#f3f4f6] px-3 py-1">
            <InfoRow label={t("type")} value={isPlanting ? t("plantingIntention") : t("currentSupply")} />
            <InfoRow label={t("category")} value={`${categoryDef.icon} ${categoryDef.label}`} />
            <InfoRow label={t("status")} value={t(statusKey)} />
            <InfoRow label={t("location")} value={coords} />
            <InfoRow label={t("season")} value={report.season ?? "—"} />
            <InfoRow label={t("postedOn")} value={formatDate(report.created_at)} />
          </div>
          {hasLatLng && (
            <a
              href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 border-t border-[#e5e7eb] px-3 py-2 text-[12px] font-semibold text-[#16a34a] hover:text-[#15803d]"
            >
              <Navigation className="h-3.5 w-3.5" /> {t("viewOnMap")}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Pin detail panel.
 *
 * Desktop: a Radix Dialog rendered as a centered modal *over* the map, with a
 * dimmed backdrop — so it no longer collides with the header/filter bar. The
 * z-index sits above Leaflet's control layer (z-1000), matching MapFilterSheet.
 *
 * Mobile: keeps the existing bottom Sheet (unchanged behaviour).
 */
const PinPopup = ({ report, onClose, isMobile = true, onLogin }: Props) => {
  const { t } = useLang();
  const open = !!report;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl p-6 pt-3 max-h-[50vh] overflow-y-auto !bottom-[72px] z-[1100] [&>button]:z-10 [&_~_[data-radix-dialog-overlay]]:z-[1050]"
          style={{ zIndex: 1100 }}
        >
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" aria-hidden />
          {report && <PinDetail report={report} onLogin={onLogin} />}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="z-[1100] max-h-[90vh] w-[min(920px,92vw)] max-w-none overflow-y-auto rounded-2xl border-[#e5e7eb] bg-white p-0 shadow-2xl sm:rounded-2xl [&>button]:hidden"
        overlayClassName="z-[1090] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      >
        <DialogHeader className="sticky top-0 z-10 flex-row items-center justify-between space-y-0 border-b border-[#e5e7eb] bg-white px-5 py-3 text-left">
          <DialogTitle className="text-[13px] font-bold text-[#111827]">{t("reportDetails")}</DialogTitle>
          {/* Replaces the primitive's own × so it sits inside the panel chrome. */}
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#111827]"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>
        <div className="px-5 py-4">{report && <PinDetail report={report} onLogin={onLogin} />}</div>
      </DialogContent>
    </Dialog>
  );
};

export default PinPopup;
