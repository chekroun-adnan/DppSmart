import { useEffect, useState } from "react";
import {
  Calendar, CheckCircle2,
  AlertTriangle, XCircle, Download, Printer,
  Truck, Brain, ListChecks, Play,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import OrgSelector from "../components/OrgSelector";
import {
  deleteOrder,
  getAvailableProducts,
  getMainOrganizations,
  getSubOrganizations,
  getOrders,
  calculateBulkRequirements,
  recalculateBulkRequirements,
  confirmOrderDelivery,
  startProductionV2,
  adminProposeDate,
  cancelOrder,
} from "../services/authService";
import AuditHistoryModal from "../components/AuditHistoryModal";

const loadOrgs = () =>
  Promise.all([getMainOrganizations(), getSubOrganizations()]).then(([m, s]) => [...m, ...s]);

const STATUS_STYLE = {
  PENDING_REVIEW:               { cls: "status-amber",    label: "Pending Review" },
  READY_FOR_CONFIRMATION:       { cls: "status-amber",    label: "Ready for Confirmation" },
  BLOCKED_INSUFFICIENT_STOCK:   { cls: "status-red",      label: "Blocked — Insufficient Stock" },
  BLOCKED_INSUFFICIENT_MATERIALS:{ cls: "status-red",     label: "Blocked — Missing Materials" },
  BLOCKED_NO_BOM:               { cls: "status-red",      label: "Blocked — No BOM" },
  DATE_CHANGE_REQUESTED:        { cls: "status-sky",      label: "Date Change" },
  CONFIRMED:                    { cls: "status-emerald",  label: "Confirmed" },
  WAITING_FOR_MATERIALS:        { cls: "status-orange",   label: "Waiting for Materials" },
  IN_PRODUCTION:                { cls: "status-blue",     label: "In Production" },
  PRODUCTION_COMPLETED:         { cls: "status-teal",     label: "Production Done" },
  READY:                        { cls: "status-emerald",  label: "Ready for Delivery" },
  READY_FOR_DELIVERY:           { cls: "status-emerald",  label: "Ready for Delivery" },
  DELIVERED:                    { cls: "status-slate",    label: "Delivered" },
  REJECTED:                     { cls: "status-red",      label: "Rejected" },
  CANCELLED:                    { cls: "status-slate",    label: "Cancelled" },
};





function BulkRequirementsDrawer({ orderIds, orders, products, orgs, onClose, onOrderUpdated }) {
  // ── data ────────────────────────────────────────────────────────────────────
  const [data, setData] = useState(null);          // BulkOrderRequirementResponseDTO
  const [loading, setLoading] = useState(true);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);        // { msg, type: "ok"|"err" }
  const [acting, setActing] = useState(null);      // orderId being acted on

  // order detail panel state
  const [viewOrder, setViewOrder] = useState(null);
  const [showPropose, setShowPropose] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [proposeDate, setProposeDate] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");


  // allocations[orderId][productId] = number (qty from stock)
  const [allocations, setAllocations] = useState({});

  // which order ids have been completed (delivered or in production)
  const [completed, setCompleted] = useState({});  // { orderId: "delivered"|"production" }

  // ── initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    setLoading(true); setError("");
    calculateBulkRequirements(orderIds)
      .then(res => {
        if (!mounted) return;
        const d = res?.data ?? res;
        setData(d);
        const seed = {};
        (d.productSummaries || []).forEach(ps => {
          (ps.affectedOrders || []).forEach(ao => {
            if (!seed[ao.orderId]) seed[ao.orderId] = {};
            seed[ao.orderId][ps.productId] = ao.allocatedFromStock;
          });
        });
        setAllocations(seed);
      })
      .catch(e => { if (mounted) setError(e.message || "Failed to load."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [orderIds]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ── helpers ───────────────────────────────────────────────────────────────────
  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  async function handleRecalculate() {
    setRecalcLoading(true); setError("");
    try {
      const productOrderMap = {};
      Object.entries(allocations).forEach(([orderId, byProduct]) => {
        Object.entries(byProduct).forEach(([productId, allocatedFromStock]) => {
          if (!productOrderMap[productId]) productOrderMap[productId] = {};
          productOrderMap[productId][orderId] = allocatedFromStock;
        });
      });
      const priorityAllocations = Object.entries(productOrderMap).map(([productId, byOrder]) => ({
        productId,
        allocations: Object.entries(byOrder).map(([orderId, allocatedFromStock]) => ({
          orderId, allocatedFromStock,
        })),
      }));
      const res = await recalculateBulkRequirements({ orderIds, priorityAllocations });
      setData(res?.data ?? res);
    } catch (e) {
      setError(e.message || "Recalculation failed.");
    } finally {
      setRecalcLoading(false);
    }
  }

  async function handleOrderAction(orderId, actionFn, successLabel) {
    setActing(orderId); setError("");
    try {
      const res = await actionFn(orderId);
      const updated = res?.data ?? res;
      onOrderUpdated(updated);
      setCompleted(prev => ({ ...prev, [orderId]: successLabel }));
      showToast(
        successLabel === "delivered"
          ? `Order sent to delivery.`
          : `Production started for this order.`,
        "ok"
      );
    } catch (e) {
      showToast(e.message || "Action failed.", "err");
    } finally {
      setActing(null);
    }
  }

  // ── order detail actions (propose date / cancel) ──────────────────────────
  async function handlePropose() {
    if (!proposeDate) { setActionError("Please select a new date."); return; }
    setSaving(true); setActionError("");
    try {
      const res = await adminProposeDate({ orderId: viewOrder.id, proposedDeliveryDate: proposeDate, adminMessage: "" });
      const updated = res?.data ?? res;
      onOrderUpdated(updated);
      setViewOrder(prev => ({ ...prev, ...updated }));
      setShowPropose(false);
      showToast("Date proposed.", "ok");
    } catch (e) {
      setActionError(e.message || "Failed to propose date.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelOrder() {
    if (!cancelReason.trim()) { setActionError("Please provide a reason."); return; }
    setSaving(true); setActionError("");
    try {
      const res = await cancelOrder(viewOrder.id, cancelReason);
      const updated = res?.data ?? res;
      onOrderUpdated(updated);
      setViewOrder(null);
      setShowCancel(false);
      showToast("Order cancelled.", "ok");
    } catch (e) {
      setActionError(e.message || "Failed to cancel.");
    } finally {
      setSaving(false);
    }
  }

  function closeDetail() {
    setViewOrder(null);
    setShowPropose(false);
    setShowCancel(false);
    setActionError("");
  }

  const fmt = d => d ? new Date(d).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "—";

  // ── derived data per order ────────────────────────────────────────────────────
  // Build a map: orderId → { products: [{...}], materials: [], fullyFromStock, needsProduction, matsOk }
  const orderSummaries = orders
    .filter(o => orderIds.includes(o.id))
    .map(order => {
      if (!data) return { order, products: [], materials: [], fullyFromStock: false, needsProduction: false, matsOk: false };

      const products = (data.productSummaries || [])
        .map(ps => {
          const ao = (ps.affectedOrders || []).find(a => a.orderId === order.id);
          if (!ao) return null;
          const curAlloc = allocations[order.id]?.[ps.productId] ?? ao.allocatedFromStock;
          const toProduce = Math.max(0, ao.orderedQuantity - Math.min(curAlloc, ao.orderedQuantity));
          return {
            productId: ps.productId,
            productName: ps.productName,
            ordered: ao.orderedQuantity,
            availableStock: ps.availableProductStock,
            fromStock: Math.min(curAlloc, ao.orderedQuantity),
            toProduce,
            remainingToProduce: ao.quantityToProduce || ao.orderedQuantity,
            status: ao.status,
            errorMessage: ps.errorMessage,
            materialRequirements: ao.materialRequirements || [],
            productionStatus: ao.productionStatus,
            producibleQuantityNow: ao.producibleQuantityNow || 0,
            canStartProduction: ao.canStartProduction || false,
          };
        })
        .filter(Boolean);

      const fullyFromStock = products.length > 0 && products.every(p => p.toProduce === 0);
      const needsProduction = products.some(p => p.toProduce > 0);

      // Per-order material sufficiency: only when FULL remaining quantity is producible
      const matsOk = products.every(p =>
        p.toProduce === 0 || (p.producibleQuantityNow >= p.toProduce)
      );

      const anyError = products.some(p => p.errorMessage);

      // All materials from all products needing production (for info display)
      const materials = needsProduction
        ? products.flatMap(p => p.materialRequirements || [])
        : [];

      return { order, products, materials, fullyFromStock, needsProduction, matsOk, anyError };
    });

  const Spinner = ({ cls = "text-violet-500" }) => (
    <svg className={`w-4 h-4 animate-spin shrink-0 ${cls}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  );

  const anyDirty = data && JSON.stringify(
    Object.entries(allocations).flatMap(([oid, byProduct]) =>
      Object.entries(byProduct).map(([pid, v]) => ({ pid, oid, v }))
    )
  ) !== JSON.stringify(
    (data.productSummaries || []).flatMap(ps =>
      (ps.affectedOrders || []).map(ao => ({ pid: ps.productId, oid: ao.orderId, v: ao.allocatedFromStock }))
    )
  );

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex" onClick={onClose}>
      <div className="flex-1 bg-slate-900/50 dark:bg-black/60 backdrop-blur-[2px]" />
      <div
        className="w-full max-w-5xl bg-white dark:bg-[#1E293B] shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center shrink-0">
              <ListChecks size={16} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Production Planning</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {orderIds.length} order{orderIds.length !== 1 ? "s" : ""} selected
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <button
                onClick={handleRecalculate}
                disabled={recalcLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  anyDirty
                    ? "bg-violet-600 hover:bg-violet-700 text-white"
                    : "border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                }`}
              >
                {recalcLoading ? <Spinner cls="text-white" /> : <Brain size={14} />}
                Recalculate
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-600 transition-all">
              <XCircle size={18} />
            </button>
          </div>
        </div>

        {/* ── toast ── */}
        {toast && (
          <div className={`mx-6 mt-3 shrink-0 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm font-semibold ${
            toast.type === "ok"
              ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300"
          }`}>
            {toast.type === "ok" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            {toast.msg}
          </div>
        )}

        {/* ── body ── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Spinner cls="text-violet-500 w-6 h-6" />
              <p className="text-sm text-slate-400">Calculating stock & requirements…</p>
            </div>
          )}

          {!loading && error && (
            <div className="m-6 rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/5 px-5 py-4 flex items-start gap-3">
              <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
            </div>
          )}

          {!loading && data && (
            <div className="flex flex-1 overflow-hidden">
              {/* ── LEFT: order stock allocation ── */}
              <div className="w-[46%] border-r border-slate-100 dark:border-white/[0.06] overflow-y-auto p-5 space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Order production possibilities</p>
                <p className="text-[9px] text-slate-400 leading-relaxed">Each order is simulated independently using the current available stock. Stock is only consumed after admin clicks Start Production.</p>

                {orderSummaries.map(({ order, products }) => {
                  const statusMeta = STATUS_STYLE[order.status] || { cls: "status-slate", label: order.status };
                  const isDone = !!completed[order.id];

                  return (
                    <div key={order.id} className={`rounded-2xl border overflow-hidden ${
                      isDone
                        ? "border-emerald-200 dark:border-emerald-500/30"
                        : "border-slate-200 dark:border-white/[0.08]"
                    }`}>
                      {/* order header */}
                      <div className="px-4 py-3 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{order.orderReference}</p>
                          <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${statusMeta.cls}`}>
                            {statusMeta.label}
                          </span>
                        </div>
                        <div className="shrink-0 text-right text-[10px] text-slate-400">
                          {order.requestedDeliveryDate && (
                            <span className="flex items-center gap-1">
                              <Calendar size={10} />
                              {new Date(order.requestedDeliveryDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* product rows */}
                      <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                        {products.map((p, idx) => {
                          const prodPct = p.remainingToProduce > 0
                            ? Math.round((p.producibleQuantityNow / p.remainingToProduce) * 100)
                            : 100;
                          const prodCanProduce = p.producibleQuantityNow;
                          const prodFullReady = prodCanProduce >= p.remainingToProduce;
                          const prodPartial = prodCanProduce > 0 && !prodFullReady;

                          return (
                            <div key={p.productId} className="px-4 py-3">
                              {/* product name + stock info */}
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{p.productName}</p>
                                  {prodCanProduce > 0 ? (
                                    <p className="text-[10px] text-slate-400">
                                      Can produce <strong>{prodCanProduce}</strong> / <strong>{p.remainingToProduce}</strong> now
                                      {p.ordered !== p.remainingToProduce && (
                                        <span className="text-slate-400"> ({p.ordered} ordered, {p.fromStock} from stock)</span>
                                      )}
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-slate-400">
                                      Cannot produce <strong>{p.remainingToProduce}</strong> needed
                                    </p>
                                  )}
                                </div>
                                <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[8px] font-bold uppercase shadow-sm ${
                                  prodFullReady
                                    ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-emerald-500/30"
                                    : prodPartial
                                      ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-amber-500/25"
                                      : "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-rose-500/25"
                                }`}>
                                  {prodFullReady ? <><CheckCircle2 size={9} /> Ready</> : prodPartial ? <><AlertTriangle size={9} /> Partial</> : <><XCircle size={9} /> Short</>}
                                </span>
                              </div>

                              {/* progress bar */}
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className="flex-1">
                                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden shadow-inner">
                                    <div className={`h-full rounded-full transition-all duration-700 ease-out ${
                                      prodFullReady
                                        ? "bg-gradient-to-r from-emerald-500 to-green-400 shadow-sm shadow-emerald-500/30"
                                        : prodPartial
                                          ? "bg-gradient-to-r from-amber-400 to-orange-500 shadow-sm shadow-amber-500/30"
                                          : "bg-gradient-to-r from-rose-400 to-red-500 shadow-sm shadow-rose-500/30"
                                    }`} style={{ width: `${Math.min(100, prodPct)}%` }} />
                                  </div>
                                  <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                                    <span className={prodFullReady ? "text-emerald-600 dark:text-emerald-400 font-bold" : prodPartial ? "text-amber-600 dark:text-amber-400 font-bold" : "text-rose-500 dark:text-rose-400 font-bold"}>
                                      {prodFullReady
                                        ? "Ready: can produce full order"
                                        : prodPartial
                                          ? `Partial: can produce ${prodCanProduce} / ${p.remainingToProduce} now`
                                          : "Cannot produce now"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* material consumption table */}
                              {p.materialRequirements.length > 0 && (
                                <div className="mt-2 rounded-xl border border-slate-100 dark:border-white/[0.06] overflow-hidden">
                                  <table className="w-full text-[9px]">
                                    <thead>
                                      <tr className="bg-slate-50 dark:bg-slate-900/50 text-[8px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-white/[0.06]">
                                        <th className="px-2 py-1.5 text-left">Material</th>
                                        <th className="px-2 py-1.5 text-right">Available before</th>
                                        <th className="px-2 py-1.5 text-right">Will consume</th>
                                        <th className="px-2 py-1.5 text-right">Available after</th>
                                        <th className="px-2 py-1.5 text-right">Missing</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                                      {p.materialRequirements.map((mat, i) => {
                                        const availBefore = mat.availableBefore ?? mat.availableStock;
                                        const willConsume = mat.willConsumeIfChosen ?? 0;
                                        const availAfter = mat.availableAfterSimulation ?? 0;
                                        const missing = mat.missingQuantity ?? 0;

                                        return (
                                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                                            <td className="px-2 py-1.5">
                                              <p className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[90px]">{mat.materialName}</p>
                                              <p className="text-[7px] text-slate-400 font-mono">{mat.unit}</p>
                                            </td>
                                            <td className="px-2 py-1.5 text-right text-slate-600 dark:text-slate-300">{availBefore}</td>
                                            <td className="px-2 py-1.5 text-right font-semibold text-slate-700 dark:text-slate-200">{willConsume}</td>
                                            <td className="px-2 py-1.5 text-right text-emerald-600 dark:text-emerald-400">{availAfter}</td>
                                            <td className="px-2 py-1.5 text-right font-bold text-rose-500">
                                              {missing > 0 ? missing : <span className="text-emerald-500 font-semibold">—</span>}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* aggregated materials */}
                {(data.aggregatedMaterials || []).length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Raw Materials Needed for Production</p>
                    <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/50 text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-white/[0.06]">
                            <th className="px-3 py-2 text-left">Material</th>
                            <th className="px-3 py-2 text-right">Required</th>
                            <th className="px-3 py-2 text-right">In Stock</th>
                            <th className="px-3 py-2 text-right">Missing</th>
                            <th className="px-3 py-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                          {data.aggregatedMaterials.map((mat, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                              <td className="px-3 py-2">
                                <p className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[120px]">{mat.materialName}</p>
                                <p className="text-[9px] text-slate-400 font-mono">{mat.unit}</p>
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200">{mat.totalRequiredQuantity}</td>
                              <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400">{mat.availableStock}</td>
                              <td className="px-3 py-2 text-right font-bold text-rose-500">
                                {mat.missingQuantity > 0 ? mat.missingQuantity : <span className="text-emerald-500 font-semibold">—</span>}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                                  mat.status === "AVAILABLE"
                                    ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                    : "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300"
                                }`}>{mat.status === "AVAILABLE" ? "OK" : "SHORT"}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {data.allStockSufficient && (data.aggregatedMaterials || []).length === 0 && (
                  <div className="rounded-2xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 px-4 py-4 text-center">
                    <CheckCircle2 size={20} className="text-emerald-500 mx-auto mb-1.5" />
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">All products covered by finished stock.</p>
                    <p className="text-xs text-emerald-500 mt-0.5">No production needed.</p>
                  </div>
                )}
              </div>

              {/* ── RIGHT: order list ── */}
              <div className={`flex-1 flex flex-col ${!viewOrder ? "overflow-hidden" : "overflow-y-auto p-5"}`}>
                {!viewOrder ? (
                  <>
                    <div className="px-5 py-3 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Select Order to Start Production</p>
                      <p className="text-[9px] text-slate-400 leading-relaxed mt-0.5">Admin chooses which order to produce first.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {orderSummaries.map(({ order, products, materials, fullyFromStock, needsProduction, matsOk }) => {
                        const statusMeta = STATUS_STYLE[order.status] || { cls: "status-slate", label: order.status };
                        const isDone = !!completed[order.id];
                        const canStart = needsProduction && matsOk;
                        const a = acting === order.id;

                        return (
                          <div key={order.id}
                            className={`rounded-xl border transition-all ${
                              isDone
                                ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-500/5"
                                : "border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.12]"
                            }`}
                          >
                            <div className="px-3 py-2.5 cursor-pointer" onClick={() => setViewOrder(order)}>
                              <div className="flex items-center gap-2.5">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{order.orderReference}</p>
                                  <p className="text-[10px] text-slate-400 truncate">{order.createdBy?.split("@")[0] || "—"}</p>
                                </div>
                                <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-[8px] font-bold uppercase ${statusMeta.cls}`}>
                                  {statusMeta.label}
                                </span>
                                {isDone ? (
                                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm shadow-emerald-500/30">
                                    <CheckCircle2 size={8} /> Done
                                  </span>
                                ) : canStart ? (
                                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase bg-gradient-to-r from-brand-500 to-blue-600 text-white shadow-sm shadow-blue-500/25">
                                    <Play size={8} /> Ready
                                  </span>
                                ) : needsProduction ? (
                                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/25">
                                    <AlertTriangle size={8} /> Partial
                                  </span>
                                ) : fullyFromStock ? (
                                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase bg-gradient-to-r from-emerald-500 to-green-400 text-white shadow-sm shadow-emerald-500/30">
                                    <CheckCircle2 size={8} /> In Stock
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            {/* action buttons */}
                            {!isDone && (
                              <div className="px-3 pb-2.5 flex gap-1.5">
                                {fullyFromStock && (
                                  <button disabled={a} onClick={e => { e.stopPropagation(); handleOrderAction(order.id, confirmOrderDelivery, "delivered"); }}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-[9px] font-bold transition-all shadow-sm shadow-emerald-500/25">
                                    {a ? <Spinner cls="text-white" /> : <CheckCircle2 size={10} />}
                                    {a ? "Processing…" : "Send to Delivery"}
                                  </button>
                                )}
                                {needsProduction && canStart && (
                                  <button disabled={a} onClick={e => { e.stopPropagation(); handleOrderAction(order.id, startProductionV2, "production"); }}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-blue-600 hover:from-brand-600 hover:to-blue-700 text-white text-[9px] font-bold transition-all shadow-sm shadow-blue-500/25">
                                    {a ? <Spinner cls="text-white" /> : <Play size={10} />}
                                    {a ? "Processing…" : "Start Production"}
                                  </button>
                                )}
                                {needsProduction && !canStart && (
                                  <button onClick={e => { e.stopPropagation(); window.location.href = "/supply-chain"; }}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-[9px] font-bold transition-all shadow-sm shadow-rose-500/25">
                                    <Truck size={10} /> Order Missing Materials
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  /* ── Order detail panel ── */
                  <div className="space-y-4">
                    <button onClick={closeDetail} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                      ← Back to all orders
                    </button>

                    <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#111827]/40 overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02]">
                        <div className="flex items-center gap-2.5 mb-1">
                          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{viewOrder.orderReference || "—"}</p>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLE[viewOrder.status]?.cls || "status-slate"}`}>
                            {STATUS_STYLE[viewOrder.status]?.label || viewOrder.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono">{viewOrder.id}</p>
                      </div>

                      <div className="px-5 py-4 space-y-4">
                        {/* Client & Org */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03] p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Client</p>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{viewOrder.createdBy || "—"}</p>
                          </div>
                          <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03] p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Organization</p>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{(() => { try { return orgs.find(o => o.id === viewOrder.organizationId)?.name || "—"; } catch { return "—"; } })()}</p>
                          </div>
                        </div>

                        {/* Delivery Schedule */}
                        <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] p-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Delivery Schedule</p>
                          <div className="flex gap-4 flex-wrap">
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase mb-1">Requested</p>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(viewOrder.requestedDeliveryDate)}</p>
                            </div>
                            {viewOrder.proposedDeliveryDate && (
                              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase mb-1">Proposed</p>
                                <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{fmt(viewOrder.proposedDeliveryDate)}</p>
                              </div>
                            )}
                            {viewOrder.confirmedDeliveryDate && (
                              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase mb-1">Confirmed</p>
                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{fmt(viewOrder.confirmedDeliveryDate)}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Products */}
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Order Items</p>
                          <div className="space-y-2">
                            {(viewOrder.items || []).map((item, i) => {
                              const prod = products.find(p => p.id === item.productId);
                              return (
                                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-white/[0.06] p-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{item.productName || prod?.productName || item.productId}</p>
                                    <p className="text-xs text-slate-400">{item.quantity} {item.unit || "units"}</p>
                                  </div>
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${item.status === "AVAILABLE" ? "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20" : item.status === "OUT_OF_STOCK" || item.status === "TO_PRODUCE" ? "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20" : "text-slate-500 bg-slate-100 dark:bg-white/[0.06]"}`}>
                                    {item.status || "—"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Created / Updated */}
                        <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03] p-3">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase mb-1">Created</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300">{viewOrder.createdAt ? new Date(viewOrder.createdAt).toLocaleString() : "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase mb-1">Updated</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300">{viewOrder.updatedAt ? new Date(viewOrder.updatedAt).toLocaleString() : "—"}</p>
                          </div>
                        </div>

                        {actionError && <p className="text-sm text-rose-600 font-medium">{actionError}</p>}

                        {/* Admin Actions */}
                        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</p>

                          {completed[viewOrder.id] && (
                            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/30 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                              {completed[viewOrder.id] === "delivered" ? "Sent to Delivery" : "Production Started"}
                            </div>
                          )}

                          {!completed[viewOrder.id] && (
                            <>
                              <div className="flex gap-2">
                                {!showPropose && !showCancel && (
                                  <>
                                    <button onClick={() => { setShowPropose(true); setShowCancel(false); setActionError(""); }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all">
                                      <Calendar size={12} /> Propose Date
                                    </button>
                                    <button onClick={() => { setShowCancel(true); setShowPropose(false); setActionError(""); }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all">
                                      <XCircle size={12} /> Cancel
                                    </button>
                                  </>
                                )}
                              </div>

                              {showPropose && (
                                <div className="space-y-3 p-4 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5">
                                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Current requested: {fmt(viewOrder.requestedDeliveryDate)}</p>
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">New Proposed Date</label>
                                    <input type="date" value={proposeDate} onChange={e => setProposeDate(e.target.value)}
                                      className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/60 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10" />
                                  </div>
                                  <div className="flex gap-3">
                                    <button onClick={handlePropose} disabled={saving}
                                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-all">
                                      {saving ? "Saving..." : "Propose New Date"}
                                    </button>
                                    <button onClick={() => { setShowPropose(false); setActionError(""); }}
                                      className="py-2.5 px-5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all">
                                      Back
                                    </button>
                                  </div>
                                </div>
                              )}

                              {showCancel && (
                                <div className="space-y-3 p-4 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-500/5">
                                  <div className="flex items-center gap-2 mb-1">
                                    <AlertTriangle size={16} className="text-rose-500 shrink-0" />
                                    <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">Cancel this order?</p>
                                  </div>
                                  <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={2}
                                    className="w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/60 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 resize-none"
                                    placeholder="Reason for cancellation..." />
                                  <div className="flex gap-3">
                                    <button onClick={handleCancelOrder} disabled={saving}
                                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-all">
                                      {saving ? "Cancelling..." : "Cancel Order"}
                                    </button>
                                    <button onClick={() => { setShowCancel(false); setActionError(""); }}
                                      className="py-2.5 px-5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all">
                                      Back
                                    </button>
                                  </div>
                                </div>
                              )}

                              {!showPropose && !showCancel && (
                                <div className="flex gap-2">
                                  {(() => {
                                    const os = orderSummaries.find(s => s.order.id === viewOrder.id);
                                    if (!os) return null;
                                    const { fullyFromStock, needsProduction, matsOk } = os;
                                    const a = acting === viewOrder.id;
                                    return (
                                      <>
                                        {fullyFromStock && (
                                          <button disabled={a} onClick={() => handleOrderAction(viewOrder.id, confirmOrderDelivery, "delivered")}
                                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/25">
                                            {a ? <Spinner cls="text-white" /> : <CheckCircle2 size={13} />}
                                            {a ? "Processing…" : "Send to Delivery"}
                                          </button>
                                        )}
                                        {needsProduction && matsOk && (
                                          <button disabled={a} onClick={() => handleOrderAction(viewOrder.id, startProductionV2, "production")}
                                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-blue-600 hover:from-brand-600 hover:to-blue-700 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/25">
                                            {a ? <Spinner cls="text-white" /> : <Play size={13} />}
                                            {a ? "Processing…" : "Start Production"}
                                          </button>
                                        )}
                                        {needsProduction && !matsOk && (
                                          <button onClick={() => window.location.href = "/supply-chain"}
                                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-rose-500/25">
                                            <Truck size={13} /> Order Missing Materials
                                          </button>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



function DeleteModal({ order, onClose, onDelete }) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const handleDelete = async () => {
    setSaving(true); setErr("");
    try { await onDelete(order.id); onClose(); }
    catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-800 p-7 shadow-2xl ring-1 ring-slate-900/10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Delete Order</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Delete order <strong className="text-slate-700 dark:text-slate-200">{order?.orderReference}</strong>? This cannot be undone.</p>
        {err && <p className="text-sm text-rose-600 mb-4 font-medium">{err}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary py-2 px-5 text-sm">Cancel</button>
          <button onClick={handleDelete} disabled={saving} className="py-2 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-all">{saving ? "Deleting..." : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const role = (localStorage.getItem("userRole") || "").toUpperCase();
  const canManage = role === "ADMIN" || role === "SUBADMIN";
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState(() => localStorage.getItem("orgId") || "");
  const [historyId, setHistoryId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [showBulkDrawer, setShowBulkDrawer] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [ordsData, prodsData, orgsData] = await Promise.all([
          getOrders(),
          getAvailableProducts(),
          loadOrgs(),
        ]);
        if (mounted) {
          setOrders(Array.isArray(ordsData) ? ordsData : []);
          setProducts(Array.isArray(prodsData) ? prodsData : []);
          setOrgs(Array.isArray(orgsData) ? orgsData : []);
        }
      } catch (e) {
        if (mounted) setError(e.message || "Failed to load.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Poll production status for orders IN_PRODUCTION
  useEffect(() => {
    const inProduction = orders.filter(o => o.status === "IN_PRODUCTION" || o.status === "PRODUCTION_COMPLETED");
    if (inProduction.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const fresh = await getOrders();
        const freshList = Array.isArray(fresh) ? fresh : [];
        setOrders(prev => {
          let changed = false;
          const next = prev.map(o => {
            const match = freshList.find(f => f.id === o.id);
            if (match && (match.status !== o.status)) {
              changed = true;
              return { ...o, ...match };
            }
            return o;
          });
          return changed ? next : prev;
        });
      } catch (_) { /* silent */ }
    }, 10000);

    return () => clearInterval(interval);
  }, [orders]);

  const exportCsv = () => {
    const headers = ["Reference", "Status", "Organization", "Items", "Requested Date", "Confirmed Date"];
    const rows = visibleOrders.map(o => [
      o.orderReference || "",
      o.status || "",
      orderProductOrgNames(o),
      (o.items || []).length,
      o.requestedDeliveryDate || "",
      o.confirmedDeliveryDate || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "orders.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id) => {
    await deleteOrder(id);
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const productName = id => products.find(p => p.id === id)?.productName || id || "—";
  const orgName = id => orgs.find(o => o.id === id)?.name || id || "—";

  // Derive org names from the products inside the order items (the org responsible for producing them),
  // falling back to the order's own organizationId if no product match is found.
  const orderProductOrgNames = (order) => {
    const orgIds = [...new Set(
      (order.items || [])
        .map(it => products.find(p => p.id === it.productId)?.organizationId)
        .filter(Boolean)
    )];
    if (orgIds.length === 0) return orgName(order.organizationId);
    return orgIds.map(id => orgName(id)).join(", ");
  };

  const visibleOrders = selectedOrgId ? orders.filter(o => o.organizationId === selectedOrgId) : orders;
  const totalPages = Math.max(1, Math.ceil(visibleOrders.length / pageSize));
  const paginatedOrders = visibleOrders.slice((page - 1) * pageSize, page * pageSize);

  // reset page on filter change
  useEffect(() => { setPage(1); }, [selectedOrgId]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">ORDERS</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Client Orders</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review and manage client orders.</p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const producedStatuses = new Set(["IN_PRODUCTION", "PRODUCTION_COMPLETED", "DELIVERED"]);
                  setSelectedOrderIds(visibleOrders.filter(o => !producedStatuses.has(o.status)).map(o => o.id));
                  setShowBulkDrawer(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
              >
                <Brain size={15} /> Calculate Requirements
              </button>
              <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all">
                <Download size={15} /> Export CSV
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all">
                <Printer size={15} /> Print
              </button>
            </div>
          )}
        </div>

        <OrgSelector value={selectedOrgId} onChange={setSelectedOrgId} />

        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Loading orders...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-rose-600 font-medium">{error}</div>
          ) : visibleOrders.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-slate-500">No orders found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.18em] text-slate-400 border-b border-slate-100 dark:border-white/[0.06]">
                    <th className="px-6 py-4 font-bold">Reference</th>
                    <th className="px-6 py-4 font-bold">Product</th>
                    <th className="px-6 py-4 font-bold">Organization</th>
                    <th className="px-6 py-4 font-bold">Items</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold">Requested Date</th>
                    {canManage && <th className="px-6 py-4 font-bold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                  {paginatedOrders.map(order => {
                    const meta = STATUS_STYLE[order.status] || { cls: "status-slate", label: order.status };
                    return (
                      <tr key={order.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{order.orderReference || "—"}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{order.id?.slice(0, 8)}…</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                          {(order.items || []).map(it => it.productName || productName(it.productId)).join(", ") || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{orderProductOrgNames(order)}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">{(order.items || []).length}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${meta.cls}`}>{meta.label}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                          {order.requestedDeliveryDate ? new Date(order.requestedDeliveryDate).toLocaleDateString() : "—"}
                        </td>
                        {canManage && (
                          <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button type="button" onClick={() => setPendingDelete(order)} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all bg-white dark:bg-slate-700">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {visibleOrders.length > pageSize && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-white/[0.06] text-xs text-slate-500">
              <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, visibleOrders.length)} of {visibleOrders.length}</span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.04] disabled:opacity-30 disabled:pointer-events-none transition-all">
                  Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <button key={pageNum} onClick={() => setPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        pageNum === page
                          ? "bg-brand-600 text-white"
                          : "hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-500"
                      }`}>
                      {pageNum}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.04] disabled:opacity-30 disabled:pointer-events-none transition-all">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {pendingDelete && (
        <DeleteModal
          order={pendingDelete}
          onClose={() => setPendingDelete(null)}
          onDelete={handleDelete}
        />
      )}

      <AuditHistoryModal entityType="Order" entityId={historyId} onClose={() => setHistoryId(null)} />

      {showBulkDrawer && (
        <BulkRequirementsDrawer
          orderIds={selectedOrderIds}
          orders={orders}
          products={products}
          orgs={orgs}
          onClose={() => setShowBulkDrawer(false)}
          onOrderUpdated={updated => {
            setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
          }}
        />
      )}
    </DashboardLayout>
  );
}