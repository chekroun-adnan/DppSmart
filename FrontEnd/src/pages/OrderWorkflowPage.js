import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Package, CheckCircle2, Clock, Truck, Factory, AlertTriangle,
  Zap, BarChart3, RefreshCw,
  ShoppingCart, Layers, XCircle, Calendar,
  Activity, Circle, CheckCheck,
  Loader2, Wifi, WifiOff, Search, Star,
  AlertCircle, Info, ChevronDown, ChevronUp,
  FlaskConical, Lock, Unlock, TrendingDown, Minus,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import OrgSelector from "../components/OrgSelector";
import {
  getOrders,
  workflowConfirmOrder,
  workflowSetPriority,
  workflowSimulate,
  workflowProcessOrder,
  workflowDeliverOrder,
  workflowCompleteProduction,
  workflowRequestDeliveryDate,
  workflowGetMaterials,
  workflowReserveMaterials,
  workflowReleaseMaterials,
} from "../services/authService";
import { useOrderWorkflow } from "../hooks/useOrderWorkflow";
import { useNotifications } from "../context/NotificationContext";



const STATUS_CONFIG = {
  PENDING_REVIEW:             { label: "Pending Review",        color: "amber",  icon: Clock },
  WAITING_DELIVERY_DATE:      { label: "Awaiting Date",         color: "orange", icon: Calendar },
  CONFIRMED:                  { label: "Confirmed",             color: "blue",   icon: CheckCircle2 },
  STOCK_CHECKED:              { label: "Stock Checked",         color: "cyan",   icon: BarChart3 },
  PARTIALLY_AVAILABLE:        { label: "Partially Available",   color: "yellow", icon: AlertTriangle },
  WAITING_FOR_MATERIALS:      { label: "Waiting Materials",     color: "orange", icon: ShoppingCart },
  READY_FOR_PRODUCTION:       { label: "Ready for Production",  color: "violet", icon: Factory },
  IN_PRODUCTION:              { label: "In Production",         color: "blue",   icon: Factory },
  PRODUCTION_COMPLETED:       { label: "Production Done",       color: "teal",   icon: CheckCircle2 },
  READY_FOR_DELIVERY:         { label: "Ready for Delivery",    color: "emerald", icon: Truck },
  READY:                      { label: "Ready for Delivery",    color: "emerald", icon: Truck },
  PARTIALLY_DELIVERED:        { label: "Partially Delivered",   color: "sky",    icon: Truck },
  DELIVERED:                  { label: "Delivered",             color: "slate",  icon: CheckCheck },
  CANCELLED:                  { label: "Cancelled",             color: "red",    icon: XCircle },
  REJECTED:                   { label: "Rejected",              color: "red",    icon: XCircle },
  DATE_CHANGE_REQUESTED:      { label: "Date Change Pending",   color: "purple", icon: Calendar },
  READY_FOR_CONFIRMATION:     { label: "Awaiting Confirmation", color: "amber",  icon: Clock },
};

const PRIORITY_CONFIG = {
  HIGH:   { label: "High",   cls: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10",    dot: "bg-rose-500" },
  NORMAL: { label: "Normal", cls: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10",    dot: "bg-blue-500" },
  LOW:    { label: "Low",    cls: "text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-500/10", dot: "bg-slate-400" },
};

const OUTCOME_CONFIG = {
  READY_FOR_DELIVERY:  { label: "Ready for Delivery",  color: "emerald", icon: Truck },
  START_PRODUCTION:    { label: "Start Production",    color: "blue",    icon: Factory },
  NEEDS_SUPPLY_CHAIN:  { label: "Supply Chain Needed", color: "orange",  icon: ShoppingCart },
  CREATE_SUPPLY_CHAIN_ORDER: { label: "Supply Chain Needed", color: "orange", icon: ShoppingCart },
};

const TIMELINE_STEPS = [
  { key: "created",            label: "Order Created",         icon: Circle },
  { key: "confirmed",          label: "Confirmed",             icon: CheckCircle2 },
  { key: "stock_checked",      label: "Stock Checked",         icon: BarChart3 },
  { key: "waiting_materials",  label: "Waiting Materials",     icon: ShoppingCart },
  { key: "in_production",      label: "In Production",         icon: Factory },
  { key: "production_done",    label: "Production Completed",  icon: CheckCircle2 },
  { key: "ready_delivery",     label: "Ready for Delivery",    icon: Truck },
  { key: "delivered",          label: "Delivered",             icon: CheckCheck },
];



function colorCls(color, variant = "badge") {
  const map = {
    amber:   { badge: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 ring-amber-200/60 dark:ring-amber-500/20", dot: "bg-amber-500" },
    orange:  { badge: "text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 ring-orange-200/60 dark:ring-orange-500/20", dot: "bg-orange-500" },
    blue:    { badge: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 ring-blue-200/60 dark:ring-blue-500/20", dot: "bg-blue-500" },
    cyan:    { badge: "text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 ring-cyan-200/60 dark:ring-cyan-500/20", dot: "bg-cyan-500" },
    yellow:  { badge: "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 ring-yellow-200/60 dark:ring-yellow-500/20", dot: "bg-yellow-500" },
    violet:  { badge: "text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 ring-violet-200/60 dark:ring-violet-500/20", dot: "bg-violet-500" },
    teal:    { badge: "text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 ring-teal-200/60 dark:ring-teal-500/20", dot: "bg-teal-500" },
    emerald: { badge: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-200/60 dark:ring-emerald-500/20", dot: "bg-emerald-500" },
    sky:     { badge: "text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 ring-sky-200/60 dark:ring-sky-500/20", dot: "bg-sky-500" },
    red:     { badge: "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 ring-rose-200/60 dark:ring-rose-500/20", dot: "bg-rose-500" },
    purple:  { badge: "text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 ring-purple-200/60 dark:ring-purple-500/20", dot: "bg-purple-500" },
    slate:   { badge: "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-500/10 ring-slate-200/60 dark:ring-slate-500/20", dot: "bg-slate-400" },
  };
  return map[color]?.[variant] || map.slate[variant];
}

function getTimelineActiveStep(status) {
  const map = {
    PENDING_REVIEW: 0, WAITING_DELIVERY_DATE: 0, READY_FOR_CONFIRMATION: 1,
    CONFIRMED: 1, STOCK_CHECKED: 2, PARTIALLY_AVAILABLE: 2,
    WAITING_FOR_MATERIALS: 3, READY_FOR_PRODUCTION: 4, IN_PRODUCTION: 4,
    PRODUCTION_COMPLETED: 5, READY_FOR_DELIVERY: 6, READY: 6,
    PARTIALLY_DELIVERED: 6, DELIVERED: 7,
  };
  return map[status] ?? 0;
}

function fmt(date) {
  if (!date) return "—";
  try { return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return date; }
}

function relativeTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}



function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "slate" };
  const Icon = cfg.icon || Circle;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ${colorCls(cfg.color, "badge")}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ring-inset ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function OrderTimeline({ status }) {
  const active = getTimelineActiveStep(status);
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1 mt-3">
      {TIMELINE_STEPS.map((step, i) => {
        const done = i < active;
        const current = i === active;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all
                ${done ? "bg-emerald-500 text-white shadow-sm" :
                  current ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30 ring-2 ring-brand-500/30" :
                    "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600"}`}>
                {done ? <CheckCircle2 size={12} /> : <Icon size={12} />}
              </div>
              <span className={`text-[9px] font-medium whitespace-nowrap leading-tight max-w-[52px] text-center
                ${done ? "text-emerald-600 dark:text-emerald-400" :
                  current ? "text-brand-600 dark:text-brand-400 font-bold" : "text-slate-400 dark:text-slate-600"}`}>
                {step.label}
              </span>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div className={`w-8 h-0.5 mx-0.5 mb-4 rounded-full transition-all
                ${i < active ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StockBar({ available, required }) {
  const pct = required > 0 ? Math.min(100, Math.round((available / required) * 100)) : 0;
  const color = pct >= 100 ? "bg-emerald-500" : pct > 50 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-slate-500 shrink-0">{pct}%</span>
    </div>
  );
}

function MissingMaterialRow({ mat }) {
  const missing = mat.missingQuantity > 0;
  return (
    <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs
      ${missing ? "bg-rose-50 dark:bg-rose-500/10" : "bg-emerald-50 dark:bg-emerald-500/10"}`}>
      <span className="font-medium text-slate-700 dark:text-slate-300">{mat.materialName}</span>
      <div className="flex items-center gap-3">
        <span className="text-slate-500">Need: <b>{mat.requiredQuantity} {mat.unit}</b></span>
        <span className="text-slate-500">Have: <b className={missing ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>{mat.availableQuantity}</b></span>
        {missing && <span className="text-rose-600 dark:text-rose-400 font-semibold">−{mat.missingQuantity}</span>}
        {!missing && <CheckCircle2 size={12} className="text-emerald-500" />}
      </div>
    </div>
  );
}

function SimulationPanel({ simulation, onClose }) {
  if (!simulation) return null;
  const outCfg = OUTCOME_CONFIG[simulation.outcome] || { label: simulation.outcome, color: "blue", icon: Info };
  const OutIcon = outCfg.icon;
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Activity size={16} className="text-brand-500" /> Simulation Result
        </h4>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
          <XCircle size={16} />
        </button>
      </div>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${colorCls(outCfg.color, "badge")} ring-1`}>
        <OutIcon size={18} />
        <div>
          <div className="font-bold text-sm">{outCfg.label}</div>
          <div className="text-xs opacity-80">{simulation.message}</div>
        </div>
      </div>

      {simulation.items?.map((item, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{item.productName}</span>
            <div className="flex gap-3 text-xs text-slate-500">
              <span>Required: <b>{item.requiredQuantity}</b></span>
              <span className="text-emerald-600 dark:text-emerald-400">In Stock: <b>{item.availableInStock}</b></span>
              {item.toProduce > 0 && <span className="text-amber-600 dark:text-amber-400">To Produce: <b>{item.toProduce}</b></span>}
            </div>
          </div>
          <StockBar available={item.availableInStock} required={item.requiredQuantity} />
          {item.materialRequirements?.length > 0 && (
            <div className="space-y-1 pl-2">
              {item.materialRequirements.map((m, j) => <MissingMaterialRow key={j} mat={m} />)}
            </div>
          )}
        </div>
      ))}

      {simulation.consolidatedMaterials?.length > 0 && (
        <div className="pt-2 border-t border-slate-100 dark:border-white/5">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Consolidated Materials</div>
          <div className="space-y-1">
            {simulation.consolidatedMaterials.map((m, i) => <MissingMaterialRow key={i} mat={m} />)}
          </div>
        </div>
      )}
    </div>
  );
}



function MaterialsTable({ orderId, hasReservations, onReserved }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [err, setErr] = useState("");
  const { addToast } = useNotifications();

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const res = await workflowGetMaterials(orderId);
      setData(res);
    } catch (e) {
      setErr(e.message);
    } finally { setLoading(false); }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  async function handleReserve() {
    setReserving(true); setErr("");
    try {
      await workflowReserveMaterials(orderId);
      addToast({ type: "success", title: "Materials Reserved", message: "All required materials have been reserved for this order." });
      await load();
      if (onReserved) onReserved();
    } catch (e) {
      setErr(e.message);
      addToast({ type: "error", title: "Reserve Failed", message: e.message });
    } finally { setReserving(false); }
  }

  async function handleRelease() {
    setReleasing(true); setErr("");
    try {
      await workflowReleaseMaterials(orderId);
      addToast({ type: "info", title: "Reservations Released", message: "Material reservations have been released." });
      await load();
      if (onReserved) onReserved();
    } catch (e) {
      setErr(e.message);
      addToast({ type: "error", title: "Release Failed", message: e.message });
    } finally { setReleasing(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading material breakdown…</span>
      </div>
    );
  }

  if (err) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm">
        <AlertCircle size={14} />
        {err}
      </div>
    );
  }

  if (!data || !data.materials?.length) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-400 text-sm">
        <FlaskConical size={14} />
        No materials required — all products can be fulfilled from finished stock.
      </div>
    );
  }

  const reserved = data.materialsReserved;
  const allOk    = data.allSufficient;

  return (
    <div className="space-y-3">
      
      <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl ring-1 text-sm font-medium
        ${allOk
          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-200/60 dark:ring-emerald-500/20"
          : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 ring-rose-200/60 dark:ring-rose-500/20"}`}>
        <div className="flex items-center gap-2">
          {allOk ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {allOk ? "All materials sufficient for production" : "Some materials are insufficient — supply order needed"}
        </div>
        {reserved && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 ring-1 ring-violet-200 dark:ring-violet-500/30">
            <Lock size={9} /> Reserved
          </span>
        )}
      </div>

      
      <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-white/[0.06]">
              <th className="text-left px-3 py-2.5 font-bold uppercase tracking-widest text-[9px] text-slate-400">Material</th>
              <th className="text-right px-3 py-2.5 font-bold uppercase tracking-widest text-[9px] text-slate-400">Available</th>
              <th className="text-right px-3 py-2.5 font-bold uppercase tracking-widest text-[9px] text-slate-400">Reserved</th>
              <th className="text-right px-3 py-2.5 font-bold uppercase tracking-widest text-[9px] text-slate-400">Will Consume</th>
              <th className="text-right px-3 py-2.5 font-bold uppercase tracking-widest text-[9px] text-slate-400">Remaining After</th>
              <th className="text-right px-3 py-2.5 font-bold uppercase tracking-widest text-[9px] text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {data.materials.map((mat, i) => {
              const usePct = mat.availableStock > 0
                ? Math.min(100, Math.round((mat.willConsume / mat.availableStock) * 100))
                : 100;
              const ok = mat.sufficient;
              return (
                <tr key={i} className={`transition-colors ${ok ? "hover:bg-slate-50/60 dark:hover:bg-white/[0.02]" : "bg-rose-50/40 dark:bg-rose-500/5 hover:bg-rose-50/70 dark:hover:bg-rose-500/10"}`}>
                  
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0
                        ${ok ? "bg-slate-100 dark:bg-slate-800 text-slate-400" : "bg-rose-100 dark:bg-rose-500/20 text-rose-500"}`}>
                        <FlaskConical size={11} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">{mat.materialName}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{mat.unit}</div>
                      </div>
                    </div>
                  </td>

                  
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{mat.availableStock}</span>
                    <span className="text-slate-400 ml-1">{mat.unit}</span>
                    
                    <div className="mt-1 flex justify-end">
                      <div className="w-16 h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${usePct >= 100 ? "bg-rose-500" : usePct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${usePct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  
                  <td className="px-3 py-2.5 text-right">
                    {mat.reservedStock > 0 ? (
                      <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 font-medium">
                        <Lock size={9} /> {mat.reservedStock} {mat.unit}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>

                  
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TrendingDown size={11} className={ok ? "text-blue-400" : "text-rose-500"} />
                      <span className={`font-semibold ${ok ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {mat.willConsume} {mat.unit}
                      </span>
                    </div>
                  </td>

                  
                  <td className="px-3 py-2.5 text-right">
                    {ok ? (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        +{mat.remainingAfter} {mat.unit}
                      </span>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <Minus size={10} className="text-rose-500" />
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          {Math.abs(mat.shortage)} {mat.unit} short
                        </span>
                      </div>
                    )}
                  </td>

                  
                  <td className="px-3 py-2.5 text-right">
                    {ok ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200/60 dark:ring-emerald-500/20">
                        <CheckCircle2 size={9} /> OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 ring-1 ring-rose-200/60 dark:ring-rose-500/20">
                        <AlertTriangle size={9} /> Shortage
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      
      {err && <p className="text-xs text-rose-600 dark:text-rose-400">{err}</p>}
      <div className="flex items-center gap-2 pt-1">
        {!reserved && allOk && (
          <button
            onClick={handleReserve}
            disabled={reserving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-violet-500 hover:bg-violet-600 text-white shadow-sm shadow-violet-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {reserving ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
            Reserve Materials
          </button>
        )}
        {!reserved && !allOk && (
          <span className="text-xs text-slate-400 italic flex items-center gap-1.5">
            <AlertCircle size={12} className="text-rose-400" />
            Cannot reserve — materials insufficient. Create a supply order first.
          </span>
        )}
        {reserved && (
          <button
            onClick={handleRelease}
            disabled={releasing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {releasing ? <Loader2 size={12} className="animate-spin" /> : <Unlock size={12} />}
            Release Reservations
          </button>
        )}
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
        >
          <RefreshCw size={11} /> Refresh
        </button>
      </div>
    </div>
  );
}

function OrderCard({ order, onAction, busy, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState("items");
  const [simulation, setSimulation] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const { addToast } = useNotifications();

  const s = order.status;
  const cfg = STATUS_CONFIG[s] || { label: s, color: "slate", icon: Circle };
  const StatusIcon = cfg.icon;

  const canConfirm   = ["PENDING_REVIEW", "READY_FOR_CONFIRMATION", "DATE_CHANGE_REQUESTED"].includes(s);
  const canProcess   = ["CONFIRMED", "STOCK_CHECKED", "PARTIALLY_AVAILABLE", "PENDING_REVIEW", "READY_FOR_CONFIRMATION"].includes(s);
  const canDeliver   = s === "READY_FOR_DELIVERY" || s === "READY";
  const canComplete  = s === "IN_PRODUCTION";
  const canSimulate  = !["DELIVERED", "CANCELLED", "REJECTED"].includes(s);

  async function handleSimulate() {
    setSimLoading(true);
    try {
      const res = await workflowSimulate(order.id);
      setSimulation(res);
      setExpanded(true);
    } catch (e) {
      addToast({ type: "error", title: "Simulation failed", message: e.message });
    } finally { setSimLoading(false); }
  }

  const priorityLabel = order.orderPriority;
  const hasProductions = order.relatedProductionIds?.length > 0;

  return (
    <div className={`rounded-2xl border bg-white dark:bg-[#111827] shadow-sm transition-all hover:shadow-md
      ${s === "WAITING_FOR_MATERIALS" ? "border-orange-200 dark:border-orange-500/20" :
        s === "IN_PRODUCTION" ? "border-blue-200 dark:border-blue-500/20" :
        canDeliver ? "border-emerald-200 dark:border-emerald-500/20" :
        "border-slate-200 dark:border-white/[0.08]"}`}>

      
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorCls(cfg.color, "badge")} ring-1`}>
              <StatusIcon size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{order.orderReference}</span>
                <StatusBadge status={s} />
                {priorityLabel && <PriorityBadge priority={priorityLabel} />}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400">
                <span>Client: {order.clientId?.slice(-8)}</span>
                <span>·</span>
                <span>{order.items?.length} product{order.items?.length !== 1 ? "s" : ""}</span>
                {order.confirmedDeliveryDate && (
                  <><span>·</span><span className="flex items-center gap-1"><Calendar size={10} /> {fmt(order.confirmedDeliveryDate)}</span></>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {canSimulate && (
              <button
                onClick={handleSimulate}
                disabled={simLoading}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {simLoading ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />}
                Simulate
              </button>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-all"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        
        <OrderTimeline status={s} />
      </div>

      
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100 dark:border-white/[0.06] pt-4">

          
          {simulation && (
            <SimulationPanel simulation={simulation} onClose={() => setSimulation(null)} />
          )}

          
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-fit">
            <button
              onClick={() => setTab("items")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${tab === "items" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              <Package size={11} /> Order Items
            </button>
            <button
              onClick={() => setTab("materials")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${tab === "materials" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              <FlaskConical size={11} /> Materials
              {order.hasReservations && (
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
              )}
            </button>
          </div>

          
          {tab === "items" && (
            <div>
              <div className="space-y-2">
                {order.items?.map((item, i) => (
                  <div key={i} className="rounded-xl border border-slate-100 dark:border-white/[0.06] p-3 bg-slate-50 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{item.productName}</span>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium">{item.quantity} {item.unit}</span>
                        {item.allocatedQuantity != null && item.allocatedQuantity < item.quantity && (
                          <span className="text-amber-600 dark:text-amber-400">
                            ({item.allocatedQuantity} allocated, {item.missingQuantity} missing)
                          </span>
                        )}
                      </div>
                    </div>
                    <StockBar available={item.availableStock || 0} required={item.quantity} />
                    {item.requiredMaterials?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">BOM / Materials</div>
                        {item.requiredMaterials.map((m, j) => (
                          <div key={j} className="flex items-center justify-between text-xs text-slate-500 px-2">
                            <span>{m.materialName || m.materialId}</span>
                            <span>{m.requiredQuantity} {m.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          
          {tab === "materials" && (
            <MaterialsTable
              orderId={order.id}
              hasReservations={order.hasReservations}
              onReserved={onRefresh}
            />
          )}

          
          {(order.confirmedBy || order.stockCheckedAt || order.productionStartedAt || order.supplyChainOrderId) && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {order.confirmedBy && (
                <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-2">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Confirmed by</div>
                  <div className="text-slate-700 dark:text-slate-300 mt-0.5 truncate">{order.confirmedBy}</div>
                </div>
              )}
              {order.supplyChainOrderId && (
                <div className="bg-orange-50 dark:bg-orange-500/10 rounded-xl p-2">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-orange-500">Supply Order</div>
                  <div className="text-slate-700 dark:text-slate-300 mt-0.5 truncate">{order.supplyChainOrderId}</div>
                </div>
              )}
              {order.productionStartedAt && (
                <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-2">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-blue-500">Production started</div>
                  <div className="text-slate-700 dark:text-slate-300 mt-0.5">{relativeTime(order.productionStartedAt)}</div>
                </div>
              )}
              {order.deliveryReadyAt && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-2">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-600">Ready since</div>
                  <div className="text-slate-700 dark:text-slate-300 mt-0.5">{relativeTime(order.deliveryReadyAt)}</div>
                </div>
              )}
            </div>
          )}

          
          <div className="flex flex-wrap gap-2 pt-1">
            {canConfirm && (
              <ActionButton
                label="Confirm Order"
                icon={CheckCircle2}
                color="blue"
                busy={busy === `confirm-${order.id}`}
                onClick={() => onAction("confirm", order)}
              />
            )}
            {canProcess && (
              <ActionButton
                label="Process Order"
                icon={Zap}
                color="violet"
                busy={busy === `process-${order.id}`}
                onClick={() => onAction("process", order)}
              />
            )}
            {hasProductions && canComplete && order.relatedProductionIds?.map((prodId) => (
              <ActionButton
                key={prodId}
                label="Complete Production"
                icon={Factory}
                color="teal"
                busy={busy === `complete-${prodId}`}
                onClick={() => onAction("complete-production", order, prodId)}
              />
            ))}
            {canDeliver && (
              <ActionButton
                label="Deliver Order"
                icon={Truck}
                color="emerald"
                busy={busy === `deliver-${order.id}`}
                onClick={() => onAction("deliver", order)}
              />
            )}
            <ActionButton
              label="Set Priority"
              icon={Star}
              color="amber"
              busy={false}
              onClick={() => onAction("set-priority", order)}
            />
            <ActionButton
              label="Request Date"
              icon={Calendar}
              color="purple"
              busy={false}
              onClick={() => onAction("request-date", order)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({ label, icon: Icon, color, busy, onClick }) {
  const colors = {
    blue:    "bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20",
    violet:  "bg-violet-500 hover:bg-violet-600 text-white shadow-violet-500/20",
    emerald: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20",
    teal:    "bg-teal-500 hover:bg-teal-600 text-white shadow-teal-500/20",
    amber:   "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20",
    purple:  "bg-purple-500 hover:bg-purple-600 text-white shadow-purple-500/20",
    rose:    "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20",
    slate:   "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200",
  };
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 ${colors[color] || colors.slate}`}
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
      {label}
    </button>
  );
}



function ConfirmModal({ order, onClose, onDone }) {
  const [date, setDate] = useState(order?.confirmedDeliveryDate || "");
  const [priority, setPriority] = useState(order?.orderPriority || "NORMAL");
  const [msg, setMsg] = useState(order?.adminMessage || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const { addToast } = useNotifications();

  async function submit() {
    if (!date) { setErr("Delivery date is required"); return; }
    setSaving(true); setErr("");
    try {
      await workflowConfirmOrder(order.id, { confirmedDeliveryDate: date, priority, adminMessage: msg });
      addToast({ type: "success", title: "Order Confirmed", message: `${order.orderReference} confirmed.` });
      onDone();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title="Confirm Order" onClose={onClose}>
      <FieldGroup label="Confirmed Delivery Date">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
      </FieldGroup>
      <FieldGroup label="Priority">
        <select value={priority} onChange={(e) => setPriority(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500">
          <option value="HIGH">High</option>
          <option value="NORMAL">Normal</option>
          <option value="LOW">Low</option>
        </select>
      </FieldGroup>
      <FieldGroup label="Admin Message (optional)">
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2}
          className="w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500 resize-none" />
      </FieldGroup>
      {err && <p className="text-sm text-rose-600">{err}</p>}
      <div className="flex gap-3 pt-1">
        <button onClick={onClose} className="flex-1 btn-secondary py-2.5 rounded-xl text-sm">Cancel</button>
        <button onClick={submit} disabled={saving}
          className="flex-1 btn-primary py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Confirm Order
        </button>
      </div>
    </Modal>
  );
}

function ProcessModal({ order, onClose, onDone }) {
  const [date, setDate] = useState(order?.confirmedDeliveryDate || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const { addToast } = useNotifications();

  async function submit() {
    setSaving(true); setErr("");
    try {
      const res = await workflowProcessOrder(order.id, date ? { confirmedDeliveryDate: date } : {});
      const outcome = res?.data?.outcome || res?.outcome;
      const msg = res?.data?.message || res?.message || "Order processed.";
      addToast({ type: "success", title: "Order Processed", message: msg });
      onDone(outcome);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title="Process Order" onClose={onClose}>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
        This will automatically check stock, start production if needed, or create a supply chain order for missing materials.
      </p>
      <FieldGroup label="Confirmed Delivery Date (optional)">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
      </FieldGroup>
      {err && <p className="text-sm text-rose-600">{err}</p>}
      <div className="flex gap-3 pt-1">
        <button onClick={onClose} className="flex-1 btn-secondary py-2.5 rounded-xl text-sm">Cancel</button>
        <button onClick={submit} disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-violet-500 hover:bg-violet-600 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          Process Now
        </button>
      </div>
    </Modal>
  );
}

function PriorityModal({ order, onClose, onDone }) {
  const [priority, setPriority] = useState(order?.orderPriority || "NORMAL");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const { addToast } = useNotifications();

  async function submit() {
    setSaving(true); setErr("");
    try {
      await workflowSetPriority(order.id, priority);
      addToast({ type: "success", title: "Priority Updated", message: `${order.orderReference} → ${priority}` });
      onDone();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title="Set Priority" onClose={onClose}>
      <div className="flex gap-3">
        {["HIGH", "NORMAL", "LOW"].map((p) => {
          const cfg = PRIORITY_CONFIG[p];
          return (
            <button key={p} onClick={() => setPriority(p)}
              className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${priority === p ? `border-current ${cfg.cls}` : "border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300"}`}>
              {p}
            </button>
          );
        })}
      </div>
      {err && <p className="text-sm text-rose-600 mt-2">{err}</p>}
      <div className="flex gap-3 pt-3">
        <button onClick={onClose} className="flex-1 btn-secondary py-2.5 rounded-xl text-sm">Cancel</button>
        <button onClick={submit} disabled={saving}
          className="flex-1 btn-primary py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />}
          Set Priority
        </button>
      </div>
    </Modal>
  );
}

function RequestDateModal({ order, onClose, onDone }) {
  const [date, setDate] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const { addToast } = useNotifications();

  async function submit() {
    if (!date) { setErr("Date is required"); return; }
    setSaving(true); setErr("");
    try {
      await workflowRequestDeliveryDate(order.id, { proposedDate: date, message: msg });
      addToast({ type: "success", title: "Date Change Requested", message: `Proposed ${date} for ${order.orderReference}` });
      onDone();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title="Request Delivery Date Change" onClose={onClose}>
      <FieldGroup label="Proposed Date">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
      </FieldGroup>
      <FieldGroup label="Message to Client (optional)">
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2}
          className="w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500 resize-none" />
      </FieldGroup>
      {err && <p className="text-sm text-rose-600">{err}</p>}
      <div className="flex gap-3 pt-1">
        <button onClick={onClose} className="flex-1 btn-secondary py-2.5 rounded-xl text-sm">Cancel</button>
        <button onClick={submit} disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-purple-500 hover:bg-purple-600 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
          Send Request
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
  return createPortal(
    <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm grid place-items-center px-4 animate-fade-in"
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1E293B] shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/10 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
            <XCircle size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

function FieldGroup({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      {children}
    </div>
  );
}



function StatsBar({ orders }) {
  const counts = orders.reduce((acc, o) => {
    const s = o.status;
    if (["PENDING_REVIEW", "READY_FOR_CONFIRMATION"].includes(s)) acc.pending++;
    else if (s === "IN_PRODUCTION") acc.inProduction++;
    else if (["READY_FOR_DELIVERY", "READY"].includes(s)) acc.readyToDeliver++;
    else if (s === "WAITING_FOR_MATERIALS") acc.waitingMaterials++;
    else if (s === "DELIVERED") acc.delivered++;
    return acc;
  }, { pending: 0, inProduction: 0, readyToDeliver: 0, waitingMaterials: 0, delivered: 0 });

  const stats = [
    { label: "Pending Review", value: counts.pending,         color: "amber",   icon: Clock },
    { label: "In Production",  value: counts.inProduction,    color: "blue",    icon: Factory },
    { label: "Ready to Ship",  value: counts.readyToDeliver,  color: "emerald", icon: Truck },
    { label: "Waiting Mats.",  value: counts.waitingMaterials,color: "orange",  icon: ShoppingCart },
    { label: "Delivered",      value: counts.delivered,       color: "slate",   icon: CheckCheck },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className={`rounded-2xl p-4 ring-1 ${colorCls(s.color, "badge")} flex items-center gap-3`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white/60 dark:bg-black/20`}>
              <Icon size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold leading-none">{s.value}</div>
              <div className="text-[10px] font-semibold mt-0.5 opacity-70">{s.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}



export default function OrderWorkflowPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [modal, setModal] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedOrgId, setSelectedOrgId] = useState(localStorage.getItem("orgId") || "");
  const { addToast } = useNotifications();
  const refreshTimerRef = useRef(null);

  const watchIds = orders.map((o) => o.id);

  
  const { connected } = useOrderWorkflow({
    watchOrderIds: watchIds,
    onEvent: useCallback((event) => {
      const type = event?.type;
      if (!type) return;

      if (["ORDER_UPDATED", "ORDER_STATUS_CHANGED"].includes(type)) {
        const updated = event?.data?.order || event?.data;
        if (updated?.id) {
          setOrders((prev) => prev.map((o) => o.id === updated.id ? { ...o, ...updated } : o));
        }
        if (type === "ORDER_STATUS_CHANGED") {
          addToast({ type: "info", title: "Order Updated", message: `Status → ${event?.data?.newStatus}` });
        }
      }
      if (type === "PRODUCTION_COMPLETED") {
        addToast({ type: "success", title: "Production Completed", message: "Stock updated. Check order readiness." });
        loadOrders();
      }
      if (type === "SUPPLY_CHAIN_ORDER_CREATED") {
        addToast({ type: "warning", title: "Supply Order Created", message: "Missing materials — supply order created." });
      }
      if (type === "DELIVERY_COMPLETED") {
        addToast({ type: "success", title: "Delivered!", message: "Order has been delivered." });
        loadOrders();
      }
      if (["PRODUCT_STOCK_UPDATED", "MATERIAL_STOCK_UPDATED"].includes(type)) {
        loadOrders();
      }
    }, [addToast]),
  });

  async function loadOrders() {
    try {
      const data = await getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadOrders().finally(() => mounted && setLoading(false));
    
    refreshTimerRef.current = setInterval(loadOrders, 45000);
    return () => {
      mounted = false;
      clearInterval(refreshTimerRef.current);
    };
  }, [selectedOrgId]);

  async function handleAction(action, order, extra) {
    if (action === "confirm") { setActiveOrder(order); setModal("confirm"); return; }
    if (action === "process") { setActiveOrder(order); setModal("process"); return; }
    if (action === "set-priority") { setActiveOrder(order); setModal("priority"); return; }
    if (action === "request-date") { setActiveOrder(order); setModal("request-date"); return; }

    if (action === "deliver") {
      const key = `deliver-${order.id}`;
      setBusy(key);
      try {
        await workflowDeliverOrder(order.id);
        addToast({ type: "success", title: "Order Delivered!", message: `${order.orderReference} marked as delivered.` });
        await loadOrders();
      } catch (e) { addToast({ type: "error", title: "Error", message: e.message }); }
      finally { setBusy(null); }
    }

    if (action === "complete-production") {
      const prodId = extra;
      const key = `complete-${prodId}`;
      setBusy(key);
      try {
        await workflowCompleteProduction(prodId);
        addToast({ type: "success", title: "Production Completed", message: "Stock updated, order re-evaluated." });
        await loadOrders();
      } catch (e) { addToast({ type: "error", title: "Error", message: e.message }); }
      finally { setBusy(null); }
    }
  }

  function closeModal() { setModal(null); setActiveOrder(null); }

  async function afterModalAction() {
    closeModal();
    await loadOrders();
  }

  
  const filtered = orders.filter((o) => {
    const matchOrg = !selectedOrgId || o.organizationId === selectedOrgId;
    const matchSearch = !search || o.orderReference?.toLowerCase().includes(search.toLowerCase())
      || o.clientId?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchOrg && matchSearch && matchStatus;
  });

  const statusOptions = ["ALL", "PENDING_REVIEW", "CONFIRMED", "WAITING_FOR_MATERIALS",
    "IN_PRODUCTION", "READY_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">
        
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers size={22} className="text-brand-500" />
              Order Workflow
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Full ERP pipeline — from order intake to delivery
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ring-1
              ${connected ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-200/60 dark:ring-emerald-500/20"
                : "text-slate-500 bg-slate-50 dark:bg-slate-800 ring-slate-200 dark:ring-white/10"}`}>
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {connected ? "Live" : "Offline"}
            </div>
            <button onClick={loadOrders}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        
        <OrgSelector value={selectedOrgId} onChange={setSelectedOrgId} />

        
        {orders.length > 0 && <StatsBar orders={orders} />}

        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders..."
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 pl-9 pr-4 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {statusOptions.map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                  ${statusFilter === s ? "bg-brand-500 text-white shadow-sm" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
                {s === "ALL" ? "All" : STATUS_CONFIG[s]?.label || s}
              </button>
            ))}
          </div>
        </div>

        
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 size={32} className="animate-spin text-brand-500" />
              <span className="text-sm">Loading orders…</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
            <Package size={40} className="opacity-30" />
            <span className="text-sm">No orders match the current filter.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered
              .sort((a, b) => {
                const priority = { HIGH: 0, NORMAL: 1, LOW: 2 };
                const pa = priority[a.orderPriority] ?? 1;
                const pb = priority[b.orderPriority] ?? 1;
                if (pa !== pb) return pa - pb;
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
              })
              .map((order) => (
                <OrderCard key={order.id} order={order} onAction={handleAction} busy={busy} onRefresh={loadOrders} />
              ))}
          </div>
        )}

        
        {modal === "confirm" && activeOrder && (
          <ConfirmModal order={activeOrder} onClose={closeModal} onDone={afterModalAction} />
        )}
        {modal === "process" && activeOrder && (
          <ProcessModal order={activeOrder} onClose={closeModal}
            onDone={async (outcome) => {
              closeModal();
              await loadOrders();
              if (outcome === "DELIVERED") addToast({ type: "success", title: "Ready for Delivery!", message: "All stock allocated." });
              if (outcome === "PRODUCTION_STARTED") addToast({ type: "info", title: "Production Started", message: "Production batches created." });
              if (outcome === "SUPPLY_ORDER_CREATED") addToast({ type: "warning", title: "Supply Order Created", message: "Missing materials — supply order created." });
            }} />
        )}
        {modal === "priority" && activeOrder && (
          <PriorityModal order={activeOrder} onClose={closeModal} onDone={afterModalAction} />
        )}
        {modal === "request-date" && activeOrder && (
          <RequestDateModal order={activeOrder} onClose={closeModal} onDone={afterModalAction} />
        )}
      </div>
    </DashboardLayout>
  );
}
