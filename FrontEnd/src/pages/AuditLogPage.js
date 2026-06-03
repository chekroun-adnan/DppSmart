import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import { getAuditLogs } from "../services/authService";

const ENTITY_TYPES = [
  { value: "", label: "All Types" },
  { value: "Product", label: "Product" },
  { value: "Task", label: "Task" },
  { value: "Employee", label: "Employee" },
  { value: "Order", label: "Order" },
  { value: "TechnicalSheet", label: "Technical Sheet" },
  { value: "Production", label: "Production" },
  { value: "Stock", label: "Stock" },
];

const ACTION_TYPES = [
  { value: "", label: "All Actions" },
  { value: "CREATE", label: "Created" },
  { value: "UPDATE", label: "Updated" },
  { value: "DELETE", label: "Deleted" },
  { value: "STATUS_CHANGE", label: "Status Changed" },
];

const ACTION_STYLE = {
  CREATE: { bg: "status-emerald", icon: "✓" },
  UPDATE: { bg: "status-blue", icon: "✎" },
  DELETE: { bg: "status-red", icon: "✕" },
  STATUS_CHANGE: { bg: "status-amber", icon: "↻" },
};

const INPUT = "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const SELECT = "h-11 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 pl-4 pr-10 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 cursor-pointer bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzY0NzQ4YiIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_0.75rem_center] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzk0YTNiOCIvPjwvc3ZnPg==')] dark:bg-[right_0.75rem_center]";

export default function AuditLogPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    entityType: "",
    action: "",
    userEmail: "",
    startDate: "",
    endDate: "",
  });
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const params = { ...filters, page, size: 50 };
        if (!filters.startDate) delete params.startDate;
        if (!filters.endDate) delete params.endDate;
        if (!filters.userEmail) delete params.userEmail;
        const data = await getAuditLogs(params);
        if (mounted) {
          setLogs(data.content || []);
          setTotalPages(data.totalPages || 0);
          setTotalElements(data.totalElements || 0);
        }
      } catch (e) {
        if (mounted) setError(e.message || "Failed to load audit logs.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [filters, page]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const formatTimestamp = (ts) => {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const timeAgo = (ts) => {
    if (!ts) return "";
    const now = new Date();
    const then = new Date(ts);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">{t("audit.security", "Security")}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{t("audit.title", "Audit Trail")}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("audit.subtitle", "Track all changes made across the system — who changed what, and when.")}</p>
        </div>

        
        <div className="glass-card p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Entity Type</label>
              <select className={SELECT} value={filters.entityType} onChange={(e) => handleFilterChange("entityType", e.target.value)}>
                {ENTITY_TYPES.map((et) => (
                  <option key={et.value} value={et.value}>{et.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Action</label>
              <select className={SELECT} value={filters.action} onChange={(e) => handleFilterChange("action", e.target.value)}>
                {ACTION_TYPES.map((at) => (
                  <option key={at.value} value={at.value}>{at.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">User Email</label>
              <input className={INPUT} placeholder="user@example.com" value={filters.userEmail} onChange={(e) => handleFilterChange("userEmail", e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">From</label>
              <input type="datetime-local" className={INPUT} value={filters.startDate} onChange={(e) => handleFilterChange("startDate", e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">To</label>
              <input type="datetime-local" className={INPUT} value={filters.endDate} onChange={(e) => handleFilterChange("endDate", e.target.value)} />
            </div>
          </div>
        </div>

        
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">{totalElements} log entries found</p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500 dark:text-slate-400">Page {page + 1} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="mx-auto w-10 h-10 text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm font-semibold text-slate-500">No audit logs found.</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Action</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Entity</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">User</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Timestamp</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400"></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const as = ACTION_STYLE[log.action] || ACTION_STYLE.UPDATE;
                    const isExpanded = expandedLog === log.id;
                    return (
                      <tr key={log.id} className="border-b border-slate-50 dark:border-white/[0.04] hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${as.bg}`}>
                            <span className="text-xs">{as.icon}</span>
                            {log.action?.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{log.entityType}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{log.entityId?.slice(0, 12)}...</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-700 dark:text-slate-300 max-w-xs truncate">{log.description || "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{log.userEmail?.split("@")[0]}</p>
                            <p className="text-[10px] text-slate-400">{log.userEmail}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-700 dark:text-slate-300">{formatTimestamp(log.timestamp)}</p>
                          <p className="text-[10px] text-slate-400">{timeAgo(log.timestamp)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                          >
                            <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            
            {expandedLog && (() => {
              const log = logs.find((l) => l.id === expandedLog);
              if (!log) return null;
              return (
                <div className="border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/50 p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Entity ID</p>
                      <p className="font-mono text-xs text-slate-700 dark:text-slate-300 mt-1 break-all">{log.entityId}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">User ID</p>
                      <p className="font-mono text-xs text-slate-700 dark:text-slate-300 mt-1 break-all">{log.userId}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Organization ID</p>
                      <p className="font-mono text-xs text-slate-700 dark:text-slate-300 mt-1 break-all">{log.organizationId || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Timestamp</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">{formatTimestamp(log.timestamp)}</p>
                    </div>
                  </div>
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <div className="mt-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Changes</p>
                      <pre className="text-xs bg-slate-100 dark:bg-slate-800 rounded-xl p-3 overflow-x-auto text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.06]">
                        {JSON.stringify(log.changes, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
