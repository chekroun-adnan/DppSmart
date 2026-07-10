import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { getMyOperations, reportOperationProgress } from "../services/authService";
import { Play, Pause, RotateCcw, CheckCircle, AlertTriangle, Clock, ChevronDown, ChevronUp, Send, BarChart3 } from "lucide-react";

const CARD = "bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/[0.06] p-5";

const STATUS_STYLES = {
  PLANNED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  READY: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PAUSED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  BLOCKED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const PROGRESS_COLORS = {
  low: { bar: "bg-red-500", text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/10" },
  medium: { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/10" },
  high: { bar: "bg-green-500", text: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/10" },
};

function StatusBadge({ status }) {
  const label = (status || "UNKNOWN").replace(/_/g, " ");
  const style = STATUS_STYLES[status] || "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${style}`}>{label}</span>;
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isOverdue(op) {
  if (op.status === "OVERDUE" || op.status === "COMPLETED") return op.status === "OVERDUE";
  if (op.status === "BLOCKED") return false;
  if (op.plannedEndTime && op.status !== "COMPLETED") return new Date(op.plannedEndTime) < new Date();
  return false;
}

export default function MyOperationsPage() {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [saving, setSaving] = useState({});
  const [progressForms, setProgressForms] = useState({});
  const [actionMsg, setActionMsg] = useState({});

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyOperations();
      setOperations(data);
    } catch (e) {
      setError(e.message || "Failed to load operations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totalOps = operations.length;
  const inProgressCount = operations.filter((o) => o.status === "IN_PROGRESS").length;
  const completedTodayCount = operations.filter((o) => o.status === "COMPLETED" && isToday(o.completedAt)).length;
  const overdueCount = operations.filter(isOverdue).length;

  const filtered = operations.filter((op) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (op.operationName || "").toLowerCase().includes(q);
  });

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleProgressChange = (id, field, value) => {
    setProgressForms((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { quantity: "", notes: "" }), [field]: value },
    }));
  };

  const handleReportProgress = async (id) => {
    const form = progressForms[id] || { quantity: "", notes: "" };
    const qty = parseInt(form.quantity, 10);
    if (!qty || qty <= 0) return;

    setSaving((p) => ({ ...p, [id]: true }));
    setActionMsg((p) => ({ ...p, [id]: "" }));
    try {
      await reportOperationProgress(id, { quantity: qty, notes: form.notes || "", markComplete: false });
      setProgressForms((prev) => ({ ...prev, [id]: { quantity: "", notes: "" } }));
      setActionMsg((p) => ({ ...p, [id]: "Progress reported!" }));
      await load();
    } catch (e) {
      setActionMsg((p) => ({ ...p, [id]: e.message || "Failed to report progress." }));
    } finally {
      setSaving((p) => ({ ...p, [id]: false }));
    }
  };

  const getProgressColors = (pct) => {
    if (pct >= 80) return PROGRESS_COLORS.high;
    if (pct >= 40) return PROGRESS_COLORS.medium;
    return PROGRESS_COLORS.low;
  };

  const renderActions = (op) => {
    const id = op.id;
    const key = String(id);

    if (op.status === "COMPLETED") {
      return (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle size={18} />
          <span className="text-sm font-semibold">Completed</span>
        </div>
      );
    }

    if (op.status === "BLOCKED" || op.status === "OVERDUE") {
      return (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertTriangle size={18} />
          <span className="text-sm font-semibold">{op.status === "BLOCKED" ? "Blocked" : "Overdue"}</span>
        </div>
      );
    }

    if (op.status === "PLANNED" || op.status === "READY") {
      return (
        <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.97] text-white text-sm font-semibold transition-all disabled:opacity-50 w-full sm:w-auto justify-center">
          <Play size={16} />
          Start Operation
        </button>
      );
    }

    if (op.status === "PAUSED") {
      return (
        <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white text-sm font-semibold transition-all disabled:opacity-50 w-full sm:w-auto justify-center">
          <RotateCcw size={16} />
          Resume
        </button>
      );
    }

    if (op.status === "IN_PROGRESS") {
      const form = progressForms[key] || { quantity: "", notes: "" };
      return (
        <div className="space-y-3">
          <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.97] text-white text-sm font-semibold transition-all disabled:opacity-50 w-full sm:w-auto justify-center">
            <Pause size={16} />
            Pause
          </button>
          <div className="border-t border-slate-100 dark:border-white/[0.06] pt-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Report Progress</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                min="1"
                placeholder="Qty completed"
                value={form.quantity}
                onChange={(e) => handleProgressChange(key, "quantity", e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#1E293B] text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
              <input
                type="text"
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => handleProgressChange(key, "notes", e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#1E293B] text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
              <button
                onClick={() => handleReportProgress(key)}
                disabled={saving[key] || !form.quantity || parseInt(form.quantity, 10) <= 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 active:scale-[0.97] text-white text-xs font-semibold transition-all disabled:opacity-50 w-full sm:w-auto justify-center"
              >
                <Send size={14} />
                {saving[key] ? "Sending..." : "Report"}
              </button>
            </div>
            {actionMsg[key] && (
              <p className={`mt-1.5 text-xs ${actionMsg[key].includes("Failed") ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                {actionMsg[key]}
              </p>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderCard = (op) => {
    const id = op.id;
    const key = String(id);
    const isExpanded = expandedIds.has(id);
    const completed = op.completedQuantity ?? 0;
    const required = op.requiredQuantity ?? 0;
    const remaining = Math.max(0, required - completed);
    const pct = op.completionPercentage ?? (required > 0 ? Math.round((completed / required) * 100) : 0);
    const colors = getProgressColors(pct);
    const due = isOverdue(op);
    const delayStatus = op.delayStatus;
    const healthScore = op.healthScore;

    return (
      <div key={id} className={`${CARD} space-y-4 animate-fade-in`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white truncate">{op.operationName}</p>
            {op.productName && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{op.productName}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {due && <Clock size={14} className="text-red-500" />}
            <StatusBadge status={op.status} />
          </div>
        </div>

        <div className={`rounded-xl p-4 ${colors.bg}`}>
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-600 dark:text-slate-300">Progress</span>
            <span className={colors.text}>{pct}%</span>
          </div>
          <div className="w-full h-3 bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${colors.bar}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{required}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Required</p>
            </div>
            <div>
              <p className={`text-lg font-bold ${colors.text}`}>{completed}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Completed</p>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-400 dark:text-slate-500">{remaining}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Remaining</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400 dark:text-slate-500">
          {op.durationPerUnit != null && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {op.durationPerUnit}{op.durationUnit || "min"}/unit
            </span>
          )}
          {op.totalDuration != null && (
            <span className="inline-flex items-center gap-1">
              <BarChart3 size={12} />
              Total: {op.totalDuration}{op.durationUnit || "min"}
            </span>
          )}
          {op.plannedStartTime && op.plannedEndTime && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {Math.max(0, Math.round(((new Date(op.plannedEndTime) - new Date(op.plannedStartTime)) / 3600000) * 10) / 10)}h planned
            </span>
          )}
        </div>

        {op.instructions && !isExpanded && (
          <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2">{op.instructions}</p>
        )}

        <button
          onClick={() => toggleExpand(id)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
        >
          {isExpanded ? (
            <><ChevronUp size={14} /> Less info</>
          ) : (
            <><ChevronDown size={14} /> More info</>
          )}
        </button>

        {isExpanded && (
          <div className="space-y-3 pt-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/[0.06]">
            {op.instructions && (
              <p><span className="font-semibold text-slate-700 dark:text-slate-300">Instructions:</span> {op.instructions}</p>
            )}
            {op.requiredResources && op.requiredResources.length > 0 && (
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Required resources:</span>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {op.requiredResources.map((r, i) => (
                    <li key={i}>{r.name || r}</li>
                  ))}
                </ul>
              </div>
            )}
            {op.qualityCheckRequired && (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <CheckCircle size={12} />
                <span className="font-semibold">Quality check required</span>
              </div>
            )}
            {delayStatus && (
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                <AlertTriangle size={12} />
                <span className="font-semibold">Delay: {delayStatus}</span>
              </div>
            )}
            {healthScore != null && (
              <div className="flex items-center gap-1.5">
                <BarChart3 size={12} className="text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400">
                  Health score:{" "}
                  <span className={`font-semibold ${
                    healthScore >= 80 ? "text-green-600 dark:text-green-400" :
                    healthScore >= 50 ? "text-amber-600 dark:text-amber-400" :
                    "text-red-600 dark:text-red-400"
                  }`}>{healthScore}%</span>
                </span>
              </div>
            )}
            {op.durationPerUnit != null && (
              <p><span className="font-semibold text-slate-700 dark:text-slate-300">Duration per unit:</span> {op.durationPerUnit}{op.durationUnit || "min"}</p>
            )}
            {op.totalDuration != null && (
              <p><span className="font-semibold text-slate-700 dark:text-slate-300">Total duration:</span> {op.totalDuration}{op.durationUnit || "min"}</p>
            )}
            {op.plannedStartTime && (
              <p>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Planned start:</span>{" "}
                {new Date(op.plannedStartTime).toLocaleString()}
              </p>
            )}
            {op.plannedEndTime && (
              <p>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Planned end:</span>{" "}
                {new Date(op.plannedEndTime).toLocaleString()}
              </p>
            )}
          </div>
        )}

        <div className="pt-1">{renderActions(op)}</div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Employee Portal</p>
          <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">My Operations</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: "Total Operations", value: totalOps, icon: BarChart3, color: "bg-slate-100 dark:bg-slate-900/30 text-slate-500" },
            { label: "In Progress", value: inProgressCount, icon: Play, color: "bg-blue-100 dark:bg-blue-900/30 text-blue-500" },
            { label: "Completed Today", value: completedTodayCount, icon: CheckCircle, color: "bg-green-100 dark:bg-green-900/30 text-green-500" },
            { label: "Overdue", value: overdueCount, icon: AlertTriangle, color: "bg-red-100 dark:bg-red-900/30 text-red-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`${CARD} flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon size={18} /></div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search by operation name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 pl-10 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#1E293B] text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : operations.length === 0 ? (
          <div className={`${CARD} text-center py-16`}>
            <BarChart3 size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="font-semibold text-slate-500 dark:text-slate-400">No operations assigned yet.</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Your production operations will appear here once assigned.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={`${CARD} text-center py-12`}>
            <p className="text-sm text-slate-400 dark:text-slate-500">No operations match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(renderCard)}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
