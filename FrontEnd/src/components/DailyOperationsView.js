import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getDailyOperations,
  startProductionOrderStep,
  completeProductionOrderStep,
} from "../services/authService";
import { useNotifications } from "../context/NotificationContext";
import ReportProgressModal from "./ReportProgressModal";
import ProgressHistoryModal from "./ProgressHistoryModal";

const DEPARTMENTS = [
  "All",
  "Cutting",
  "Printing",
  "Embroidery",
  "Sewing",
  "Quality Control",
  "Packaging",
];

const QUICK_FILTERS = [
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "week", label: "This Week" },
  { key: "overdue", label: "Overdue" },
  { key: "completed", label: "Completed" },
];

function formatDate(d) {
  return d.toLocaleDateString("en-CA");
}

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate();
}

function groupOperations(ops) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const completed = [];
  const active = [];

  for (const op of ops) {
    if (op.status === "COMPLETED" || op.status === "SKIPPED") {
      completed.push(op);
    } else {
      active.push(op);
    }
  }

  // Only keep the first (lowest sequence) active operation per order
  const byOrder = {};
  for (const op of active) {
    const existing = byOrder[op.orderId];
    if (!existing || op.sequenceOrder < existing.sequenceOrder) {
      byOrder[op.orderId] = op;
    }
  }
  const firstActive = Object.values(byOrder);

  // Split first active into overdue / today / future
  const overdue = [];
  const today = [];
  const future = [];

  for (const op of firstActive) {
    if (op.overdue) {
      overdue.push(op);
    } else if (op.plannedStartDateTime && isSameDay(new Date(op.plannedStartDateTime), todayStart)) {
      today.push(op);
    } else {
      future.push(op);
    }
  }

  return { overdue, today, future, completed };
}

function StatusBadge({ status, overdue }) {
  if (overdue) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-300">
        Overdue
      </span>
    );
  }
  switch (status) {
    case "COMPLETED":
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          Completed
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300">
          In Progress
        </span>
      );
    case "BLOCKED":
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-300">
          Blocked
        </span>
      );
    case "WAITING":
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500">
          Waiting
        </span>
      );
    case "PLANNED":
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500">
          Planned
        </span>
      );
    case "READY":
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
          Ready
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
          {status}
        </span>
      );
  }
}

function SectionHeader({ label, count, color }) {
  const colors = {
    red: "border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/10",
    blue: "border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10",
    emerald: "border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10",
    slate: "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800",
  };
  return (
    <div className={`rounded-xl border px-4 py-2 flex items-center justify-between ${colors[color] || colors.slate}`}>
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      <span className="text-xs font-semibold">{count} operation{count !== 1 ? "s" : ""}</span>
    </div>
  );
}

function OperationCard({ op, onAction, actionLoading, onReportProgress, onViewHistory }) {
  const isBusy = actionLoading === op.operationId;
  const canStart = op.status === "READY" || op.status === "PENDING";
  const canComplete = op.status === "IN_PROGRESS";
  const canReport = op.status === "IN_PROGRESS";
  const minsUntil = op.status === "PLANNED" && op.plannedStartDateTime
    ? Math.round((new Date(op.plannedStartDateTime) - Date.now()) / 60000)
    : null;

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      op.overdue
        ? "border-red-200 dark:border-red-500/30 bg-red-50/30 dark:bg-red-500/5"
        : "border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/40"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {op.orderReference || op.orderId?.slice(-6)}
            </p>
            <StatusBadge status={op.status} overdue={op.overdue} />
            {op.carriedForward && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300">
                Carried Forward
              </span>
            )}
            {op.priorityScore >= 500 && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300">
                High Priority
              </span>
            )}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div>
              <span className="text-slate-400">Product:</span>
              <span className="ml-1 font-semibold text-slate-700 dark:text-slate-200">{op.productName || "—"}</span>
            </div>
            <div>
              <span className="text-slate-400">Operation:</span>
              <span className="ml-1 font-semibold text-slate-700 dark:text-slate-200">{op.operationName || "—"}</span>
            </div>
            <div>
              <span className="text-slate-400">Dept:</span>
              <span className="ml-1 font-semibold text-slate-700 dark:text-slate-200">{op.department || "—"}</span>
            </div>
            <div>
              <span className="text-slate-400">{op.completionPercentage > 0 && op.requiredQuantity > 0 ? "Remaining:" : "Qty:"}</span>
              <span className="ml-1 font-semibold text-slate-700 dark:text-slate-200">
                {op.completionPercentage > 0 && op.requiredQuantity > 0 ? (op.remainingQuantity || 0) : (op.quantity || 0)}
              </span>
            </div>
            {/* WIP Quantity */}
            {(op.status === "IN_PROGRESS" || op.completionPercentage > 0) && op.requiredQuantity > 0 && (
              <div>
                <span className="text-slate-400">Progress:</span>
                <span className="ml-1 font-semibold text-green-600 dark:text-green-400">{op.completedQuantity || 0}/{op.requiredQuantity}</span>
                <span className="ml-1 text-[10px] text-slate-400">({Math.round(op.completionPercentage || 0)}%)</span>
              </div>
            )}
            {op.assignedEmployee && (
              <div>
                <span className="text-slate-400">Employee:</span>
                <span className="ml-1 font-semibold text-slate-700 dark:text-slate-200">{op.assignedEmployee}</span>
              </div>
            )}
            {op.deliveryDateLabel && (
              <div>
                <span className="text-slate-400">Delivery:</span>
                <span className="ml-1 font-semibold text-slate-700 dark:text-slate-200">{op.deliveryDateLabel}</span>
            </div>
          )}
        </div>

          {(op.plannedStartDateTime || op.plannedEndDateTime) && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              {op.plannedStartDateTime && (
                <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                  {formatTime(op.plannedStartDateTime)}
                </span>
              )}
              {op.plannedStartDateTime && op.plannedEndDateTime && (
                <span className="text-slate-400">→</span>
              )}
              {op.plannedEndDateTime && (
                <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                  {formatTime(op.plannedEndDateTime)}
                </span>
              )}
              {op.durationFormatted && (
                <span className="text-slate-400 ml-1">({op.durationFormatted})</span>
              )}
              {minsUntil !== null && minsUntil > 0 && (
                <span className="text-[10px] text-slate-400 ml-2">
                  Starts in {minsUntil >= 60
                    ? `${Math.floor(minsUntil / 60)}h ${minsUntil % 60}m`
                    : `${minsUntil} minutes`}
                </span>
              )}
            </div>
          )}

          {/* WIP Progress Bar */}
          {(op.status === "IN_PROGRESS" || op.completionPercentage > 0) && op.requiredQuantity > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span>Completed: <strong className="text-green-600 dark:text-green-400">{op.completedQuantity || 0}</strong></span>
                <span>Remaining: <strong className={op.remainingQuantity > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}>{op.remainingQuantity || 0}</strong></span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      op.completionPercentage >= 100 ? "bg-green-500"
                        : op.completionPercentage >= 50 ? "bg-brand-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(op.completionPercentage || 0, 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 w-8 text-right">
                  {Math.round(op.completionPercentage || 0)}%
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {canStart && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onAction(op.operationId, "start")}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 disabled:opacity-50 transition-colors"
            >
              {isBusy ? "…" : "Start"}
            </button>
          )}
          {canReport && (
            <>
              <button
                type="button"
                onClick={() => onReportProgress(op)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 transition-colors"
              >
                Report
              </button>
              <button
                type="button"
                onClick={() => onViewHistory(op)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-400 transition-colors"
              >
                History
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onAction(op.operationId, "complete")}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 disabled:opacity-50 transition-colors"
              >
                {isBusy ? "…" : "Complete"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DailyOperationsView() {
  const { t } = useTranslation();
  const { addToast } = useNotifications();
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [date, setDate] = useState(() => formatDate(new Date()));
  const [department, setDepartment] = useState("All");
  const [quickFilter, setQuickFilter] = useState("today");
  const [actionLoading, setActionLoading] = useState(null);
  const [progressModalOp, setProgressModalOp] = useState(null);
  const [historyModalOp, setHistoryModalOp] = useState(null);

  const loadOperations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { date };
      if (department !== "All") params.department = department;
      const data = await getDailyOperations(params);
      setOperations(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load daily operations.");
    } finally {
      setLoading(false);
    }
  }, [date, department]);

  useEffect(() => { loadOperations(); }, [loadOperations]);

  const handleQuickFilter = (key) => {
    setQuickFilter(key);
    const now = new Date();
    switch (key) {
      case "today":
        setDate(formatDate(now));
        break;
      case "tomorrow": {
        const t = new Date(now);
        t.setDate(t.getDate() + 1);
        setDate(formatDate(t));
        break;
      }
      case "week":
        setDate(formatDate(now));
        break;
      case "overdue":
        setDate(formatDate(now));
        break;
      case "completed":
        setDate(formatDate(now));
        break;
    }
  };

  const handleAction = async (stepId, action) => {
    if (actionLoading) return;
    setActionLoading(stepId);
    try {
      if (action === "start") await startProductionOrderStep(stepId);
      else if (action === "complete") await completeProductionOrderStep(stepId);
      addToast({ type: "success", title: "Done", message: `Step ${action}ed successfully.` });
      await loadOperations();
    } catch (e) {
      addToast({ type: "error", title: "Error", message: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const { overdue, today, future, completed } = groupOperations(operations);

  const weekOps = quickFilter === "week" ? [...overdue, ...today, ...future] : [];
  const displayOverdue = overdue;
  const displayToday = today;
  const displayFuture = future;
  const displayCompleted = completed;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 min-w-max p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.03]">
          {QUICK_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleQuickFilter(key)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                quickFilter === key
                  ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          type="date"
          value={date}
          onChange={e => { setDate(e.target.value); setQuickFilter(""); }}
          className="h-9 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/60 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
        />

        <select
          value={department}
          onChange={e => setDepartment(e.target.value)}
          className="h-9 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/60 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
        >
          {DEPARTMENTS.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          <span className="ml-3 text-sm text-slate-500">Loading operations…</span>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && operations.length === 0 && (
        <div className="glass-card py-12 text-center border-slate-200">
          <p className="text-sm font-semibold text-slate-500">No operations found for this date.</p>
          <p className="text-xs text-slate-400 mt-1">Try selecting a different date or department.</p>
        </div>
      )}

      {/* Results */}
      {!loading && !error && operations.length > 0 && (
        <div className="space-y-6">
          {quickFilter === "completed" ? (
            /* Completed Only */
            displayCompleted.length > 0 ? (
              <div className="space-y-2">
                <SectionHeader label="Completed" count={displayCompleted.length} color="emerald" />
            <div className="space-y-2">
              {displayCompleted.map(op => (
                <OperationCard key={op.operationId} op={op} onAction={handleAction} actionLoading={actionLoading} onReportProgress={setProgressModalOp} onViewHistory={setHistoryModalOp} />
              ))}
            </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No completed operations for this date.</p>
            )
          ) : (
            <>
              {/* Overdue */}
              {displayOverdue.length > 0 && (
                <div className="space-y-2">
                  <SectionHeader label="Overdue" count={displayOverdue.length} color="red" />
                  <div className="space-y-2">
                    {displayOverdue.map(op => (
                      <OperationCard key={op.operationId} op={op} onAction={handleAction} actionLoading={actionLoading} onReportProgress={setProgressModalOp} onViewHistory={setHistoryModalOp} />
                    ))}
                  </div>
                </div>
              )}

              {/* Today */}
              {displayToday.length > 0 && (
                <div className="space-y-2">
                  <SectionHeader label="Today" count={displayToday.length} color="blue" />
                  <div className="space-y-2">
                    {displayToday.map(op => (
                      <OperationCard key={op.operationId} op={op} onAction={handleAction} actionLoading={actionLoading} onReportProgress={setProgressModalOp} onViewHistory={setHistoryModalOp} />
                    ))}
                  </div>
                </div>
              )}

              {/* Future */}
              {displayFuture.length > 0 && (
                <div className="space-y-2">
                  <SectionHeader
                    label={quickFilter === "tomorrow" ? "Tomorrow" : quickFilter === "week" ? "This Week" : "Other"}
                    count={displayFuture.length}
                    color="slate"
                  />
                  <div className="space-y-2">
                    {displayFuture.map(op => (
                      <OperationCard key={op.operationId} op={op} onAction={handleAction} actionLoading={actionLoading} onReportProgress={setProgressModalOp} onViewHistory={setHistoryModalOp} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {progressModalOp && (
        <ReportProgressModal
          step={progressModalOp}
          onClose={() => setProgressModalOp(null)}
          onReported={loadOperations}
        />
      )}
      {historyModalOp && (
        <ProgressHistoryModal
          step={historyModalOp}
          onClose={() => setHistoryModalOp(null)}
        />
      )}
    </div>
  );
}
