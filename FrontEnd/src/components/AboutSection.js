const aboutPillars = [
  "Founded in 1992 with over three decades of industrial expertise",
  "Based in Marrakech at Zone Industrielle Sidi Ghanem",
  "Specialized in confection et exportation de vetements pour enfants",
  "Serving both national and international markets",
  "Focused on quality, traceability, and innovation",
];

function AboutSection() {
  return (
    <section id="about" aria-label="About Atelier IKS" className="py-20 sm:py-28 bg-slate-50/50">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
            About Atelier IKS
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Moroccan textile excellence, powered by digital innovation
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-600">
            Atelier IKS is a Moroccan leader in children&apos;s ready-to-wear
            garment manufacturing, combining decades of expertise with digital
            innovation.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            As a trusted export manufacturing partner, the company integrates
            precision operations with modern DPP traceability to deliver
            transparent and high-quality production outcomes.
          </p>
          <a href="#contact" className="btn-primary mt-8 w-fit">
            Get in Touch
          </a>
        </div>

        <div className="space-y-5">
          <figure className="overflow-hidden rounded-3xl shadow-soft-xl ring-1 ring-slate-900/8">
            <img
              className="h-56 w-full object-cover transition duration-500 hover:scale-105"
              src="https://images.unsplash.com/photo-1595341888016-a392ef81b7de?auto=format&fit=crop&w=1500&q=80"
              alt="Modern textile manufacturing environment"
              loading="lazy"
            />
          </figure>
          <div className="rounded-3xl bg-white p-6 shadow-soft-xl ring-1 ring-slate-900/8">
            <ul className="space-y-4">
              {aboutPillars.map((item) => (
                <li key={item} className="flex gap-3 items-start">
                  <span className="mt-0.5 flex-none flex items-center justify-center h-5 w-5 rounded-full bg-brand-600">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-sm leading-relaxed text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutSection;
