const reasons = [
  {
    number: "01",
    title: "30+ years expertise",
    description:
      "Established in 1992, Atelier IKS brings proven textile manufacturing consistency.",
  },
  {
    number: "02",
    title: "Trusted export partner",
    description:
      "Reliable production and delivery standards for national and international clients.",
  },
  {
    number: "03",
    title: "Quality manufacturing",
    description:
      "High production standards focused on durability, fit, and customer satisfaction.",
  },
  {
    number: "04",
    title: "Modern digital systems",
    description:
      "DppSmart-enabled workflows improve visibility and operational responsiveness.",
  },
  {
    number: "05",
    title: "Full transparency",
    description:
      "Traceable garments and auditable records support trust and compliance.",
  },
];

function WhyChooseSection() {
  return (
    <section id="why-us" aria-label="Why choose us" className="py-20 sm:py-28 bg-slate-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
            Why Choose Us
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Built for long-term industrial partnership
          </h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((reason) => (
            <article
              key={reason.title}
              className="group rounded-3xl bg-white p-7 ring-1 ring-slate-900/8 transition duration-300 hover:-translate-y-1 hover:shadow-soft-xl"
            >
              <div className="mb-5 flex items-center gap-4">
                <span className="text-4xl font-extrabold tracking-tight text-slate-100 group-hover:text-brand-100 transition-colors">
                  {reason.number}
                </span>
                <div className="h-px flex-1 bg-slate-100 group-hover:bg-brand-100 transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{reason.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {reason.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default WhyChooseSection;
