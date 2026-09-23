import { CheckCircle2, Circle } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** One numbered step of the Mag-ulat form and whether it is currently valid. */
export interface ProgressStep {
  en: string;
  fil: string;
  done: boolean;
}

/**
 * "Progreso ng Ulat" card for the Mag-ulat right rail.
 *
 * Purely presentational — the caller (ReportFormPage) owns the form state, so
 * completion is derived from the same values the submit validation already uses
 * rather than a second source of truth. Renders live as the user types.
 */
const ReportProgressCard = ({ steps }: { steps: ProgressStep[] }) => {
  const { lang } = useLang();
  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const heading = lang === "fil" ? "Progreso ng Ulat" : "Report Progress";
  const counter =
    lang === "fil"
      ? `${done}/${total} hakbang nakumpleto`
      : `${done} of ${total} steps complete`;

  return (
    <section
      className="rounded-xl border border-[#e5e7eb] bg-white p-4"
      aria-label={heading}
    >
      <h2 className="text-[13px] font-bold text-[#111827]">{heading}</h2>
      <p className="mt-0.5 text-[11px] leading-snug text-[#6b7280]">{counter}</p>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#e5e7eb]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={counter}
      >
        <div
          className="h-full rounded-full bg-[#16a34a] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-3 space-y-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-[12px]">
            {s.done ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#16a34a]" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0 text-[#d1d5db]" />
            )}
            <span
              className={cn(
                "truncate",
                s.done ? "text-[#111827]" : "text-[#9ca3af]"
              )}
            >
              {lang === "fil" ? s.fil : s.en}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ReportProgressCard;
