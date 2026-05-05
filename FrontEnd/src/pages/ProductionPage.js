import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import OrgPicker from "../components/OrgPicker";
import OrgSelector from "../components/OrgSelector";
import {
  completeProductionStep,
  createProduction,
  deleteProduction,
  getAvailableProducts,
  getMyOrganizations,
  getProductions,
  startProductionStep,
  updateProductionStatus,
} from "../services/authService";

const STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

const STATUS_STYLE = {
  PLANNED: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const INPUT = "h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-all focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const SELECT = `${INPUT} cursor-pointer`;

function FieldGroup({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const emptyStep = { stepName: "", description: "", orderIndex: 0 };

export default function ProductionPage() {
  const { t } = useTranslation();
  const [productions, setProductions] = useState([]);
  const [products, setProducts] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [draft, setDraft] = useState({ productId: "", organizationId: "", quantity: 1, steps: [{ ...emptyStep }] });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedOrgId, setSelectedOrgId] = useState("");

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
    return () => { mounted = false; };
  }, []);

  const productName = (id) => products.find((p) => p.id === id)?.productName || id || "—";
  const orgName = (id) => orgs.find((o) => o.id === id)?.name || id || "—";

  const openCreate = () => {
    setDraft({ productId: "", organizationId: "", quantity: 1, steps: [{ stepName: "", description: "", orderIndex: 0 }] });
    setActionError("");
    setModal("create");
  };

  const addStep = () => setDraft((p) => ({ ...p, steps: [...p.steps, { stepName: "", description: "", orderIndex: p.steps.length }] }));
  const removeStep = (i) => setDraft((p) => ({ ...p, steps: p.steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, orderIndex: idx })) }));
  const updateStep = (i, field, value) => setDraft((p) => ({ ...p, steps: p.steps.map((s, idx) => idx === i ? { ...s, [field]: value } : s) }));

  const validateDraft = () => {
    if (!draft.productId) return t("production.selectProduct", "Please select a product.");
    if (!draft.organizationId) return t("common.selectOrganization");
    if (!draft.quantity || Number(draft.quantity) < 1) return t("production.quantityMin", "Quantity must be at least 1.");
    if (!draft.steps?.length) return t("production.stepRequired", "At least one production step is required.");
    for (const s of draft.steps) {
      if (!s.stepName?.trim()) return t("production.stepNameRequired", "Each step must have a name.");
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
    } catch (e) { setActionError(e.message || t("production.createFailed", "Failed to create production.")); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (prod, newStatus) => {
    try {
      const res = await updateProductionStatus(prod.id, { status: newStatus });
      const item = res?.data ?? res;
      setProductions((prev) => prev.map((p) => p.id === prod.id ? { ...p, ...item, status: newStatus } : p));
    } catch (e) { alert(e.message || t("production.updateStatusFailed", "Failed to update status.")); }
  };

  const handleStartStep = async (productionId, stepIndex) => {
    try {
      const res = await startProductionStep(productionId, stepIndex);
      const item = res?.data ?? res;
      setProductions((prev) => prev.map((p) => p.id === productionId ? { ...p, ...item } : p));
    } catch (e) { alert(e.message || t("production.startStepFailed", "Failed to start step.")); }
  };

  const handleCompleteStep = async (productionId, stepIndex) => {
    try {
      const res = await completeProductionStep(productionId, stepIndex);
      const item = res?.data ?? res;
      setProductions((prev) => prev.map((p) => p.id === productionId ? { ...p, ...item } : p));
    } catch (e) { alert(e.message || t("production.completeStepFailed", "Failed to complete step.")); }
  };

  const handleDelete = async () => {
    setSaving(true); setActionError("");
    try {
      await deleteProduction(pendingDelete.id);
      setProductions((prev) => prev.filter((p) => p.id !== pendingDelete.id));
      setModal(null); setPendingDelete(null);
    } catch (e) { setActionError(e.message || t("production.deleteFailed", "Failed to delete production.")); }
    finally { setSaving(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">{t("production.manufacturing", "Manufacturing")}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{t("production.title")}</h1>
            <p className="mt-1 text-sm text-slate-500">{t("production.subtitle", "Manage production batches and workflow steps.")}</p>
          </div>
          <button type="button" onClick={openCreate} className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t("production.newProduction", "New Production")}
          </button>
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
              <p className="text-sm font-semibold text-slate-500">{selectedOrgId ? t("production.noProductionsForOrg", "No productions for this organization.") : t("production.noProduction")}</p>
              {!selectedOrgId && <button type="button" onClick={openCreate} className="btn-primary mt-4 text-sm">{t("production.startFirst", "Start first production")}</button>}
            </div>
          ) : (
            <div className="space-y-4">
            {visibleProductions.map((prod) => {
              const steps = Array.isArray(prod.steps) ? prod.steps : [];
              const completedSteps = steps.filter((s) => s.completed).length;
              const progress = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;
              const isExpanded = expandedId === prod.id;

              return (
                <article key={prod.id} className="glass-card overflow-hidden border-slate-200">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLE[prod.status] || "bg-slate-100 text-slate-600"}`}>
                            {prod.status}
                          </span>
                          <p className="text-base font-bold text-slate-900">{productName(prod.productId)}</p>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
                          <span>{orgName(prod.organizationId)}</span>
                          <span>•</span>
                          <span>{t("production.qty", "Qty")}: <strong className="text-slate-700">{prod.quantity}</strong></span>
                          <span>•</span>
                          <span>{completedSteps}/{steps.length} {t("production.stepsDone", "steps done")}</span>
                        </div>
                        {steps.length > 0 && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-brand-500 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">{progress}%</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={prod.status}
                          onChange={(e) => handleStatusChange(prod, e.target.value)}
                          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 cursor-pointer"
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button type="button" onClick={() => setExpandedId(isExpanded ? null : prod.id)} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-all">
                          <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <button type="button" onClick={() => { setPendingDelete(prod); setActionError(""); setModal("delete"); }} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && steps.length > 0 && (
                    <div className="border-t border-slate-100 divide-y divide-slate-100">
                      {steps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-4 px-5 py-3">
                          <div className={`flex-none h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${step.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 text-slate-400"}`}>
                            {step.completed ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            ) : idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${step.completed ? "text-slate-400 line-through" : "text-slate-900"}`}>{step.stepName || `${t("common.name")} ${idx + 1}`}</p>
                            {step.description && <p className="text-xs text-slate-400 truncate">{step.description}</p>}
                          </div>
                          <div className="flex gap-2">
                            {!step.startDate && !step.completed && (
                              <button type="button" onClick={() => handleStartStep(prod.id, idx)} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors">
                                {t("production.start", "Start")}
                              </button>
                            )}
                            {step.startDate && !step.completed && (
                              <button type="button" onClick={() => handleCompleteStep(prod.id, idx)} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                                {t("production.complete", "Complete")}
                              </button>
                            )}
                            {step.completed && <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600">{t("production.done", "Done")}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          );
        })()}
      </div>

      {modal === "create" && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/40 px-4 animate-fade-in overflow-y-auto py-8">
          <div className="w-full max-w-xl rounded-3xl bg-white p-7 shadow-2xl ring-1 ring-slate-900/10 my-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-5">{t("production.newBatch", "New Production Batch")}</h2>
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
                    <div key={idx} className="rounded-2xl border border-slate-200 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">{t("production.step", "Step")} {idx + 1}</span>
                        {draft.steps.length > 1 && (
                          <button type="button" onClick={() => removeStep(idx)} className="text-xs text-rose-500 hover:text-rose-700">{t("common.delete")}</button>
                        )}
                      </div>
                      <input className={INPUT} placeholder={t("production.stepNamePlaceholder", "Step name")} value={step.stepName} onChange={(e) => updateStep(idx, "stepName", e.target.value)} />
                      <input className={INPUT} placeholder={t("production.descriptionOptional", "Description (optional)")} value={step.description} onChange={(e) => updateStep(idx, "description", e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {actionError && <p className="mt-4 text-sm text-rose-600">{actionError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary py-2 px-5 text-sm">{t("common.cancel")}</button>
              <button type="button" onClick={handleCreate} disabled={saving} className="btn-primary py-2 px-5 text-sm">
                {saving ? t("production.creating", "Creating...") : t("production.createProduction", "Create Production")}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "delete" && pendingDelete && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/40 px-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl ring-1 ring-slate-900/10">
            <h2 className="text-xl font-bold text-slate-900">{t("common.delete")} {t("production.title")}</h2>
            <p className="mt-2 text-sm text-slate-600">{t("production.deleteConfirm", "Delete this production batch? This cannot be undone.")}</p>
            {actionError && <p className="mt-3 text-sm text-rose-600">{actionError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary py-2 px-5 text-sm">{t("common.cancel")}</button>
              <button type="button" onClick={handleDelete} disabled={saving} className="py-2 px-5 text-sm font-semibold rounded-full bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 transition-colors">
                {saving ? t("production.deleting", "Deleting...") : t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
