interface ContactInfo {
  phone_number?: string | null;
  messenger_username?: string | null;
}

const clean = (v?: string | null) => {
  const s = (v ?? "").trim();
  return s.length > 0 ? s : null;
};

export const hasContact = (r: ContactInfo) => !!(clean(r.phone_number) || clean(r.messenger_username));

/** Full-size contact buttons for the pin detail sheet. */
export const ContactButtons = ({ report }: { report: ContactInfo }) => {
  const phone = clean(report.phone_number);
  const messenger = clean(report.messenger_username);
  if (!phone && !messenger) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {phone && (
          <a
            href={`tel:${phone}`}
            aria-label="Tumawag sa reporter"
            className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 text-base font-bold text-primary-foreground transition-colors hover:bg-green-700"
          >
            <span aria-hidden>📞</span> Tumawag
          </a>
        )}
        {messenger && (
          <a
            href={`https://m.me/${messenger}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Mag-message sa Messenger"
            className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-base font-bold text-primary-foreground transition-colors hover:bg-blue-700"
          >
            <span aria-hidden>💬</span> Messenger
          </a>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Ang contact info ay ibinigay ng reporter at pampubliko.
      </p>
    </div>
  );
};

/** Compact icon-only contact actions for the table. */
export const ContactIcons = ({ report }: { report: ContactInfo }) => {
  const phone = clean(report.phone_number);
  const messenger = clean(report.messenger_username);
  if (!phone && !messenger) return <span className="text-muted-foreground">—</span>;

  return (
    <span className="flex items-center gap-2">
      {phone && (
        <a
          href={`tel:${phone}`}
          aria-label="Tumawag sa reporter"
          title="Tumawag"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-500/15 transition-colors hover:bg-green-500/30"
        >
          <span aria-hidden>📞</span>
        </a>
      )}
      {messenger && (
        <a
          href={`https://m.me/${messenger}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Mag-message sa Messenger"
          title="Messenger"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/15 transition-colors hover:bg-blue-500/30"
        >
          <span aria-hidden>💬</span>
        </a>
      )}
    </span>
  );
};
