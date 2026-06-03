import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

function AuthShell({
  title,
  subtitle,
  actionLabel,
  switchLabel,
  alternateLabel,
  alternateHref,
  sideTitle,
  sideDescription,
  onSubmit,
  submitDisabled = false,
  submitLabel,
  children,
}) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0B1120] flex items-center justify-center p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="w-full max-w-6xl">
        <div className="flex items-start justify-between mb-10">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/20 transition-transform group-hover:scale-105">
              <span className="text-sm font-bold tracking-tighter">IKS</span>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#F8FAFC] leading-none">Atelier IKS</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-[#64748B] mt-1">Smart Manufacturing</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] text-slate-500 dark:text-[#94A3B8] hover:text-brand-600 dark:hover:text-brand-400 transition-all shadow-sm dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>

        <section className="glass-card grid overflow-hidden lg:grid-cols-[1fr_1.2fr] border-slate-200/60 dark:border-[rgba(255,255,255,0.06)] shadow-xl dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          <div className="relative hidden p-12 lg:flex flex-col justify-between bg-slate-950 overflow-hidden">
            <div className="absolute inset-0 z-0">
              <div
                className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950 to-brand-950/40"
              />
            </div>

            <div className="relative z-10">
              <div className="inline-flex rounded-full bg-brand-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-400 ring-1 ring-brand-500/20 backdrop-blur-sm">
                Next-Gen DPP platform
              </div>
              <h2 className="mt-8 text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
                {sideTitle}
              </h2>
              <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-md">
                {sideDescription}
              </p>
            </div>

            <div className="relative z-10 flex gap-4">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-white">100%</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Traceable</span>
              </div>
              <div className="w-px h-10 bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-white">EU-DPP</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Compliant</span>
              </div>
            </div>
          </div>

            <div className="p-8 sm:p-12 md:p-16 flex flex-col justify-center">
              <div className="max-w-sm mx-auto w-full">
                <h3 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
                  {title}
                </h3>
                <p className="mt-3 text-slate-500 dark:text-[#94A3B8] font-medium">{subtitle}</p>

              <form
                className="mt-10 space-y-5"
                onSubmit={onSubmit || ((event) => event.preventDefault())}
              >
                {children}

                <button
                  type="submit"
                  disabled={submitDisabled}
                  className="btn-primary w-full py-4 text-lg shadow-xl shadow-brand-500/20 mt-4"
                >
                  {submitLabel || actionLabel}
                </button>
              </form>

                <p className="mt-10 text-center text-sm font-medium text-slate-500 dark:text-[#64748B]">
                  {alternateLabel}{" "}
                  <Link to={alternateHref} className="text-brand-600 dark:text-brand-400 font-bold hover:underline">
                    {switchLabel}
                  </Link>
                </p>
              </div>
            </div>
        </section>
      </div>
    </div>
  );
}

export default AuthShell;
