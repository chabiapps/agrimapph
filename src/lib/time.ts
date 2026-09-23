import type { Lang } from "@/lib/i18n";

/**
 * Lightweight relative-time formatter ("2 oras ang nakalipas" / "2 hours ago").
 * No extra locale dependency — date-fns v3 ships no Filipino locale, so the FIL
 * strings are hand-rolled.
 *
 * Shared by the Mapa right-panel "Latest Reports" list and the pin detail.
 * (ReportsTable keeps its own compact "2h ago" variant for table density.)
 */
export const formatRelativeTime = (iso: string | null | undefined, lang: Lang): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (lang === "fil") {
    if (mins < 1) return "ngayong lang";
    if (mins < 60) return `${mins} min ang nakalipas`;
    const h = Math.round(mins / 60);
    if (h < 24) return `${h} oras ang nakalipas`;
    const days = Math.round(h / 24);
    if (days < 7) return `${days} araw ang nakalipas`;
    if (days < 30) return `${Math.round(days / 7)} linggo ang nakalipas`;
    return d.toLocaleDateString("fil-PH", { month: "short", day: "numeric", year: "numeric" });
  }
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (days < 30) return `${Math.round(days / 7)} week${Math.round(days / 7) === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};
