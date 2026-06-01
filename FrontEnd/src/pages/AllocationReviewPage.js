import { useState, useCallback } from "react";
import {
  ClipboardList, Clock, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, ChevronDown, ChevronUp, CalendarDays, FlaskConical,
  Zap, Play, Loader2, Sparkles, TrendingUp, Package,
  AlertCircle, Check, X, Info, Factory,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import {
  calculateRequirements, confirmDeliveryDate, startProductionForItem,
} from "../services/authService";
import { useNotifications } from "../context/NotificationContext";

// ─── Status maps ─────────────────────────────────────────────────────────────

const ORDER_STATUS_META = {
  PENDING_REVIEW:       { label: "Pending Review",       cls: "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400" },
  STOCK_RESERVED:       { label: "Stock Reserved",       cls: "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400" },
  PARTIALLY_ALLOCATED:  { label: "Partially Allocated",  cls: "text-purple-600 bg-purple-50 dark:bg-purple-500/10 dark:text-purple-400" },
  WAITING_FOR_MATERIALS:{ label: "Waiting Materials",    cls: "text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400" },
  READY_FOR_PRODUCTION: { label: "Ready for Production", cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400" },
  IN_PRODUCTION:        { label: "In Production",        cls: "text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10 dark:text-cyan-400" },
  PRODUCTION_COMPLETED: { label: "Production Completed", cls: "text-green-600 bg-green-50 dark:bg-green-500/10 dark:text-green-400" },
  READY_FOR_DELIVERY:   { label: "Ready for Delivery",   cls: "text-teal-600 bg-teal-50 dark:bg-teal-500/10 dark:text-teal-400" },
  PARTIALLY_DELIVERED:  { label: "Partially Delivered",  cls: "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400" },
  DELIVERED:            { label: "Delivered",            cls: "text-slate-600 bg-slate-50 dark:bg-slate-500/10 dark:text-slate-400" },
  CANCELLED:            { label: "Cancelled",            cls: "text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400" },
};

const ITEM_STATUS_META = {
  READY_FOR_PRODUCTION: {
    label: "Ready to Produce",
    badgeCls: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30",
    rowCls: "",
    icon: CheckCircle2,
  },
  PARTIALLY_PRODUCIBLE: {
    label: "Partially Producible",
    badgeCls: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30",
    rowCls: "",
    icon: AlertTriangle,
  },
  MATERIALS_MISSING: {
    label: "Materials Missing",
    badgeCls: "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30",
    rowCls: "",
    icon: XCircle,
  },
  NO_BOM: {
    label: "No BOM",
    badgeCls: "text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/30",
    rowCls: "",
    icon: AlertCircle,
  },
  IN_PRODUCTION: {
    label: "In Production",
    badgeCls: "text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30",
    rowCls: "",
    icon: Zap,
  },
  COVERED: {
    label: "Fully Covered",
    badgeCls: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30",
    rowCls: "",
    icon: CheckCircle2,
  },
};

const PRIORITY_CLS = {
  HIGH:   "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-300/60",
  MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-300/60",
  LOW:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-300/60",
  NORMAL: "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 border-slate-300/60",
};

// ─── Start Production Modal ───────────────────────────────────────────────────

function StartProductionModal({ item, orderId, onClose, onSuccess }) {
  const [qty, setQty] = useState(item.producibleQuantityNow || item.remainingToProduce || 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const max = item.producibleQuantityNow || item.remainingToProduce || 1;

  async function handleStart() {
    if (qty < 1 || qty > max) return;
    setLoading(true);
    setError(null);
    try {
      await startProductionForItem(orderId, item.orderItemId, qty);
      onSuccess();
    } catch (e) {
      setError(e.message || "Failed to start production");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/60 dark:bg-black/75 backdrop-blur-[2px] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-slate-900/10">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Play size={15} className="text-emerald-500" /> Start Production
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.productName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ordered: <strong className="text-slate-700 dark:text-slate-300">{item.orderedQuantity}</strong>
              {" · "}Remaining: <strong className="text-slate-700 dark:text-slate-300">{item.remainingToProduce}</strong>
              {" · "}Max producible: <strong className="text-emerald-600 dark:text-emerald-400">{item.producibleQuantityNow}</strong>
            </p>
            {item.producibleQuantityNow < item.remainingToProduce && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Only {item.producibleQuantityNow} producible now due to material limits.
              </p>
            )}
          </div>

          {/* Material check */}
          {item.materials && item.materials.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Material Check</p>
              {item.materials.map((mat, i) => (
                <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs border ${
                  mat.enough
                    ? "border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5"
                    : "border-rose-200/60 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5"
                }`}>
                  <span className={`font-medium ${mat.enough ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                    {mat.materialName}
                  </span>
                  <span className={mat.enough ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                    {mat.availableInStock} / {mat.neededForFullOrder} {mat.unit}
                  </span>
                </div>
              ))}
            </div>
          )}

          {item.simulationMessage && (
            <p className="text-xs text-slate-400 italic">{item.simulationMessage}</p>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Quantity to produce
            </label>
            <input
              type="number" min={1} max={max} value={qty}
              onChange={e => setQty(Math.max(1, Math.min(max, parseInt(e.target.value) || 1)))}
              className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 px-3 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-brand-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">Max: {max} units</p>
          </div>

          {error && (
            <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]">
            Cancel
          </button>
          <button onClick={handleStart} disabled={loading || qty < 1}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {loading ? "Starting…" : "Start Production"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Delivery Date Modal ──────────────────────────────────────────────

function ConfirmDateModal({ orderId, orderCode, current, onClose, onSuccess }) {
  const [date, setDate] = useState(current || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleConfirm() {
    if (!date) return;
    setLoading(true);
    setError(null);
    try {
      await confirmDeliveryDate(orderId, date);
      onSuccess(date);
    } catch (e) {
      setError(e.message || "Failed to confirm date");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/60 dark:bg-black/75 backdrop-blur-[2px] px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-slate-900/10">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarDays size={15} className="text-brand-500" /> Confirm Delivery Date
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Order <span className="font-semibold text-slate-700 dark:text-slate-300">{orderCode}</span>
          </p>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
          {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={loading || !date}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 transition-colors">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI Recommendation Card ───────────────────────────────────────────────────

function AiCard({ rec }) {
  if (!rec) return null;
  const priorityCls = PRIORITY_CLS[(rec.priority || "").toUpperCase()] || PRIORITY_CLS.NORMAL;
  return (
    <div className="rounded-2xl border border-violet-200/60 dark:border-violet-500/20 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-500/8 dark:to-purple-500/4 p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
            <Sparkles size={15} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">AI Recommendation</p>
            <p className="text-xs text-slate-400">Groq Production Intelligence</p>
          </div>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border ${priorityCls}`}>
          {rec.priority || "—"} Priority
        </span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={13} className="text-violet-500 shrink-0" />
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Recommended:{" "}
            <span className="font-bold text-violet-700 dark:text-violet-400">
              {rec.recommendedOrderCode || rec.recommendedOrderId}
            </span>
          </p>
        </div>
        <div className="rounded-xl bg-white/60 dark:bg-white/[0.04] px-4 py-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Recommendation</p>
          <p className="text-sm text-slate-800 dark:text-slate-200">{rec.recommendation}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rec.reason && (
            <div className="rounded-xl bg-white/60 dark:bg-white/[0.04] px-4 py-3">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Reason</p>
              <p className="text-xs text-slate-700 dark:text-slate-300">{rec.reason}</p>
            </div>
          )}
          {rec.risk && (
            <div className="rounded-xl bg-amber-50/80 dark:bg-amber-500/10 px-4 py-3">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                <AlertTriangle size={10} /> Risk
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">{rec.risk}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Global Material Summary ──────────────────────────────────────────────────

function GlobalMaterialSummary({ summary }) {
  const [expanded, setExpanded] = useState(false);
  if (!summary?.materials?.length) return null;
  const hasShortage = summary.materials.some(m => m.missing > 0);
  return (
    <div className={`rounded-2xl border p-5 ${hasShortage
      ? "border-amber-200/60 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5"
      : "border-slate-200 dark:border-white/[0.07] bg-white dark:bg-slate-800/60"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical size={14} className={hasShortage ? "text-amber-500" : "text-slate-400"} />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Global Material Summary</span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700/40 px-2 py-0.5 rounded-full">
            <Info size={9} /> Informational only
          </span>
        </div>
        <button onClick={() => setExpanded(v => !v)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {!expanded && hasShortage && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          {summary.materials.filter(m => m.missing > 0).length} material(s) in combined shortage
        </p>
      )}
      {expanded && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left border-b border-slate-200 dark:border-white/[0.06]">
                <th className="pb-2 pr-4 font-medium text-slate-400">Material</th>
                <th className="pb-2 pr-4 font-medium text-slate-400 text-right">Available</th>
                <th className="pb-2 pr-4 font-medium text-slate-400 text-right">Total Required</th>
                <th className="pb-2 font-medium text-slate-400 text-right">Shortage</th>
              </tr>
            </thead>
            <tbody>
              {summary.materials.map((m, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-white/[0.04] last:border-0">
                  <td className="py-2 pr-4 font-medium text-slate-700 dark:text-slate-300">{m.materialName}</td>
                  <td className="py-2 pr-4 text-right text-slate-500">{m.available} {m.unit}</td>
                  <td className="py-2 pr-4 text-right text-slate-500">{m.totalRequired} {m.unit}</td>
                  <td className="py-2 text-right">
                    {m.missing > 0
                      ? <span className="font-semibold text-rose-600 dark:text-rose-400">−{m.missing} {m.unit}</span>
                      : <span className="text-emerald-600 dark:text-emerald-400">OK</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Item Row inside order card ───────────────────────────────────────────────

function ItemRow({ item, orderId, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const meta = ITEM_STATUS_META[item.productionStatus] || ITEM_STATUS_META.NO_BOM;
  const Icon = meta.icon;
  const hasMaterials = item.materials && item.materials.length > 0;

  return (
    <>
      {showModal && (
        <StartProductionModal
          item={item}
          orderId={orderId}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); onRefresh(); }}
        />
      )}

      <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-slate-800/50 overflow-hidden">
        {/* Item header row */}
        <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
          <Package size={13} className="text-slate-400 shrink-0" />

          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex-1 min-w-0 truncate">
            {item.productName}
          </span>

          {/* Status badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${meta.badgeCls}`}>
            <Icon size={10} />
            {meta.label}
            {(item.productionStatus === "READY_FOR_PRODUCTION" || item.productionStatus === "PARTIALLY_PRODUCIBLE") &&
              item.producibleQuantityNow > 0 && (
                <span className="ml-0.5 opacity-70">
                  ({item.producibleQuantityNow}/{item.remainingToProduce})
                </span>
              )}
          </span>

          {/* Quantities */}
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <span>Ordered: <strong className="text-slate-700 dark:text-slate-300">{item.orderedQuantity}</strong></span>
            {item.finishedStockAvailable > 0 && (
              <span>Stock: <strong className="text-emerald-600 dark:text-emerald-400">{item.finishedStockAvailable}</strong></span>
            )}
            {item.remainingToProduce > 0 && (
              <span>To produce: <strong className="text-amber-600 dark:text-amber-400">{item.remainingToProduce}</strong></span>
            )}
          </div>

          {/* Action button */}
          <div className="flex items-center gap-2 shrink-0">
            {item.canStartProduction && item.productionStatus === "READY_FOR_PRODUCTION" && (
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
                <Play size={11} /> Start Production
              </button>
            )}
            {item.canStartProduction && item.productionStatus === "PARTIALLY_PRODUCIBLE" && (
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors">
                <Play size={11} /> Start Partial
              </button>
            )}
            {!item.canStartProduction && item.productionStatus === "MATERIALS_MISSING" && (
              <span className="text-xs text-rose-500 dark:text-rose-400 font-medium">Order Materials</span>
            )}
            {hasMaterials && item.remainingToProduce > 0 && (
              <button onClick={() => setExpanded(v => !v)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400">
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>
        </div>

        {/* Simulation message */}
        {item.blockedByPreviousOrders && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 flex items-start gap-2">
            <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              Blocked by previous simulated orders. Change priority or produce another order first.
            </p>
          </div>
        )}
        {item.simulationMessage && item.remainingToProduce > 0 && (
          <p className="px-4 pb-2 text-[11px] text-slate-400 dark:text-slate-500 italic">{item.simulationMessage}</p>
        )}

        {/* Material detail table */}
        {expanded && hasMaterials && (
          <div className="border-t border-slate-100 dark:border-white/[0.05] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Sequential simulation — shared pool after previous orders
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left pb-1.5 pr-3 font-medium text-slate-400">Material</th>
                  <th className="text-right pb-1.5 pr-3 font-medium text-slate-400">Per unit</th>
                  <th className="text-right pb-1.5 pr-3 font-medium text-slate-400">Available</th>
                  <th className="text-right pb-1.5 pr-3 font-medium text-slate-400">Need (full)</th>
                  <th className="text-right pb-1.5 pr-3 font-medium text-slate-400">Will consume</th>
                  <th className="text-right pb-1.5 font-medium text-slate-400">Still missing</th>
                </tr>
              </thead>
              <tbody>
                {item.materials.map((mat, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-white/[0.04]">
                    <td className="py-1.5 pr-3 font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      {mat.limitingMaterial && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                      )}
                      {mat.materialName}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-slate-500">{mat.materialPerProduct} {mat.unit}</td>
                    <td className="py-1.5 pr-3 text-right text-slate-500">{mat.availableInStock} {mat.unit}</td>
                    <td className={`py-1.5 pr-3 text-right ${mat.enoughForFullOrder ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
                      {mat.neededForFullOrder} {mat.unit}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-slate-600 dark:text-slate-300 font-medium">
                      {mat.willConsumeIfChosen} {mat.unit}
                    </td>
                    <td className="py-1.5 text-right">
                      {mat.missingAfterThisProduction > 0
                        ? <span className="font-semibold text-rose-600 dark:text-rose-400">−{mat.missingAfterThisProduction} {mat.unit}</span>
                        : <span className="text-emerald-600 dark:text-emerald-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, onRefresh }) {
  const [expanded, setExpanded] = useState(true);
  const [showDateModal, setShowDateModal] = useState(false);
  const [confirmedDate, setConfirmedDate] = useState(order.confirmedDeliveryDate || null);
  const [dateConfirmed, setDateConfirmed] = useState(order.deliveryDateConfirmed || !!order.confirmedDeliveryDate);

  const statusMeta = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.PENDING_REVIEW;
  const items = order.items || [];

  // Per-order readiness summary
  const readyItems    = items.filter(i => i.productionStatus === "READY_FOR_PRODUCTION");
  const partialItems  = items.filter(i => i.productionStatus === "PARTIALLY_PRODUCIBLE");
  const missingItems  = items.filter(i => i.productionStatus === "MATERIALS_MISSING");
  const producibleItems = items.filter(i => i.canStartProduction);
  const fullyReady = items.length > 0 && items.every(i =>
    i.productionStatus === "READY_FOR_PRODUCTION" || i.productionStatus === "COVERED" || i.productionStatus === "IN_PRODUCTION"
  );

  return (
    <>
      {showDateModal && (
        <ConfirmDateModal
          orderId={order.orderId}
          orderCode={order.orderCode}
          current={confirmedDate}
          onClose={() => setShowDateModal(false)}
          onSuccess={d => { setConfirmedDate(d); setDateConfirmed(true); setShowDateModal(false); }}
        />
      )}

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${
        fullyReady
          ? "border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-slate-800/80"
          : "border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-800/80"
      }`}>
        {/* Card header */}
        <div className={`flex items-center justify-between px-5 py-4 flex-wrap gap-3 ${
          fullyReady ? "bg-emerald-50/60 dark:bg-emerald-500/5" : "bg-slate-50/60 dark:bg-slate-700/20"
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              fullyReady ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-brand-50 dark:bg-brand-500/10"
            }`}>
              {fullyReady
                ? <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                : <ClipboardList size={16} className="text-brand-600 dark:text-brand-400" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                  {order.orderCode}
                </span>
                {fullyReady && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                    ✓ Ready to Produce
                  </span>
                )}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusMeta.cls}`}>
                  {statusMeta.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{order.clientEmail}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap shrink-0">
            {/* Dates */}
            {order.requestedDeliveryDate && (
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Clock size={11} />
                <span>Requested: <span className="font-medium text-slate-700 dark:text-slate-300">{order.requestedDeliveryDate}</span></span>
              </div>
            )}
            {dateConfirmed && confirmedDate ? (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200/60">
                <Check size={10} /> Confirmed: {confirmedDate}
              </span>
            ) : (
              <button onClick={() => setShowDateModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 border border-brand-200/60 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors">
                <CalendarDays size={10} /> Confirm Date
              </button>
            )}

            {/* Summary chips */}
            {readyItems.length > 0 && (
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <CheckCircle2 size={10} /> {readyItems.length} ready
              </span>
            )}
            {partialItems.length > 0 && (
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                <AlertTriangle size={10} /> {partialItems.length} partial
              </span>
            )}
            {missingItems.length > 0 && (
              <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                <XCircle size={10} /> {missingItems.length} missing
              </span>
            )}

            <button onClick={() => setExpanded(v => !v)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400">
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>

        {/* Expanded items */}
        {expanded && items.length > 0 && (
          <div className="px-5 py-4 space-y-3">
            {items.map(item => (
              <ItemRow
                key={item.orderItemId}
                item={item}
                orderId={order.orderId}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        )}

        {expanded && items.length === 0 && (
          <p className="px-5 py-4 text-sm text-slate-400 italic">No items in this order.</p>
        )}
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AllocationReviewPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const { addToast } = useNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await calculateRequirements();
      setData(result);
    } catch (e) {
      setError(e.message || "Failed to calculate requirements");
      addToast({ title: "Error", message: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const orders = data?.orders || [];

  // Stats derived from items
  const allItems = orders.flatMap(o => o.items || []);
  const readyCount     = allItems.filter(i => i.productionStatus === "READY_FOR_PRODUCTION").length;
  const partialCount   = allItems.filter(i => i.productionStatus === "PARTIALLY_PRODUCIBLE").length;
  const missingCount   = allItems.filter(i => i.productionStatus === "MATERIALS_MISSING").length;
  const fullyReadyOrders = orders.filter(o => {
    const items = o.items || [];
    return items.length > 0 && items.every(i =>
      i.productionStatus === "READY_FOR_PRODUCTION" || i.productionStatus === "COVERED" || i.productionStatus === "IN_PRODUCTION"
    );
  });

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 pb-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <Factory size={22} className="text-brand-500" /> Production Planning
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Orders are simulated sequentially using shared stock. Earlier orders use the simulated pool first.
            </p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 h-10 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors shadow-sm">
            {loading
              ? <Loader2 size={15} className="animate-spin" />
              : <RefreshCw size={15} />}
            {data ? "Recalculate" : "Calculate Requirements"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-500/20 text-sm text-rose-700 dark:text-rose-400">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {/* Empty / loading state */}
        {!loading && !data && !error && (
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-slate-800/60 py-16 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700/40 flex items-center justify-center">
              <Factory size={24} className="text-slate-400" />
            </div>
            <p className="text-base font-semibold text-slate-600 dark:text-slate-400">
              No data yet
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 max-w-sm">
              Click "Calculate Requirements" to load all active orders and run sequential production simulations.
            </p>
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-slate-800/60 h-20 animate-pulse" />
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && data && (
          <div className="space-y-6">
            {/* KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-slate-800/60 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Orders</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{orders.length}</p>
              </div>
              <div className={`rounded-xl border px-4 py-3 ${fullyReadyOrders.length > 0
                ? "border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5"
                : "border-slate-200 dark:border-white/[0.07] bg-white dark:bg-slate-800/60"}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Fully Ready</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{fullyReadyOrders.length}</p>
              </div>
              <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Items Ready</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{readyCount}</p>
              </div>
              <div className="rounded-xl border border-amber-200/60 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">Partial</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{partialCount}</p>
              </div>
              <div className="rounded-xl border border-rose-200/60 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-1">Missing Mat.</p>
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">{missingCount}</p>
              </div>
            </div>

            {/* AI Recommendation */}
            {data.aiRecommendation && <AiCard rec={data.aiRecommendation} />}

            {/* Order cards — fully ready orders first */}
            {orders.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-slate-800/60 py-12 flex flex-col items-center gap-2">
                <CheckCircle2 size={22} className="text-emerald-500" />
                <p className="text-sm font-medium text-slate-500">No active orders requiring production.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...orders]
                  .sort((a, b) => {
                    const aReady = (a.items || []).every(i =>
                      i.productionStatus === "READY_FOR_PRODUCTION" || i.productionStatus === "COVERED" || i.productionStatus === "IN_PRODUCTION"
                    );
                    const bReady = (b.items || []).every(i =>
                      i.productionStatus === "READY_FOR_PRODUCTION" || i.productionStatus === "COVERED" || i.productionStatus === "IN_PRODUCTION"
                    );
                    return bReady - aReady;
                  })
                  .map(order => (
                    <OrderCard key={order.orderId} order={order} onRefresh={load} />
                  ))}
              </div>
            )}

            {/* Global material summary */}
            <GlobalMaterialSummary summary={data.globalSummary} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
