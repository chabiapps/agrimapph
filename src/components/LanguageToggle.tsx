import { Languages } from "lucide-react";
import { useLang } from "@/lib/i18n";

const LanguageToggle = () => {
  const { lang, setLang } = useLang();
  const next = lang === "en" ? "fil" : "en";
  return (
    <button
      onClick={() => setLang(next)}
      aria-label={`Switch to ${next === "en" ? "English" : "Filipino"}`}
      className="fixed top-3 right-3 z-[1001] h-10 w-10 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-md flex items-center justify-center text-foreground hover:bg-accent transition-colors"
    >
      <Languages className="h-4 w-4" />
      <span className="absolute -bottom-1 -right-1 text-[10px] font-bold bg-primary text-primary-foreground rounded px-1 leading-tight">
        {lang.toUpperCase()}
      </span>
    </button>
  );
};

export default LanguageToggle;
