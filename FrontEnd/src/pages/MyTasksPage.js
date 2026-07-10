import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { getMyOperations, reportOperationProgress } from "../services/authService";
import { Play, Pause, RotateCcw, CheckCircle, AlertTriangle, Clock, ChevronDown, ChevronUp, Send } from "lucide-react";

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

const TAB_CONFIG = [
  { key: "pending", label: "Pending", filter: (o) => o.status === "PLANNED" || o.status === "READY" },
  { key: "inProgress", label: "In Progress", filter: (o) => o.status === "IN_PROGRESS" || o.status === "PAUSED" },
  { key: "completed", label: "Completed", filter: (o) => o.status === "COMPLETED" },
];

function StatusBadge({ status }) {
  const label = (status || "UNKNOWN").replace(/_/g, " ");
  const style = STATUS_STYLES[status] || "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${style}`}>{label}</span>;
}

export default function MyTasksPage() {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [saving, setSaving] = useState({});
  const [progressForms, setProgressForms] = useState({});
  const [actionMsg, setActionMsg] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyOperations();
      setOperations(data);
    } catch (e) {
      setError(e.message || "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const opsByTab = {};
  for (const tab of TAB_CONFIG) {
    opsByTab[tab.key] = operations.filter(tab.filter);
  }

  const filtered = opsByTab[activeTab] || [];

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

    const key = String(id);
    setSaving((p) => ({ ...p, [key]: true }));
    setActionMsg((p) => ({ ...p, [key]: "" }));
    try {
      await reportOperationProgress(id, { quantity: qty, notes: form.notes || "", markComplete: false });
      setProgressForms((prev) => ({ ...prev, [id]: { quantity: "", notes: "" } }));
      setActionMsg((p) => ({ ...p, [key]: "Progress reported!" }));
      await load();
    } catch (e) {
      setActionMsg((p) => ({ ...p, [key]: e.message || "Failed to report progress." }));
    } finally {
      setSaving((p) => ({ ...p, [key]: false }));
    }
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
        <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.97] text-white text-sm font-semibold transition-all disabled:opacity-50">
          <Play size={16} />
          Start
        </button>
      );
    }

    if (op.status === "PAUSED") {
      return (
        <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white text-sm font-semibold transition-all disabled:opacity-50">
          <RotateCcw size={16} />
          Resume
        </button>
      );
    }

    if (op.status === "IN_PROGRESS") {
      const form = progressForms[key] || { quantity: "", notes: "" };
      return (
        <div className="space-y-3">
          <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.97] text-white text-sm font-semibold transition-all disabled:opacity-50">
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 active:scale-[0.97] text-white text-xs font-semibold transition-all disabled:opacity-50"
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
    const pct = op.completionPercentage ?? (required > 0 ? Math.round((completed / required) * 100) : 0);

    return (
      <div key={id} className={`${CARD} space-y-3 animate-fade-in`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white truncate">{op.operationName}</p>
            {op.productName && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{op.productName}</p>
            )}
          </div>
          <StatusBadge status={op.status} />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span>Completed: {completed} / {required}</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{pct}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>

        {op.instructions && !isExpanded && (
          <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2">{op.instructions}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
          {op.durationPerUnit != null && <span>{op.durationPerUnit}{op.durationUnit || "min"}/unit</span>}
          {op.totalDuration != null && <span>Total: {op.totalDuration}{op.durationUnit || "min"}</span>}
        </div>

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
          <div className="space-y-2 pt-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/[0.06]">
            {op.instructions && (
              <p><span className="font-semibold text-slate-700 dark:text-slate-300">Instructions:</span> {op.instructions}</p>
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
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock size={12} />
              <span>
                {op.plannedStartTime && op.plannedEndTime
                  ? `${Math.max(0, Math.round(((new Date(op.plannedEndTime) - new Date(op.plannedStartTime)) / 3600000) * 10) / 10)}h planned`
                  : "Time not set"}
              </span>
            </div>
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
          <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">My Tasks</h1>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: "Pending", value: opsByTab.pending.length, icon: Clock, color: "bg-amber-100 dark:bg-amber-900/30 text-amber-500" },
            { label: "In Progress", value: opsByTab.inProgress.length, icon: Play, color: "bg-blue-100 dark:bg-blue-900/30 text-blue-500" },
            { label: "Completed", value: opsByTab.completed.length, icon: CheckCircle, color: "bg-green-100 dark:bg-green-900/30 text-green-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`${CARD} flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon size={18} /></div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            </div>
          ))}
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
            <CheckCircle size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="font-semibold text-slate-500 dark:text-slate-400">No tasks assigned yet.</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Your production tasks will appear here once assigned.</p>
          </div>
        ) : (
          <>
            <div className="flex border-b border-slate-200 dark:border-white/[0.06]">
              {TAB_CONFIG.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-4 sm:px-6 py-3 text-sm font-semibold transition-colors ${
                    activeTab === tab.key
                      ? "text-brand-600 dark:text-brand-400"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 text-xs opacity-60">({opsByTab[tab.key].length})</span>
                  {activeTab === tab.key && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 dark:bg-brand-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className={`${CARD} text-center py-12`}>
                <p className="text-sm text-slate-400 dark:text-slate-500">No tasks in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(renderCard)}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
