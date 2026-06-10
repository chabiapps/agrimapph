import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LanguageToggle = () => {
  const { lang, setLang } = useLang();
  return (
    <div className="absolute top-4 right-4 z-[1000] flex bg-card/90 backdrop-blur-md rounded-lg border border-border shadow-lg overflow-hidden">
      <button
        onClick={() => setLang("en")}
        className={cn(
          "px-4 min-h-[52px] text-base font-medium transition-colors",
          lang === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        aria-label="English"
      >
        EN
      </button>
      <button
        onClick={() => setLang("fil")}
        className={cn(
          "px-4 min-h-[52px] text-base font-medium transition-colors",
          lang === "fil"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        aria-label="Filipino"
      >
        FIL
      </button>
    </div>
  );
};

export default LanguageToggle;
