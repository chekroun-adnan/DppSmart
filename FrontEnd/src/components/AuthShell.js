import { Link } from "react-router-dom";

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
  return (
    <div className="min-h-screen bg-[#fcfcfd] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl">
        <Link to="/" className="mb-10 inline-flex items-center gap-3 group">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg transition-transform group-hover:scale-105">
            <span className="text-sm font-bold tracking-tighter">IKS</span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-none">Atelier IKS</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-1">Smart Manufacturing</p>
          </div>
        </Link>

        <section className="glass-card grid overflow-hidden lg:grid-cols-[1fr_1.2fr] border-slate-200">
          <div className="relative hidden p-12 lg:flex flex-col justify-between bg-slate-950 overflow-hidden">
            <div className="absolute inset-0 z-0">
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{
                  backgroundImage: "url(https://images.unsplash.com/photo-1558444479-c8f01052478d?auto=format&fit=crop&w=1200&q=80)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/80 to-brand-900/30" />
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
              <h3 className="text-4xl font-extrabold tracking-tight text-slate-900">
                {title}
              </h3>
              <p className="mt-3 text-slate-500 font-medium">{subtitle}</p>

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

              <p className="mt-10 text-center text-sm font-medium text-slate-500">
                {alternateLabel}{" "}
                <Link to={alternateHref} className="text-brand-600 font-bold hover:underline">
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
