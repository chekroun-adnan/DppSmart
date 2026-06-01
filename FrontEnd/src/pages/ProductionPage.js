import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import OrgPicker from "../components/OrgPicker";
import OrgSelector from "../components/OrgSelector";
import {
  completeProductionBatch,
  completeProductionStep,
  createProduction,
  deleteProduction,
  updateProduction,
  getAvailableProducts,
  getMyOrganizations,
  getProductionMaterialConsumption,
  getProductions,
  startProductionStep,
  updateProductionStatus,
  assignProductionStep,
} from "../services/authService";
import AuditHistoryModal from "../components/AuditHistoryModal";
import { useNotifications } from "../context/NotificationContext";

const STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

const STATUS_STYLE = {
  PLANNED:     "status-amber",
  IN_PROGRESS: "status-blue",
  COMPLETED:   "status-emerald",
  CANCELLED:   "status-red",
};

const MATERIAL_STATUS_CONFIG = {
  ENOUGH:               { label: "Enough",             cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 ring-emerald-500/20" },
  LOW_AFTER_PRODUCTION: { label: "Low after",          cls: "bg-amber-50  text-amber-700  dark:bg-amber-500/10  dark:text-amber-400  ring-amber-500/20"  },
  NOT_ENOUGH:           { label: "Not enough",         cls: "bg-rose-50   text-rose-700   dark:bg-rose-500/10   dark:text-rose-400   ring-rose-500/20"   },
};

const INPUT = "h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-800/80 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const SELECT = "h-11 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 pl-4 pr-10 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 cursor-pointer bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzY0NzQ4YiIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_0.75rem_center] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzk0YTNiOCIvPjwvc3ZnPg==')] dark:bg-[right_0.5rem_center]";

function FieldGroup({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// ─── Material Consumption Panel ───────────────────────────────────────────────

function MaterialConsumptionPanel({ productionId, productionStatus }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getProductionMaterialConsumption(productionId)
      .then((res) => { if (mounted) setData(res); })
      .catch((e) => { if (mounted) setError(e.message || "Failed to load material data."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [productionId]);

  if (loading) return (
    <div className="flex items-center gap-2 py-4 px-4 text-sm text-slate-500">
      <div className="w-4 h-4 border-2 border-slate-300 border-t-brand-500 rounded-full animate-spin" />
      Loading material consumption…
    </div>
  );
  if (error) return <p className="px-4 py-3 text-sm text-rose-600">{error}</p>;
  if (!data) return null;

  if (!data.technicalSheetFound) {
    return (
      <div className="mx-4 my-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 p-4">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
          No technical sheet found for this product.
        </p>
        <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-500">
          Cannot calculate material consumption. Attach an active BOM/technical sheet to this product first.
        </p>
      </div>
    );
  }

  const isCompleted = productionStatus === "COMPLETED";

  return (
    <div className="px-4 pb-4 pt-2 space-y-3">
      {/* Summary header */}
      <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${data.allMaterialsSufficient ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30" : "bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30"}`}>
        <div>
          <p className={`text-xs font-bold uppercase tracking-widest ${data.allMaterialsSufficient ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
            {data.allMaterialsSufficient ? "All materials sufficient" : "Insufficient materials"}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Sheet: <span className="font-semibold">{data.technicalSheetName}</span>
            {" · "}Producing: <span className="font-semibold">{data.quantityToProduce} units</span>
          </p>
        </div>
        {isCompleted && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-1 rounded-full">
            Consumed
          </span>
        )}
      </div>

      {/* Materials table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/[0.06]">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-white/[0.06]">
              <th className="text-left px-3 py-2 font-bold uppercase tracking-widest text-slate-400 text-[10px]">Material</th>
              <th className="text-right px-3 py-2 font-bold uppercase tracking-widest text-slate-400 text-[10px]">Per unit</th>
              <th className="text-right px-3 py-2 font-bold uppercase tracking-widest text-slate-400 text-[10px]">Total needed</th>
              <th className="text-right px-3 py-2 font-bold uppercase tracking-widest text-slate-400 text-[10px]">Current stock</th>
              <th className="text-right px-3 py-2 font-bold uppercase tracking-widest text-slate-400 text-[10px]">After production</th>
              <th className="text-center px-3 py-2 font-bold uppercase tracking-widest text-slate-400 text-[10px]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
            {data.materials.map((m, i) => {
              const cfg = MATERIAL_STATUS_CONFIG[m.status] || MATERIAL_STATUS_CONFIG.ENOUGH;
              const rowBg = m.status === "NOT_ENOUGH"
                ? "bg-rose-50/50 dark:bg-rose-500/5"
                : m.status === "LOW_AFTER_PRODUCTION"
                ? "bg-amber-50/50 dark:bg-amber-500/5"
                : "";
              return (
                <tr key={i} className={`${rowBg} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{m.materialName}</p>
                    {m.referenceCode && (
                      <p className="text-[10px] text-slate-400 font-mono">{m.referenceCode}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-400 font-mono">
                    {m.quantityPerUnit} <span className="text-slate-400">{m.unit}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {m.totalNeeded} <span className="text-slate-400 font-normal">{m.unit}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-400 font-mono">
                    {m.currentStock}
                    {m.reservedQuantity > 0 && (
                      <span className="ml-1 text-violet-500 text-[10px]">({m.reservedQuantity} rsv)</span>
                    )}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-mono font-bold ${m.remainingAfterProduction < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"}`}>
                    {m.remainingAfterProduction} <span className="text-slate-400 font-normal">{m.unit}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Steps Modal ──────────────────────────────────────────────────────────────

function StepsModal({ production, onClose, onRefreshed }) {
  const steps = Array.isArray(production.steps) ? production.steps : [];
  const completedCount = steps.filter((s) => s.completed).length;
  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  const [actionError, setActionError] = useState("");
  const [assignInputs, setAssignInputs] = useState({});
  const [busyIdx, setBusyIdx] = useState(null);

  const setAssignName = (idx, val) => setAssignInputs((prev) => ({ ...prev, [idx]: val }));

  const handleStart = async (idx) => {
    setBusyIdx(idx); setActionError("");
    try {
      const res = await startProductionStep(production.id, idx);
      onRefreshed(production.id, res?.data ?? res);
    } catch (e) { setActionError(e.message || "Failed to start step."); }
    finally { setBusyIdx(null); }
  };

  const handleComplete = async (idx) => {
    setBusyIdx(idx); setActionError("");
    try {
      const res = await completeProductionStep(production.id, idx);
      onRefreshed(production.id, res?.data ?? res);
    } catch (e) { setActionError(e.message || "Failed to complete step."); }
    finally { setBusyIdx(null); }
  };

  const handleAssign = async (idx) => {
    const name = (assignInputs[idx] || "").trim();
    if (!name) { setActionError("Please enter an employee name."); return; }
    setBusyIdx(idx); setActionError("");
    try {
      const res = await assignProductionStep(production.id, idx, name);
      onRefreshed(production.id, res?.data ?? res);
      setAssignInputs((prev) => ({ ...prev, [idx]: "" }));
    } catch (e) { setActionError(e.message || "Failed to assign step."); }
    finally { setBusyIdx(null); }
  };

  const calcDuration = (step) => {
    if (!step.startDate || !step.endDate) return null;
    const ms = new Date(step.endDate) - new Date(step.startDate);
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const stepState = (step) => {
    if (step.completed) return "completed";
    if (step.startDate) return "inprogress";
    return "notstarted";
  };

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/60 dark:bg-black/75 backdrop-blur-[2px] px-4 animate-fade-in overflow-y-auto py-8">
      <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-slate-900/10 my-auto">
        <div className="flex items-start justify-between px-7 pt-7 pb-5 border-b border-slate-100 dark:border-white/[0.06]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600 mb-1">Production Steps</p>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Manage Steps</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-7 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{completedCount}/{steps.length} steps completed</span>
            <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="px-7 py-5 space-y-0 overflow-y-auto max-h-[60vh]">
          {steps.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No steps defined for this production.</p>
          )}
          {steps.map((step, idx) => {
            const state = stepState(step);
            const duration = calcDuration(step);
            const isBusy = busyIdx === idx;
            return (
              <div key={idx} className="relative flex gap-4">
                {idx < steps.length - 1 && (
                  <div className="absolute left-[13px] top-8 bottom-0 w-px bg-slate-200 dark:bg-white/[0.08]" />
                )}
                <div className="shrink-0 mt-1">
                  {state === "completed" ? (
                    <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                  ) : state === "inprogress" ? (
                    <div className="w-7 h-7 rounded-full bg-blue-500 ring-4 ring-blue-200 dark:ring-blue-500/25 flex items-center justify-center animate-pulse shadow">
                      <span className="text-[10px] font-bold text-white">{idx + 1}</span>
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full border-2 border-slate-200 dark:border-white/[0.15] bg-white dark:bg-slate-800 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-400">{idx + 1}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-bold ${state === "completed" ? "text-slate-400 line-through" : "text-slate-900 dark:text-slate-100"}`}>
                        {step.stepName || `Step ${idx + 1}`}
                      </p>
                      {step.description && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{step.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {step.operator && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            {step.operator}
                          </span>
                        )}
                        {duration && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Duration: {duration}</span>}
                        {state === "inprogress" && step.startDate && (
                          <span className="text-[10px] text-blue-500 font-medium">Started: {new Date(step.startDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {state === "notstarted" && (
                        <button type="button" disabled={isBusy} onClick={() => handleStart(idx)} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 transition-colors disabled:opacity-50">
                          {isBusy ? "…" : "Start"}
                        </button>
                      )}
                      {state === "inprogress" && (
                        <button type="button" disabled={isBusy} onClick={() => handleComplete(idx)} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                          {isBusy ? "…" : "Complete"}
                        </button>
                      )}
                      {state === "completed" && (
                        <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">Done</span>
                      )}
                    </div>
                  </div>
                  {state !== "completed" && (
                    <div className="mt-2 flex gap-2 items-center">
                      <input type="text" placeholder="Assign operator name…" value={assignInputs[idx] || ""} onChange={(e) => setAssignName(idx, e.target.value)}
                        className="h-8 flex-1 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10" />
                      <button type="button" disabled={isBusy} onClick={() => handleAssign(idx)} className="h-8 px-3 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50">Assign</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {actionError && (
          <div className="px-7 pb-4">
            <p className="text-sm text-rose-600 dark:text-rose-400">{actionError}</p>
          </div>
        )}
        <div className="px-7 pb-7 flex justify-end border-t border-slate-100 dark:border-white/[0.06] pt-5">
          <button onClick={onClose} className="btn-secondary py-2 px-5 text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const emptyStep = { stepName: "", description: "", orderIndex: 0 };

export default function ProductionPage() {
  const { t } = useTranslation();
  const { addToast } = useNotifications();
  const role = (localStorage.getItem("userRole") || "").toUpperCase();
  const [productions, setProductions] = useState([]);
  const [products, setProducts] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [draft, setDraft] = useState({ productId: "", organizationId: "", quantity: 1, steps: [{ ...emptyStep }] });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingEdit, setPendingEdit] = useState(null);
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedTab, setExpandedTab] = useState({}); // prodId → "steps" | "materials"
  const [selectedOrgId, setSelectedOrgId] = useState(() => localStorage.getItem("orgId") || "");
  const [historyId, setHistoryId] = useState(null);
  const [stepsModalProd, setStepsModalProd] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const refreshTimerRef = useRef(null);

  const loadProductions = useCallback(async () => {
    try {
      const data = await getProductions();
      setProductions(data);
    } catch (e) {
      setError(e.message || "Failed to load productions.");
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [prodData, productsData, orgsData] = await Promise.all([getProductions(), getAvailableProducts(), getMyOrganizations()]);
        if (mounted) { setProductions(prodData); setProducts(productsData); setOrgs(orgsData); }
      } catch (e) {
        if (mounted) setError(e.message || t("errors.serverError", "Failed to load productions."));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    // Fallback polling every 45s
    refreshTimerRef.current = setInterval(() => { loadProductions(); }, 45000);
    return () => {
      mounted = false;
      clearInterval(refreshTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isModalOpen = modal === "create" || modal === "edit" || modal === "delete";

  useEffect(() => {
    document.body.style.overflow = isModalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isModalOpen]);

  useEffect(() => {
    function handleEsc(e) { if (e.key === "Escape") { setModal(null); setActionError(""); } }
    if (isModalOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isModalOpen]);

  const productName = (id) => products.find((p) => p.id === id)?.productName || id || "—";
  const orgName = (id) => orgs.find((o) => o.id === id)?.name || id || "—";

  const getTab = (prodId) => expandedTab[prodId] || "steps";
  const setTab = (prodId, tab) => setExpandedTab((prev) => ({ ...prev, [prodId]: tab }));

  const openCreate = () => {
    setPendingEdit(null);
    setDraft({ productId: "", organizationId: "", quantity: 1, steps: [{ stepName: "", description: "", orderIndex: 0 }] });
    setActionError("");
    setModal("create");
  };

  const openEdit = (prod) => {
    setPendingEdit(prod);
    setDraft({
      productId: prod.productId || "",
      organizationId: prod.organizationId || "",
      quantity: prod.quantity || 1,
      steps: (prod.steps || []).length > 0
        ? prod.steps.map((s, i) => ({ stepName: s.stepName || "", description: s.description || "", orderIndex: i }))
        : [{ stepName: "", description: "", orderIndex: 0 }],
    });
    setActionError("");
    setModal("edit");
  };

  const addStep = () => setDraft((p) => ({ ...p, steps: [...p.steps, { stepName: "", description: "", orderIndex: p.steps.length }] }));
  const removeStep = (i) => setDraft((p) => ({ ...p, steps: p.steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, orderIndex: idx })) }));
  const updateStep = (i, field, value) => setDraft((p) => ({ ...p, steps: p.steps.map((s, idx) => idx === i ? { ...s, [field]: value } : s) }));

  const validateDraft = () => {
    if (!draft.productId) return "Please select a product.";
    if (!draft.organizationId) return "Please select an organization.";
    if (!draft.quantity || Number(draft.quantity) < 1) return "Quantity must be at least 1.";
    if (!draft.steps?.length) return "At least one production step is required.";
    for (const s of draft.steps) {
      if (!s.stepName?.trim()) return "Each step must have a name.";
    }
    return null;
  };

  const handleCreate = async () => {
    const err = validateDraft();
    if (err) { setActionError(err); return; }
    setSaving(true); setActionError("");
    try {
      const res = await createProduction({ ...draft, quantity: Number(draft.quantity) });
      const item = res?.data ?? res;
      setProductions((prev) => [item, ...prev]);
      setModal(null);
    } catch (e) { setActionError(e.message || "Failed to create production."); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    const err = validateDraft();
    if (err) { setActionError(err); return; }
    setSaving(true); setActionError("");
    try {
      const res = await updateProduction(pendingEdit.id, { ...draft, quantity: Number(draft.quantity) });
      const item = res?.data ?? res;
      setProductions((prev) => prev.map((p) => p.id === pendingEdit.id ? { ...p, ...item } : p));
      setModal(null); setPendingEdit(null);
      addToast({ type: "success", title: "Production Updated", message: "Production batch has been updated." });
    } catch (e) { setActionError(e.message || "Failed to update production."); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (prod, newStatus) => {
    if (newStatus === "COMPLETED") {
      // Route through the proper complete endpoint
      await handleCompleteProduction(prod.id);
      return;
    }
    try {
      const res = await updateProductionStatus(prod.id, { status: newStatus });
      const item = res?.data ?? res;
      setProductions((prev) => prev.map((p) => p.id === prod.id ? { ...p, ...item } : p));
    } catch (e) { alert(e.message || "Failed to update status."); }
  };

  const handleCompleteProduction = async (id) => {
    setCompletingId(id);
    try {
      const res = await completeProductionBatch(id);
      const item = res?.data ?? res;
      setProductions((prev) => prev.map((p) => p.id === id ? { ...p, ...item, status: "COMPLETED" } : p));
      addToast({
        type: "success",
        title: "Production completed",
        message: "Stock updated and materials consumed successfully.",
      });
      // Also refresh to pick up any order status changes
      setTimeout(() => loadProductions(), 1500);
    } catch (e) {
      alert(e.message || "Failed to complete production.");
    } finally {
      setCompletingId(null);
    }
  };

  const handleStartStep = async (productionId, stepIndex) => {
    try {
      const res = await startProductionStep(productionId, stepIndex);
      const item = res?.data ?? res;
      setProductions((prev) => prev.map((p) => p.id === productionId ? { ...p, ...item } : p));
    } catch (e) { alert(e.message || "Failed to start step."); }
  };

  const handleCompleteStep = async (productionId, stepIndex) => {
    try {
      const res = await completeProductionStep(productionId, stepIndex);
      const item = res?.data ?? res;
      setProductions((prev) => prev.map((p) => p.id === productionId ? { ...p, ...item } : p));
      // If production became COMPLETED via last step, refresh to sync order state
      if (item?.status === "COMPLETED") {
        addToast({
          type: "success",
          title: "Production completed",
          message: "All steps done. Stock updated and materials consumed.",
        });
        setTimeout(() => loadProductions(), 1500);
      }
    } catch (e) { alert(e.message || "Failed to complete step."); }
  };

  const handleStepRefreshed = (productionId, updatedProd) => {
    setProductions((prev) => prev.map((p) => p.id === productionId ? { ...p, ...updatedProd } : p));
    setStepsModalProd((prev) => prev && prev.id === productionId ? { ...prev, ...updatedProd } : prev);
    if (updatedProd?.status === "COMPLETED") {
      addToast({ type: "success", title: "Production completed", message: "Stock updated and materials consumed." });
      setTimeout(() => loadProductions(), 1500);
    }
  };

  const handleDelete = async () => {
    setSaving(true); setActionError("");
    try {
      await deleteProduction(pendingDelete.id);
      setProductions((prev) => prev.filter((p) => p.id !== pendingDelete.id));
      setModal(null); setPendingDelete(null);
    } catch (e) { setActionError(e.message || "Failed to delete production."); }
    finally { setSaving(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">{t("production.manufacturing", "Manufacturing")}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{t("production.title")}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("production.subtitle", "Manage production batches and workflow steps.")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={loadProductions} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-brand-600 transition-colors" title="Refresh">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <button type="button" onClick={openCreate} className="btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {t("production.newProduction", "New Production")}
            </button>
          </div>
        </div>

        <OrgSelector value={selectedOrgId} onChange={setSelectedOrgId} />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">{t("production.loading", "Loading productions...")}</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
        ) : (() => {
          const visibleProductions = selectedOrgId
            ? productions.filter((p) => p.organizationId === selectedOrgId)
            : productions;
          return visibleProductions.length === 0 ? (
            <div className="glass-card py-16 text-center border-slate-200">
              <p className="text-sm font-semibold text-slate-500">{selectedOrgId ? "No productions for this organization." : t("production.noProduction")}</p>
              {!selectedOrgId && <button type="button" onClick={openCreate} className="btn-primary mt-4 text-sm">{t("production.startFirst", "Start first production")}</button>}
            </div>
          ) : (
            <div className="space-y-4">
              {visibleProductions.map((prod) => {
                const steps = Array.isArray(prod.steps) ? prod.steps : [];
                const completedSteps = steps.filter((s) => s.completed).length;
                const progress = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;
                const isExpanded = expandedId === prod.id;
                const tab = getTab(prod.id);
                const isCompleted = prod.status === "COMPLETED";
                const isCancelled = prod.status === "CANCELLED";
                const isCompleting = completingId === prod.id;

                return (
                  <article key={prod.id} className="glass-card overflow-hidden border-slate-200">
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLE[prod.status] || "status-slate"}`}>
                              {prod.status}
                            </span>
                            <p className="text-base font-bold text-slate-900 dark:text-slate-100">{productName(prod.productId)}</p>
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            <span>{orgName(prod.organizationId)}</span>
                            <span>•</span>
                            <span>{t("production.qty", "Qty")}: <strong className="text-slate-700 dark:text-slate-200">{prod.quantity}</strong></span>
                            {steps.length > 0 && <>
                              <span>•</span>
                              <span>{completedSteps}/{steps.length} steps done</span>
                            </>}
                            {prod.clientOrderId && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 font-medium">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                  Linked to order
                                </span>
                              </>
                            )}
                            {prod.completedAt && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                  Done: {new Date(prod.completedAt).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                          {steps.length > 0 && (
                            <div className="mt-3 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-500 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{progress}%</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Complete Production button — only for non-completed, non-cancelled */}
                          {!isCompleted && !isCancelled && (
                            <button
                              type="button"
                              disabled={isCompleting}
                              onClick={() => handleCompleteProduction(prod.id)}
                              className="text-xs font-semibold px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                              {isCompleting ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                  Completing…
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                  Complete Production
                                </>
                              )}
                            </button>
                          )}

                          {steps.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setStepsModalProd(prod)}
                              className="text-xs font-semibold px-3 py-2 rounded-xl border border-brand-200 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
                            >
                              Manage Steps
                            </button>
                          )}

                          {/* Status dropdown — completed productions show as read-only */}
                          {isCompleted ? (
                            <span className="h-9 inline-flex items-center px-3 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                              COMPLETED
                            </span>
                          ) : (
                            <select
                              value={prod.status}
                              onChange={(e) => handleStatusChange(prod, e.target.value)}
                              disabled={isCancelled}
                              className="h-9 appearance-none rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 pl-3 pr-8 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzY0NzQ4YiIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_0.5rem_center] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzk0YTNiOCIvPjwvc3ZnPg==')] dark:bg-[right_0.5rem_center]"
                            >
                              {STATUSES.filter((s) => s !== "COMPLETED").map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          )}

                          <button type="button" onClick={() => setExpandedId(isExpanded ? null : prod.id)} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-700 text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-all">
                            <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          {role === "ADMIN" && (
                            <button type="button" onClick={() => setHistoryId(prod.id)} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-700 text-slate-400 hover:text-amber-600 hover:border-amber-200 transition-all" title="View History">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                          )}
                          {!isCompleted && (
                            <>
                              <button type="button" onClick={() => openEdit(prod)} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-700 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all" title="Edit">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                            </>
                          )}
                          <button type="button" onClick={() => { setPendingDelete(prod); setActionError(""); setModal("delete"); }} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-700 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all" title="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded section with tabs */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-white/[0.06]">
                        {/* Tab switcher */}
                        <div className="flex items-center gap-1 px-5 pt-3 pb-0">
                          <button
                            onClick={() => setTab(prod.id, "steps")}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${tab === "steps" ? "bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                          >
                            Steps {steps.length > 0 && `(${completedSteps}/${steps.length})`}
                          </button>
                          <button
                            onClick={() => setTab(prod.id, "materials")}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${tab === "materials" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                            Material Consumption
                            {isCompleted && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" />}
                          </button>
                        </div>

                        {tab === "steps" && steps.length > 0 && (
                          <div className="divide-y divide-slate-100 dark:divide-white/[0.05] mt-2">
                            {steps.map((step, idx) => (
                              <div key={idx} className="flex items-center gap-4 px-5 py-3">
                                <div className={`flex-none h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${step.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 dark:border-white/[0.15] text-slate-400 dark:text-slate-500"}`}>
                                  {step.completed ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                  ) : idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-semibold ${step.completed ? "text-slate-400 line-through" : "text-slate-900 dark:text-slate-100"}`}>{step.stepName || `Step ${idx + 1}`}</p>
                                  {step.description && <p className="text-xs text-slate-400 truncate">{step.description}</p>}
                                </div>
                                <div className="flex gap-2">
                                  {!step.startDate && !step.completed && !isCompleted && (
                                    <button type="button" onClick={() => handleStartStep(prod.id, idx)} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors">Start</button>
                                  )}
                                  {step.startDate && !step.completed && !isCompleted && (
                                    <button type="button" onClick={() => handleCompleteStep(prod.id, idx)} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">Complete</button>
                                  )}
                                  {step.completed && <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600">Done</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {tab === "steps" && steps.length === 0 && (
                          <p className="px-5 py-4 text-sm text-slate-400">No steps defined for this production.</p>
                        )}

                        {tab === "materials" && (
                          <MaterialConsumptionPanel
                            productionId={prod.id}
                            productionStatus={prod.status}
                          />
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Create modal */}
      {modal === "create" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => { setModal(null); setActionError(""); }}>
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-6 md:p-8">
              <div className="flex items-start justify-between mb-5">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t("production.newBatch", "New Production Batch")}</h2>
                <button type="button" onClick={() => { setModal(null); setActionError(""); }} className="ml-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="space-y-4">
                <FieldGroup label={t("products.productName")}>
                  <select className={SELECT} value={draft.productId} onChange={(e) => setDraft((p) => ({ ...p, productId: e.target.value }))}>
                    <option value="">{t("products.selectProduct", "Select product")}</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.productName}</option>)}
                  </select>
                </FieldGroup>
                <FieldGroup label={t("common.selectOrganization")}>
                  <OrgPicker value={draft.organizationId} onChange={(id) => setDraft((p) => ({ ...p, organizationId: id }))} />
                </FieldGroup>
                <FieldGroup label={t("orders.quantity")}>
                  <input type="number" min={1} className={INPUT} value={draft.quantity} onChange={(e) => setDraft((p) => ({ ...p, quantity: e.target.value }))} />
                </FieldGroup>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("production.productionSteps", "Production Steps")}</label>
                    <button type="button" onClick={addStep} className="text-xs font-semibold text-brand-600 hover:text-brand-700">{t("production.addStep", "+ Add Step")}</button>
                  </div>
                  <div className="space-y-3">
                    {draft.steps.map((step, idx) => (
                      <div key={idx} className="rounded-2xl border border-slate-200 dark:border-white/[0.08] p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Step {idx + 1}</span>
                          {draft.steps.length > 1 && (
                            <button type="button" onClick={() => removeStep(idx)} className="text-xs text-rose-500 hover:text-rose-700">{t("common.delete")}</button>
                          )}
                        </div>
                        <input className={INPUT} placeholder="Step name" value={step.stepName} onChange={(e) => updateStep(idx, "stepName", e.target.value)} />
                        <input className={INPUT} placeholder="Description (optional)" value={step.description} onChange={(e) => updateStep(idx, "description", e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {actionError && <p className="mt-4 text-sm text-rose-600">{actionError}</p>}
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setModal(null)} className="btn-secondary py-2 px-5 text-sm">{t("common.cancel")}</button>
                <button type="button" onClick={handleCreate} disabled={saving} className="btn-primary py-2 px-5 text-sm">
                  {saving ? "Creating…" : "Create Production"}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Edit modal */}
      {modal === "edit" && pendingEdit && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => { setModal(null); setPendingEdit(null); setActionError(""); }}>
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-6 md:p-8">
              <div className="flex items-start justify-between mb-5">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Edit Production Batch</h2>
                <button type="button" onClick={() => { setModal(null); setPendingEdit(null); setActionError(""); }} className="ml-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="space-y-4">
                <FieldGroup label={t("products.productName")}>
                  <select className={SELECT} value={draft.productId} onChange={(e) => setDraft((p) => ({ ...p, productId: e.target.value }))}>
                    <option value="">{t("products.selectProduct", "Select product")}</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.productName}</option>)}
                  </select>
                </FieldGroup>
                <FieldGroup label={t("orders.quantity")}>
                  <input type="number" min={1} className={INPUT} value={draft.quantity} onChange={(e) => setDraft((p) => ({ ...p, quantity: e.target.value }))} />
                </FieldGroup>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("production.productionSteps", "Production Steps")}</label>
                    <button type="button" onClick={addStep} className="text-xs font-semibold text-brand-600 hover:text-brand-700">{t("production.addStep", "+ Add Step")}</button>
                  </div>
                  <div className="space-y-3">
                    {draft.steps.map((step, idx) => (
                      <div key={idx} className="rounded-2xl border border-slate-200 dark:border-white/[0.08] p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Step {idx + 1}</span>
                          {draft.steps.length > 1 && (
                            <button type="button" onClick={() => removeStep(idx)} className="text-xs text-rose-500 hover:text-rose-700">{t("common.delete")}</button>
                          )}
                        </div>
                        <input className={INPUT} placeholder="Step name" value={step.stepName} onChange={(e) => updateStep(idx, "stepName", e.target.value)} />
                        <input className={INPUT} placeholder="Description (optional)" value={step.description} onChange={(e) => updateStep(idx, "description", e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {actionError && <p className="mt-4 text-sm text-rose-600">{actionError}</p>}
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => { setModal(null); setPendingEdit(null); }} className="btn-secondary py-2 px-5 text-sm">{t("common.cancel")}</button>
                <button type="button" onClick={handleEdit} disabled={saving} className="btn-primary py-2 px-5 text-sm">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Delete modal */}
      {modal === "delete" && pendingDelete && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 p-7 shadow-2xl ring-1 ring-slate-900/10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Delete Production</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Delete this production batch? This cannot be undone.</p>
            {actionError && <p className="mt-3 text-sm text-rose-600">{actionError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary py-2 px-5 text-sm">{t("common.cancel")}</button>
              <button type="button" onClick={handleDelete} disabled={saving} className="py-2 px-5 text-sm font-semibold rounded-full bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 transition-colors">
                {saving ? "Deleting…" : t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      <AuditHistoryModal entityType="Production" entityId={historyId} onClose={() => setHistoryId(null)} />

      {stepsModalProd && (
        <StepsModal
          production={stepsModalProd}
          onClose={() => setStepsModalProd(null)}
          onRefreshed={handleStepRefreshed}
        />
      )}
    </DashboardLayout>
  );
}
