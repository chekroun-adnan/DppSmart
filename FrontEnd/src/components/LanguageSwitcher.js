import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "../i18n";

export default function LanguageSwitcher({ compact = false }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const activeLang = i18n.resolvedLanguage || i18n.language || "en";
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === activeLang || activeLang.startsWith(l.code + "-")) || SUPPORTED_LANGUAGES[0];

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem("appLanguage", code);
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all"
        aria-label="Select language"
      >
        <span className="text-base leading-none">{current.flag}</span>
        {!compact && (
          <span className="hidden sm:inline text-xs font-bold tracking-wide">{current.code.toUpperCase()}</span>
        )}
        <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-[100] w-52 rounded-2xl bg-white border border-slate-100 shadow-xl overflow-hidden animate-fade-in">
          <div className="p-1.5 max-h-80 overflow-y-auto">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => changeLanguage(lang.code)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                  lang.code === current.code
                    ? "bg-brand-50 text-brand-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-50 font-medium"
                }`}
              >
                <span className="text-lg leading-none">{lang.flag}</span>
                <span className="flex-1 text-left">{lang.label}</span>
                {lang.code === current.code && (
                  <svg className="w-4 h-4 text-brand-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
