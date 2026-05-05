const transformationItems = [
  "End-to-end product lifecycle tracking from design to shipment",
  "Real-time stock movement visibility across production and storage",
  "Detailed production step monitoring for every manufacturing batch",
  "Connected employee workflows to improve execution and accountability",
  "Integrated quality control checkpoints with audit-ready history",
  "Scan-based traceability with QR-enabled Digital Product Passports",
];

function DigitalTransformationSection() {
  return (
    <section
      id="transformation"
      aria-label="Digital transformation"
      className="bg-slate-950 py-20 text-white sm:py-28"
    >
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-400">
            Digital Transformation
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            How DppSmart powers Atelier IKS operations
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-400">
            Atelier IKS combines industrial know-how with digital systems to
            ensure transparency, consistency, and agile decision-making across
            the full manufacturing chain.
          </p>
          <a
            href="#contact"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-500 shadow-lg shadow-brand-900/30"
          >
            Start Your Transformation
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <ul className="space-y-4">
              {transformationItems.map((item) => (
                <li key={item} className="flex gap-3 items-start">
                  <span className="mt-1 flex-none flex items-center justify-center h-5 w-5 rounded-full bg-brand-600/20 border border-brand-500/30">
                    <svg className="w-3 h-3 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-sm leading-relaxed text-slate-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <article className="rounded-3xl bg-gradient-to-b from-white/10 to-white/5 p-4 ring-1 ring-white/15 shadow-soft-xl">
            <div className="rounded-[1.75rem] bg-slate-900 p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <div className="h-2 w-20 rounded-full bg-white/10" />
                <div className="h-2 w-2 rounded-full bg-brand-400" />
              </div>
              <div className="mt-5 rounded-2xl bg-white p-5 text-slate-900">
                <div className="flex items-start gap-4">
                  <div className="grid h-16 w-16 flex-none place-items-center rounded-xl bg-slate-50 ring-1 ring-slate-900/10">
                    <div className="grid grid-cols-4 gap-0.5">
                      {Array.from({ length: 16 }).map((_, index) => (
                        <span
                          key={index}
                          className={`h-2.5 w-2.5 rounded-sm ${
                            index % 2 === 0 ? "bg-slate-900" : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold">IKS Batch Passport</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Scan for lifecycle, quality checks, and production history.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-900/5">
                    <p className="text-slate-500">Production line</p>
                    <p className="mt-1 font-bold">Children Ready-to-Wear</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-900/5">
                    <p className="text-slate-500">Traceability status</p>
                    <p className="mt-1 font-bold text-brand-600">Active &amp; verified</p>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export default DigitalTransformationSection;
