import { useEffect } from "react";
import { X } from "lucide-react";

export function MobileDrawer({
  open,
  onClose,
  title,
  children,
  footer,
  className = "",
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[80] bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed inset-0 z-[90] flex flex-col bg-white dark:bg-slate-900 transition-transform duration-300 ease-in-out
          md:static md:inset-auto md:z-0 md:bg-transparent md:dark:bg-transparent md:block
          ${open ? "translate-x-0" : "translate-x-full md:translate-x-0"}
          ${className}`}
      >
        <div className="flex items-center justify-between shrink-0 px-5 py-4 border-b border-slate-200 dark:border-white/[0.06] md:hidden">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{title}</h3>
          <button
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 px-5 py-4 border-t border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-900 md:bg-transparent md:dark:bg-transparent md:border-t-0 md:px-0 md:py-0 md:static md:relative">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
