function HeroSection() {
  return (
    <section aria-label="Hero" className="relative min-h-screen flex items-center overflow-hidden bg-slate-950">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 scale-105"
          style={{
            backgroundImage: "url(https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=2200&q=80)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/85 to-brand-900/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_0%,rgba(77,122,255,0.12),transparent_60%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-32 pb-20 sm:px-6 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:pt-40 lg:pb-32">
        <div className="animate-slide-up">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-400 ring-1 ring-brand-500/20 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            Innovation in Textiles Since 1992
          </div>

          <h1 className="mt-8 text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
            The Future of{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-cyan-400">
              Smart Manufacturing
            </span>
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-slate-300 sm:text-xl">
            Atelier IKS combines 30 years of textile excellence with cutting-edge Digital Product Passport (DPP) technology for 100% traceability.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <a href="#services" className="btn-primary text-base px-8 py-4">
              Explore Our Solutions
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
            <a href="#contact" className="btn-secondary bg-transparent border-slate-700 text-white hover:bg-white/5 px-8 py-4 text-base">
              Contact Expert
            </a>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6 border-t border-slate-800/60 pt-10">
            {[
              { label: "Traceability", value: "100%" },
              { label: "Experience", value: "30+ Y" },
              { label: "Workforce", value: "500+" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs uppercase tracking-widest text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 lg:mt-0 animate-fade-in">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-600 to-cyan-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-700"></div>
            <article className="relative rounded-3xl bg-slate-900/60 p-8 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-400">Enterprise Snapshot</p>
                  <h2 className="text-2xl font-bold text-white mt-1">Atelier IKS</h2>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-brand-600/20 flex items-center justify-center border border-brand-500/30">
                  <svg className="w-6 h-6 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Industry", value: "Children's Wear Export" },
                  { label: "Location", value: "Marrakech, Morocco" },
                  { label: "Focus", value: "DPP & Smart Ops" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 transition-colors hover:bg-white/10"
                  >
                    <span className="text-sm text-slate-400">{item.label}</span>
                    <span className="text-sm font-semibold text-white">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 rounded-2xl bg-brand-600/10 border border-brand-500/20">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
                  <span className="text-xs font-medium text-brand-400 uppercase tracking-widest">
                    System Status: Active
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  Smart manufacturing nodes synced with EU DPP standards.
                </p>
              </div>
            </article>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce hidden lg:block">
        <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}

export default HeroSection;
