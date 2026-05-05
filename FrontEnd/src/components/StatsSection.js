import { useEffect, useState } from "react";

function AnimatedValue({ value, suffix = "", duration = 1200 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frameId;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(eased * value));
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [duration, value]);

  return (
    <span>
      {displayValue}
      {suffix}
    </span>
  );
}

const stats = [
  { label: "Years of experience", value: 30, suffix: "+", accent: "brand" },
  { label: "Employees", value: 200, suffix: "+", accent: "slate" },
  { label: "Export-ready markets", value: 25, suffix: "+", accent: "slate" },
  { label: "Real-time traceability", value: 100, suffix: "%", accent: "brand" },
  { label: "Smart production monitoring", value: 24, suffix: "/7", accent: "slate" },
];

function StatsSection() {
  return (
    <section aria-label="Company stats" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
            Company Metrics
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Measurable industrial performance
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map((stat) => (
            <article
              key={stat.label}
              className={`rounded-3xl p-6 ring-1 transition duration-300 hover:-translate-y-1 hover:shadow-soft-xl ${
                stat.accent === "brand"
                  ? "bg-brand-600 ring-brand-700"
                  : "bg-white ring-slate-900/8"
              }`}
            >
              <div className={`text-4xl font-extrabold tracking-tight ${stat.accent === "brand" ? "text-white" : "text-slate-900"}`}>
                <AnimatedValue value={stat.value} suffix={stat.suffix} />
              </div>
              <p className={`mt-2 text-sm font-medium ${stat.accent === "brand" ? "text-brand-100" : "text-slate-500"}`}>
                {stat.label}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default StatsSection;
