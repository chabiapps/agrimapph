/**
 * Shared supply/demand status tokens — single source of truth for the
 * Sobra (surplus) / Kulang (deficit) / Sapat (balanced) colour coding used by
 * the Listahan table, the Mapa pin detail, and the summary panels.
 *
 * Labels themselves live in the i18n dictionary (`t("surplus")` → "Sobra"),
 * so only the Tailwind classes are duplicated here.
 */
export const STATUS_BADGE_CLASS: Record<string, string> = {
  surplus: "bg-green-500/15 text-green-700 border-green-500/30",
  deficit: "bg-red-500/15 text-red-700 border-red-500/30",
  balanced: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
};

/** Colour-coded text tokens (e.g. the Presyo value in the pin detail). */
export const STATUS_TEXT_CLASS: Record<string, string> = {
  surplus: "text-green-600",
  deficit: "text-red-600",
  balanced: "text-yellow-600",
};

/** Narrow an arbitrary DB status string to a known status key. */
export const asStatusKey = (s?: string | null): "surplus" | "deficit" | "balanced" =>
  s === "surplus" || s === "deficit" ? s : "balanced";
