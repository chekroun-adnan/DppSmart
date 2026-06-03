export function MobileTabs({ tabs, activeTab, onChange, className = "" }) {
  return (
    <div className={`flex border-b border-slate-200 dark:border-white/[0.06] overflow-x-auto no-scrollbar ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`shrink-0 px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border-b-2 -mb-px ${
              isActive
                ? "text-brand-600 dark:text-brand-400 border-brand-500"
                : "text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            {tab.icon && <tab.icon className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />}
            {tab.label}
            {tab.badge != null && (
              <span className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full px-1 text-[9px] font-bold ${
                isActive
                  ? "bg-brand-500 text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
