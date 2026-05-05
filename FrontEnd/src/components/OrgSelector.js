import { useEffect, useState } from "react";
import {
  getMainOrganizations,
  getMyOrganizations,
  getSubOrganizations,
} from "../services/authService";

const userRole = () => (localStorage.getItem("userRole") || "").toUpperCase();

/**
 * Page-level org filter. Renders a <select> dropdown.
 * Props:
 *   value    – selected org id (controlled, "" = all)
 *   onChange – called with org id string
 */
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
    return <div className={`h-10 w-52 rounded-xl bg-slate-100 animate-pulse ${className}`} />;
  }

  if (orgs.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
        Organization
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-xl border border-slate-200 bg-white px-3 pr-8 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 cursor-pointer"
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
