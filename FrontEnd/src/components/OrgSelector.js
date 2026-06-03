import { useEffect, useState } from "react";
import {
  getMainOrganizations,
  getMyOrganizations,
  getSubOrganizations,
} from "../services/authService";

const userRole = () => (localStorage.getItem("userRole") || "").toUpperCase();


export default function OrgSelector({ value, onChange, className = "" }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAdmin = userRole() === "ADMIN";
    const fetch = isAdmin
      ? Promise.all([getMainOrganizations(), getSubOrganizations()]).then(
          ([m, s]) => [...m, ...s]
        )
      : getMyOrganizations();
    fetch
      .then((data) => setOrgs(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className={`h-9 w-52 rounded-xl bg-slate-100 dark:bg-slate-700/50 animate-pulse ${className}`} />;
  }

  if (orgs.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 whitespace-nowrap">
        Organization
      </label>
      <select
        value={value}
        onChange={(e) => {
          const orgId = e.target.value;
          onChange(orgId);
          localStorage.setItem("orgId", orgId);
        }}
        className="h-9 appearance-none rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 pl-3 pr-8 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 cursor-pointer bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzY0NzQ4YiIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_0.5rem_center] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzk0YTNiOCIvPjwvc3ZnPg==')] dark:bg-[right_0.5rem_center]"
      >
        <option value="">All organizations</option>
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
            {o.type ? ` (${o.type === "MAIN" ? "Main" : "Sub"})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
