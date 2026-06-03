import { useEffect, useState } from "react";
import { getMainOrganizations, getMyOrganizations, getSubOrganizations } from "../services/authService";

const userRole = () => (localStorage.getItem("userRole") || "").toUpperCase();

export default function OrgPicker({ value, onChange }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const isAdmin = userRole() === "ADMIN";
    const fetch = isAdmin
      ? Promise.all([getMainOrganizations(), getSubOrganizations()]).then(([m, s]) => [...m, ...s])
      : getMyOrganizations();
    fetch
      .then(setOrgs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selected = orgs.find((o) => o.id === value) || null;

  const filtered = orgs.filter((o) =>
    !search || o.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-700/50 animate-pulse" />;
  }

  if (!orgs.length) {
    return <p className="text-xs text-slate-400 py-2">No organizations available.</p>;
  }

  return (
    <div className="space-y-2">
      
      {selected && (
        <div className="flex items-center gap-2.5 rounded-xl border border-brand-300 dark:border-brand-500/40 bg-brand-50 dark:bg-brand-500/10 px-3 py-2.5">
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${
            (selected.type || "").toUpperCase() === "MAIN" ? "bg-brand-600" : "bg-slate-700"
          }`}>
            {selected.name?.[0]?.toUpperCase() || "O"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-brand-700 dark:text-brand-400 truncate">{selected.name}</p>
            <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
              {(selected.type || "").toUpperCase() === "MAIN" ? "Main org" : "Sub org"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 text-slate-400 hover:text-rose-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 pl-8 pr-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-400 focus:bg-white dark:focus:bg-slate-700 transition"
        />
      </div>

      
      <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-600 divide-y divide-slate-100 dark:divide-white/[0.05] bg-white dark:bg-slate-800">
        {filtered.length === 0 ? (
          <p className="py-3 text-center text-xs text-slate-400">No matches</p>
        ) : (
          filtered.map((org) => {
            const isMain = (org.type || "").toUpperCase() === "MAIN";
            const isSelected = value === org.id;
            return (
              <button
                key={org.id}
                type="button"
                onClick={() => onChange(isSelected ? "" : org.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  isSelected ? "bg-brand-50 dark:bg-brand-500/15" : "hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                }`}
              >
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  isSelected ? "bg-brand-600 text-white" : isMain ? "bg-slate-800 dark:bg-slate-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}>
                  {org.name?.[0]?.toUpperCase() || "O"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate ${isSelected ? "text-brand-700 dark:text-brand-400" : "text-slate-900 dark:text-slate-100"}`}>
                    {org.name}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
                    {isMain ? "Main" : "Sub"}
                  </p>
                </div>
                {isSelected && (
                  <svg className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
