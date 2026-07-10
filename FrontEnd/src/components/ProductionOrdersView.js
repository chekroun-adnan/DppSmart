import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getProductionOrders,
  getProductionOrderSteps,
  generateProductionSteps,
  startProductionOrderStep,
  completeProductionOrderStep,
  blockProductionOrderStep,
  skipProductionOrderStep,
} from "../services/authService";
import { useNotifications } from "../context/NotificationContext";
import ReportProgressModal from "./ReportProgressModal";
import ProgressHistoryModal from "./ProgressHistoryModal";

const STATUS_STYLE = {
  PLANNED: "border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50",
  READY: "border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400",
  IN_PROGRESS: "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-2 ring-blue-200 dark:ring-blue-500/30",
  COMPLETED: "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  BLOCKED: "border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 ring-2 ring-red-200 dark:ring-red-500/30",
  SKIPPED: "border-slate-300 bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500",
};

const STATUS_LABEL = {
  PLANNED: "Planned",
  READY: "Ready",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  BLOCKED: "Blocked",
  SKIPPED: "Skipped",
};

function getMinutesUntil(startDate) {
  if (!startDate) return null;
  const diff = new Date(startDate) - Date.now();
  return Math.round(diff / 60000);
}

function formatDuration(totalMinutes, unit) {
  if (totalMinutes == null) return "";
  const mins = unit === "HOURS" ? totalMinutes * 60 : totalMinutes;
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function Badge({ label, color = "slate" }) {
  const colors = {
    blue: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300",
    emerald: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
    slate: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
    red: "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-300",
    purple: "bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${colors[color] || colors.slate}`}>
      {label}
    </span>
  );
}

export default function ProductionOrdersView() {
  const { t } = useTranslation();
  const { addToast } = useNotifications();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderStepsMap, setOrderStepsMap] = useState({});
  const [stepsLoading, setStepsLoading] = useState({});
  const [stepActionLoading, setStepActionLoading] = useState(null);
  const [generatingMap, setGeneratingMap] = useState({});
  const [blockReason, setBlockReason] = useState({});

  // WIP modals
  const [progressModalStep, setProgressModalStep] = useState(null);
  const [historyModalStep, setHistoryModalStep] = useState(null);

  const allCompletedSteps = Object.values(orderStepsMap).flat().filter(s =>
    s.status === "COMPLETED" || s.status === "SKIPPED");

  const renderStep = (step) => {
    const stateClass = STATUS_STYLE[step.status] || STATUS_STYLE.READY;
    const isBusy = stepActionLoading === step.id;
    const minsUntil = step.status === "PLANNED" ? getMinutesUntil(step.plannedStartTime) : null;

    return (
      <div key={step.id} className="relative flex gap-3 pb-1">
        <div className="shrink-0 mt-1">
          <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all ${stateClass}`}>
            {step.status === "COMPLETED" ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            ) : step.status === "SKIPPED" ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : step.status === "BLOCKED" ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            ) : step.status === "PLANNED" ? (
              <span className="text-[11px]">📅</span>
            ) : step.status === "IN_PROGRESS" ? (
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            ) : step.sequenceOrder}
          </div>
        </div>
        <div className="flex-1 min-w-0 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {step.operationName || `Step ${step.sequenceOrder}`}
                </p>
                <Badge label={STATUS_LABEL[step.status] || step.status} color={
                  step.status === "COMPLETED" ? "emerald" :
                  step.status === "IN_PROGRESS" ? "blue" :
                  step.status === "BLOCKED" ? "red" :
                  step.status === "SKIPPED" ? "slate" :
                  step.status === "PLANNED" ? "slate" : "slate"
                } />
                {step.overdue && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-300">
                    Overdue
                  </span>
                )}
              </div>
              {step.durationPerUnit != null && step.orderQuantity != null && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {step.durationPerUnit} {step.durationUnit === "HOURS" ? "h" : "min"}/pc × {(step.completionPercentage > 0 && step.remainingQuantity > 0) ? step.remainingQuantity : (step.requiredQuantity || step.orderQuantity)} pcs
                  {step.totalDuration != null && (
                    <> = {step.totalDuration} {step.durationUnit === "HOURS" ? "h" : "min"} ({formatDuration(step.totalDuration, step.durationUnit)})</>
                  )}
                </p>
              )}
              {step.plannedStartTime && step.plannedEndTime && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {formatDateTime(step.plannedStartTime)} → {formatDateTime(step.plannedEndTime)}
                </p>
              )}
              {minsUntil !== null && minsUntil > 0 && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Starts in {minsUntil >= 60
                    ? `${Math.floor(minsUntil / 60)}h ${minsUntil % 60}m`
                    : `${minsUntil} minutes`}
                </p>
              )}
              {minsUntil !== null && minsUntil <= 0 && step.status === "PLANNED" && (
                <p className="text-[10px] text-amber-500 mt-0.5">Waiting for previous step to complete</p>
              )}
              {step.responsibleDepartment && (
                <p className="text-[10px] text-slate-400 mt-0.5">Dept: {step.responsibleDepartment}</p>
              )}
              {step.blockedReason && (
                <p className="text-[10px] text-red-500 mt-0.5">Reason: {step.blockedReason}</p>
              )}
              {step.instructions && (
                <p className="text-[10px] text-slate-400 mt-0.5 italic">{step.instructions}</p>
              )}
              {/* WIP Progress Bar */}
              {(step.status === "IN_PROGRESS" || step.completionPercentage > 0) && step.requiredQuantity > 0 && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                    {step.completionPercentage > 0 && step.remainingQuantity > 0 ? (
                      <>Remaining: <strong className="text-amber-600 dark:text-amber-400">{step.remainingQuantity}</strong> &middot; Completed: <strong className="text-green-600 dark:text-green-400">{step.completedQuantity || 0}</strong></>
                    ) : (
                      <>Required: {step.requiredQuantity}</>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          step.completionPercentage >= 100 ? "bg-green-500"
                            : step.completionPercentage >= 50 ? "bg-brand-500"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(step.completionPercentage || 0, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 w-8 text-right">
                      {Math.round(step.completionPercentage || 0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {(step.status === "READY" || step.status === "PENDING") && (
                <>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => doStepAction(step.id, "start")}
                    className="text-xs font-semibold px-2 py-1 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 disabled:opacity-50 transition-colors"
                  >
                    {isBusy ? "…" : "Start"}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => doStepAction(step.id, "skip")}
                    className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-400 disabled:opacity-50 transition-colors"
                  >
                    {isBusy ? "…" : "Skip"}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      const reason = prompt("Reason for blocking:");
                      if (reason && reason.trim()) {
                        doStepAction(step.id, "block", reason.trim());
                      }
                    }}
                    className="text-xs font-semibold px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 disabled:opacity-50 transition-colors"
                  >
                    {isBusy ? "…" : "Block"}
                  </button>
                </>
              )}
              {(step.status === "PLANNED" || step.status === "WAITING") && (
                <>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => doStepAction(step.id, "skip")}
                    className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-400 disabled:opacity-50 transition-colors"
                  >
                    {isBusy ? "…" : "Skip"}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      const reason = prompt("Reason for blocking:");
                      if (reason && reason.trim()) {
                        doStepAction(step.id, "block", reason.trim());
                      }
                    }}
                    className="text-xs font-semibold px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 disabled:opacity-50 transition-colors"
                  >
                    {isBusy ? "…" : "Block"}
                  </button>
                </>
              )}
              {step.status === "IN_PROGRESS" && (
                <>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setProgressModalStep(step)}
                    className="text-xs font-semibold px-2 py-1 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 disabled:opacity-50 transition-colors"
                  >
                    Report
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryModalStep(step)}
                    className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-400 transition-colors"
                  >
                    History
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => doStepAction(step.id, "complete")}
                    className="text-xs font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 disabled:opacity-50 transition-colors"
                  >
                    {isBusy ? "…" : "Complete"}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      const reason = prompt("Reason for blocking:");
                      if (reason && reason.trim()) {
                        doStepAction(step.id, "block", reason.trim());
                      }
                    }}
                    className="text-xs font-semibold px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 disabled:opacity-50 transition-colors"
                  >
                    {isBusy ? "…" : "Block"}
                  </button>
                </>
              )}
              {step.status === "BLOCKED" && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => doStepAction(step.id, "start")}
                  className="text-xs font-semibold px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 disabled:opacity-50 transition-colors"
                >
                  {isBusy ? "…" : "Resume"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getProductionOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load production orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const loadSteps = async (orderId) => {
    setStepsLoading(p => ({ ...p, [orderId]: true }));
    try {
      const steps = await getProductionOrderSteps(orderId);
      setOrderStepsMap(p => ({ ...p, [orderId]: Array.isArray(steps) ? steps : [] }));
    } catch (e) {
      addToast({ type: "error", title: "Failed to load steps", message: e.message });
    } finally {
      setStepsLoading(p => ({ ...p, [orderId]: false }));
    }
  };

  const toggleExpand = (orderId) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(orderId);
    if (!orderStepsMap[orderId]) {
      loadSteps(orderId);
    }
  };

  const handleGenerateSteps = async (orderId) => {
    setGeneratingMap(p => ({ ...p, [orderId]: true }));
    setError("");
    try {
      const result = await generateProductionSteps(orderId);
      addToast({ type: "success", title: "Steps Generated", message: `${result.stepsGenerated} steps created.` });
      await loadOrders();
      await loadSteps(orderId);
    } catch (e) {
      setError(e.message || "Failed to generate steps.");
    } finally {
      setGeneratingMap(p => ({ ...p, [orderId]: false }));
    }
  };

  const doStepAction = async (stepId, action, extra) => {
    if (stepActionLoading) return;
    setStepActionLoading(stepId);
    setError("");
    try {
      switch (action) {
        case "start":
          await startProductionOrderStep(stepId);
          break;
        case "complete":
          await completeProductionOrderStep(stepId);
          break;
        case "block":
          await blockProductionOrderStep(stepId, extra);
          break;
        case "skip":
          await skipProductionOrderStep(stepId);
          break;
      }
      await loadOrders();
      if (expandedOrderId) await loadSteps(expandedOrderId);
    } catch (e) {
      setError(e.message || `Failed to ${action} step.`);
    } finally {
      setStepActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        <span className="ml-3 text-sm text-slate-500">Loading production orders…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="glass-card py-12 text-center border-slate-200">
        <p className="text-sm font-semibold text-slate-500">No orders ready for production.</p>
        <p className="text-xs text-slate-400 mt-1">Orders with status "Ready for Production" will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {orders.map((order, queueIndex) => {
        const isExpanded = expandedOrderId === order.orderId;
        const steps = orderStepsMap[order.orderId] || [];
        const isLoadingSteps = stepsLoading[order.orderId];
        const isGenerating = generatingMap[order.orderId];

        const orderStart = order.plannedStartDateTime;
        const orderEnd = order.plannedEndDateTime;
        let orderDuration = "";
        if (orderStart && orderEnd) {
          const diffMs = new Date(orderEnd) - new Date(orderStart);
          const diffMin = Math.round(diffMs / 60000);
          orderDuration = formatDuration(diffMin, "MINUTES");
        }

        return (
          <article key={order.orderId} className="glass-card overflow-hidden border-slate-200">
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 w-5 shrink-0">#{queueIndex + 1}</span>
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {order.orderReference || order.orderId.slice(-6)}
                    </p>
                    <Badge
                      label={order.status === "IN_PRODUCTION" ? "In Production" : order.status === "PRODUCTION_COMPLETED" ? "Completed" : "Ready"}
                      color={order.status === "PRODUCTION_COMPLETED" ? "emerald" : order.status === "IN_PRODUCTION" ? "blue" : "amber"}
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <span>{order.organizationName || order.organizationId}</span>
                    {order.materialSource === 'CLIENT_SUPPLIED' && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-purple-600 dark:text-purple-400">Client Supplied Materials</span>
                      </>
                    )}
                    {order.totalQuantity > 0 && (
                      <>
                        <span>•</span>
                        <span>Qty: <strong className="text-slate-700 dark:text-slate-200">{order.totalQuantity}</strong></span>
                      </>
                    )}
                    {order.items && order.items.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex gap-1 flex-wrap">
                          {order.items.map((item, i) => (
                            <span key={i} className="text-xs">
                              {item.productName || item.productId}{item.quantity > 0 ? ` (×${item.quantity})` : ""}
                              {i < order.items.length - 1 ? "," : ""}
                            </span>
                          ))}
                        </span>
                      </>
                    )}
                  </div>

                  {order.stepsGenerated && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden max-w-[200px]">
                          <div className="h-full bg-brand-500 rounded-full transition-all duration-700" style={{ width: `${order.progressPercent}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          {order.completedSteps}/{order.totalSteps} ({order.progressPercent}%)
                        </span>
                        {order.currentOperation && (
                          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                            Current: {order.currentOperation}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-wrap">
                        {orderStart && orderEnd && (
                          <span className="font-semibold text-slate-500 dark:text-slate-400">
                            {formatDateTime(orderStart)} → {formatDateTime(orderEnd)}
                            {orderDuration && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-1">
                                ({orderDuration})
                              </span>
                            )}
                          </span>
                        )}
                        {order.estimatedStartTime && order.estimatedCompletionDateTime && !orderStart && (
                          <span>
                            {formatDateTime(order.estimatedStartTime)} → {formatDateTime(order.estimatedCompletionDateTime)} 
                            {order.estimatedCompletionTime && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-1">
                                ({order.estimatedCompletionTime})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!order.stepsGenerated ? (
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => handleGenerateSteps(order.orderId)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 disabled:opacity-50 transition-colors"
                    >
                      {isGenerating ? "Generating…" : "Generate Steps"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => toggleExpand(order.orderId)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-brand-600 transition-colors"
                  >
                    <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-slate-100 dark:border-white/[0.06]">
                {order.warning && !order.stepsGenerated && (
                  <div className="mx-4 my-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 p-3">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{order.warning}</p>
                  </div>
                )}

                {isLoadingSteps ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                    <span className="ml-2 text-xs text-slate-500">Loading steps…</span>
                  </div>
                ) : steps.length > 0 ? (
                  <div className="px-4 py-4 space-y-4">
                    {/* All Steps */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Operations ({steps.length})</span>
                        {orderStart && orderEnd && (
                          <span className="text-[10px] text-slate-400 ml-auto">
                            Queue slot: {formatDateTime(orderStart)} → {formatDateTime(orderEnd)}
                            {orderDuration && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-1">
                                ({orderDuration})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {steps.map(step => renderStep(step))}
                      </div>
                    </div>
                  </div>
                ) : order.stepsGenerated ? (
                  <p className="px-4 py-4 text-xs text-slate-400">No steps found for this order.</p>
                ) : null}
              </div>
            )}
          </article>
        );
      })}

      {/* All Completed Operations Across All Orders */}
      {allCompletedSteps.length > 0 && (
        <div className="glass-card overflow-hidden border-slate-200">
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-bold uppercase tracking-widest text-slate-400">Completed Operations</span>
              <span className="text-xs text-slate-400">({allCompletedSteps.length})</span>
            </div>
            <div className="space-y-0">
              {allCompletedSteps.map(step => {
                const order = orders.find(o => o.orderId === step.orderId);
                return (
                  <div key={step.id} className="mb-2 last:mb-0">
                    <div className="text-[10px] text-slate-400 mb-1">
                      {order?.orderReference || step.orderId?.slice(-6)}
                    </div>
                    {renderStep(step)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
        {progressModalStep && (
          <ReportProgressModal
            step={progressModalStep}
            onClose={() => setProgressModalStep(null)}
            onReported={() => {
              if (expandedOrderId) loadSteps(expandedOrderId);
              loadOrders();
            }}
          />
        )}
        {historyModalStep && (
          <ProgressHistoryModal
            step={historyModalStep}
            onClose={() => setHistoryModalStep(null)}
          />
        )}
    </div>
  );
}
