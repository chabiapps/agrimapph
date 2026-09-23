/**
 * Desktop-only right sidebar for the Mag-ulat page — same shell pattern as
 * MapRightPanel (aside root, w-[340px], own scroll region), minus the panel
 * chrome the map rail doesn't need here.
 *
 * Holds: a "Mga Paalala" reminders card, the live "Progreso ng Ulat" step
 * card (owned by ReportFormPage, passed in via `progress`), an encouragement
 * banner, and the profile-nudge link. Submission happens inside the form
 * itself (ReportFormPage's bottom button) — nothing here submits.
 */
import { Link } from "react-router-dom";
import { Check, Leaf, UserCog } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/AuthContext";

const TIPS: string[] = [
  "Gamitin ang tamang presyo at unit (hal. ₱/kg, ₱/sako, ₱/piraso).",
  "Siguraduhing tama ang kategorya at produkto ng iyong ulat.",
  "I-verify na tama ang lokasyon — rehiyon, lalawigan, bayan, at barangay.",
  "Opsyonal ang contact info — idagdag ito kung gusto mong makontak ka ng mga mamimili.",
];

const ReportRightPanel = ({ progress }: { progress?: ReactNode }) => {
  const { user } = useAuth();

  return (
    <aside
      data-testid="report-right-panel"
      className="hidden md:flex w-[340px] shrink-0 flex-col bg-white border-l border-[#e5e7eb] h-full min-h-0"
      aria-label="Mga paalala at pagsusumite"
    >
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* Mga Paalala (Reminders) */}
        <section aria-label="Mga Paalala" className="rounded-xl bg-[#16a34a]/10 p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#16a34a]/15" aria-hidden>
              <Leaf className="h-4 w-4 text-[#15803d]" />
            </span>
            <h2 className="text-[13px] font-bold text-[#111827]">
              Tandaan sa pag-report:
            </h2>
          </div>
          <ul className="mt-3 space-y-2.5">
            {TIPS.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-[12px] leading-snug text-[#374151]">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16a34a]" aria-hidden />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-[#16a34a]/15 pt-2.5 text-[11px] leading-snug text-[#6b7280]">
            Contact info voluntarily shared by reporter. Hindi ito ipinapakita sa publiko.
          </p>
        </section>

        {/* Step progress — live from the form, between reminders and the
            encouragement banner (replaces the old sidebar submit button's
            position). Omitted until the form emits its first progress state,
            so the rail never flashes a 0/0 card. */}
        {progress}

        {/* Encouragement banner (decorative) */}
        <section
          aria-label="Paanyaya"
          className="rounded-xl bg-gradient-to-br from-[#16a34a] to-[#15803d] p-4 text-white"
        >
          <p className="text-[13px] font-bold leading-snug">
            Sama-sama para sa mas matatag na food system ng Pilipinas!
          </p>
          <p className="mt-1 text-[11px] leading-snug text-white/80">
            Bawat ulat mo ay tumutulong sa mga magsasaka at mamimili.
          </p>
        </section>

        {/* Desktop-only profile nudge — same link ReportTabGate shows inline on mobile. */}
        {user && (
          <Link
            to="/settings/profile"
            className="inline-flex items-center gap-2 text-[12px] font-semibold text-primary underline-offset-4 hover:underline"
            data-testid="report-edit-profile"
          >
            <UserCog className="h-4 w-4" aria-hidden />
            I-edit ang Profile
          </Link>
        )}
      </div>
    </aside>
  );
};

export default ReportRightPanel;
