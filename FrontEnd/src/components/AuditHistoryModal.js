import { useEffect, useState } from "react";
import { getEntityAuditLogs } from "../services/authService";

const ACTION_STYLE = {
  CREATE: { bg: "status-emerald", border: "border-emerald-200", dot: "bg-emerald-500" },
  UPDATE: { bg: "status-blue", border: "border-blue-200", dot: "bg-blue-500" },
  DELETE: { bg: "status-red", border: "border-red-200", dot: "bg-red-500" },
  STATUS_CHANGE: { bg: "status-amber", border: "border-amber-200", dot: "bg-amber-500" },
};

function timeAgo(ts) {
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
}

function formatTimestamp(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function AuditHistoryModal({ entityType, entityId, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!entityId) return;
    let mounted = true;
    async function load() {
      try {
        const data = await getEntityAuditLogs(entityType, entityId, 0, 50);
        if (mounted) setLogs(data.content || []);
      } catch {
        if (mounted) setLogs([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [entityType, entityId]);

  if (!entityId) return null;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4 py-6 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-slate-900/10 max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">History</h2>
              <p className="text-xs text-slate-400 mt-0.5">{logs.length} change{logs.length !== 1 ? "s" : ""} recorded</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-6 h-6 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading history...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center">
              <svg className="mx-auto w-8 h-8 text-slate-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-slate-400">No changes recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {logs.map((log, idx) => {
                const as = ACTION_STYLE[log.action] || ACTION_STYLE.UPDATE;
                const isExpanded = expanded === log.id;
                return (
                  <div key={log.id} className="relative">
                    {idx < logs.length - 1 && (
                      <div className="absolute left-[11px] top-7 bottom-0 w-px bg-slate-200 dark:bg-slate-600" />
                    )}
                    <div className="flex gap-3 py-3">
                      <div className={`relative z-10 mt-1 h-6 w-6 rounded-full ${as.dot} ring-4 ring-white dark:ring-slate-800 shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${as.bg}`}>
                            {log.action?.replace("_", " ")}
                          </span>
                          <span className="text-[10px] text-slate-400">{timeAgo(log.timestamp)}</span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{log.description || `${log.action} ${entityType}`}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{log.userEmail} · {formatTimestamp(log.timestamp)}</p>
                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpanded(isExpanded ? null : log.id)}
                            className="text-[10px] font-semibold text-brand-600 hover:text-brand-700 mt-1"
                          >
                            {isExpanded ? "Hide details" : "View changes"}
                          </button>
                        )}
                        {isExpanded && log.changes && (
                          <pre className="mt-2 text-[10px] bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 overflow-x-auto text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-white/[0.06]">
                            {JSON.stringify(log.changes, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
