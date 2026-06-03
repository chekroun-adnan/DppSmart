import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import OrgSelector from "../components/OrgSelector";
import {
  completeProductionStep,
  getAvailableProducts,
  getMyOrganizations,
  getProductions,
  startProductionStep,
  updateProductionStatus,
} from "../services/authService";

const STEP_STYLE = {
  PENDING: { bg: "status-slate", dot: "bg-slate-300 dark:bg-slate-500", label: "Pending" },
  IN_PROGRESS: { bg: "status-blue", dot: "bg-blue-500 animate-pulse", label: "In Progress" },
  COMPLETED: { bg: "status-emerald", dot: "bg-emerald-500", label: "Done" },
};

const PROD_STATUS_STYLE = {
  PLANNED: { bg: "status-slate", label: "Planned" },
  IN_PROGRESS: { bg: "status-blue", label: "In Progress" },
  COMPLETED: { bg: "status-emerald", label: "Completed" },
  CANCELLED: { bg: "status-red", label: "Cancelled" },
};

function ScoreBar({ score }) {
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
  const labelBg = pct >= 80 ? "status-emerald" : pct >= 40 ? "status-amber" : "status-red";
  const label = pct >= 80 ? "Certified" : pct >= 40 ? "In Review" : "Issues";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 w-8 text-right">{pct}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${labelBg}`}>{label}</span>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmLabel, confirmClass, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-800 p-7 shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/[0.08]">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn-secondary py-2 px-5 text-sm">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={loading} className={`py-2 px-5 text-sm font-semibold rounded-full text-white transition-colors disabled:opacity-60 ${confirmClass}`}>
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QualityControlPage() {
  const [productions, setProductions] = useState([]);
  const [products, setProducts] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(() => localStorage.getItem("orgId") || "");
  const [activeTab, setActiveTab] = useState("inspections");
  const [qualityFilter, setQualityFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [prodData, productData, orgData] = await Promise.all([
          getProductions(),
          getAvailableProducts(),
          getMyOrganizations(),
        ]);
        if (mounted) {
          setProductions(Array.isArray(prodData) ? prodData : []);
          setProducts(Array.isArray(productData) ? productData : []);
          setOrgs(Array.isArray(orgData) ? orgData : []);
        }
      } catch (e) {
        if (mounted) setError(e.message || "Failed to load quality control data.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const productName = (id) => products.find((p) => p.id === id)?.productName || id || "—";
  const productScore = (id) => {
    const p = products.find((pr) => pr.id === id);
    return typeof p?.aiScore === "number" ? Math.round(p.aiScore) : null;
  };
  const orgName = (id) => orgs.find((o) => o.id === id)?.name || id || "—";

  const visibleProductions = productions.filter((p) =>
    !selectedOrgId || p.organizationId === selectedOrgId
  );

  const activeInspections = visibleProductions.filter((p) => p.status === "IN_PROGRESS");
  const completedInspections = visibleProductions.filter((p) => p.status === "COMPLETED");

  const qualityProducts = products.filter((p) => {
    if (!selectedOrgId || p.organizationId === selectedOrgId) {
      if (qualityFilter === "ALL") return true;
      const s = typeof p.aiScore === "number" ? p.aiScore : -1;
      if (qualityFilter === "CERTIFIED") return s >= 80;
      if (qualityFilter === "REVIEW") return s >= 40 && s < 80;
      if (qualityFilter === "ISSUES") return s < 40;
    }
    return false;
  });

  const avgScore = products.length
    ? Math.round(products.reduce((s, p) => s + (typeof p.aiScore === "number" ? p.aiScore : 0), 0) / products.length)
    : 0;
  const certifiedCount = products.filter((p) => (p.aiScore ?? 0) >= 80).length;
  const issuesCount = products.filter((p) => typeof p.aiScore === "number" && p.aiScore < 40).length;
  const passRate = products.length ? Math.round((certifiedCount / products.length) * 100) : 0;

  const handleStepAction = async (prodId, stepIndex, action) => {
    setActionLoading(`${prodId}-${stepIndex}-${action}`);
    try {
      const fn = action === "start" ? startProductionStep : completeProductionStep;
      const res = await fn(prodId, stepIndex);
      const updated = res?.data ?? res;
      setProductions((prev) => prev.map((p) => (p.id === prodId ? { ...p, ...updated } : p)));
    } catch (e) {
      alert(e.message || "Failed to update step.");
    } finally {
      setActionLoading("");
    }
  };

  const handleStatusChange = async (prodId, newStatus) => {
    setConfirm(null);
    setActionLoading(prodId);
    try {
      const res = await updateProductionStatus(prodId, { status: newStatus });
      const updated = res?.data ?? res;
      setProductions((prev) => prev.map((p) => (p.id === prodId ? { ...p, ...updated, status: newStatus } : p)));
    } catch (e) {
      alert(e.message || "Failed to update production status.");
    } finally {
      setActionLoading("");
    }
  };

  const TABS = [
    { key: "inspections", label: "Active Inspections", count: activeInspections.length },
    { key: "products", label: "Product Quality", count: products.length },
    { key: "summary", label: "Summary", count: null },
  ];

  const QUALITY_FILTERS = [
    { key: "ALL", label: "All" },
    { key: "CERTIFIED", label: "Certified ≥80" },
    { key: "REVIEW", label: "In Review 40–79" },
    { key: "ISSUES", label: "Issues <40" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Manufacturing</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Quality Control</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Inspect production runs, validate product quality, and manage certifications.</p>
          </div>
          <OrgSelector value={selectedOrgId} onChange={setSelectedOrgId} />
        </div>

        {error && <div className="rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-400 font-medium">{error}</div>}

        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Active Inspections", value: activeInspections.length, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
            { label: "Certified Products", value: certifiedCount, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
            { label: "Quality Issues", value: issuesCount, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10" },
            { label: "Avg. AI Score", value: `${avgScore}`, color: "text-brand-600 dark:text-brand-400", bg: "bg-brand-50 dark:bg-brand-500/10" },
          ].map((k) => (
            <article key={k.label} className={`glass-card p-5 ${k.bg} border-0`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{k.label}</p>
              <p className={`mt-2 text-3xl font-extrabold ${k.color}`}>{k.value}</p>
            </article>
          ))}
        </div>

        
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activeTab === tab.key
                    ? "bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300"
                    : "bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading quality data...</p>
          </div>
        ) : (
          <>
            
            {activeTab === "inspections" && (
              <div className="space-y-4">
                {activeInspections.length === 0 ? (
                  <div className="glass-card py-16 text-center">
                    <svg className="mx-auto w-10 h-10 text-slate-200 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No active inspections.</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Start a production run from the Production page to begin inspection.</p>
                  </div>
                ) : (
                  activeInspections.map((prod) => {
                    const score = productScore(prod.productId);
                    const steps = Array.isArray(prod.steps) ? prod.steps : [];
                    const completedSteps = steps.filter((s) => s.status === "COMPLETED").length;
                    const totalSteps = steps.length;
                    const pct = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0;
                    return (
                      <article key={prod.id} className="glass-card p-6 space-y-5">
                        
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider status-blue">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                In Progress
                              </span>
                              {score !== null && (
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${score >= 80 ? "status-emerald" : score >= 40 ? "status-amber" : "status-red"}`}>
                                  AI Score: {score}
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{productName(prod.productId)}</h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{orgName(prod.organizationId)} · Qty {prod.quantity}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={!!actionLoading}
                              onClick={() => setConfirm({ prodId: prod.id, action: "COMPLETED", label: "Approve & Complete", msg: `Mark "${productName(prod.productId)}" as completed?`, cls: "bg-emerald-600 hover:bg-emerald-700" })}
                              className="rounded-full px-3 py-1.5 text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/25 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={!!actionLoading}
                              onClick={() => setConfirm({ prodId: prod.id, action: "CANCELLED", label: "Reject", msg: `Reject and cancel "${productName(prod.productId)}"?`, cls: "bg-rose-600 hover:bg-rose-700" })}
                              className="rounded-full px-3 py-1.5 text-xs font-semibold bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-500/25 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </div>

                        
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Overall Progress</span>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{completedSteps}/{totalSteps} steps · {pct}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        
                        {steps.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Production Steps</p>
                            <div className="space-y-2">
                              {steps.map((step, idx) => {
                                const ss = STEP_STYLE[step.status] || STEP_STYLE.PENDING;
                                const startKey = `${prod.id}-${idx}-start`;
                                const completeKey = `${prod.id}-${idx}-complete`;
                                return (
                                  <div key={idx} className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/30 px-4 py-3">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${ss.dot}`} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{step.stepName}</p>
                                      {step.description && <p className="text-xs text-slate-400 truncate">{step.description}</p>}
                                    </div>
                                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase shrink-0 ${ss.bg}`}>{ss.label}</span>
                                    <div className="flex gap-1.5 shrink-0">
                                      {step.status === "PENDING" && (
                                        <button
                                          type="button"
                                          disabled={actionLoading === startKey}
                                          onClick={() => handleStepAction(prod.id, idx, "start")}
                                          className="rounded-lg px-2.5 py-1 text-[10px] font-bold bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-500/25 transition-colors disabled:opacity-50"
                                        >
                                          {actionLoading === startKey ? "..." : "Start"}
                                        </button>
                                      )}
                                      {step.status === "IN_PROGRESS" && (
                                        <button
                                          type="button"
                                          disabled={actionLoading === completeKey}
                                          onClick={() => handleStepAction(prod.id, idx, "complete")}
                                          className="rounded-lg px-2.5 py-1 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                                        >
                                          {actionLoading === completeKey ? "..." : "Complete"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            )}

            
            {activeTab === "products" && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {QUALITY_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setQualityFilter(f.key)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                        qualityFilter === f.key
                          ? "bg-brand-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {qualityProducts.length === 0 ? (
                  <div className="glass-card py-16 text-center">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No products match this filter.</p>
                  </div>
                ) : (
                  <div className="glass-card overflow-hidden">
                    <table className="min-w-full text-left">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-[0.18em] text-slate-400 border-b border-slate-100 dark:border-white/[0.06]">
                          <th className="px-6 py-4 font-bold">Product</th>
                          <th className="px-6 py-4 font-bold">AI Quality Score</th>
                          <th className="px-6 py-4 font-bold">Variant</th>
                          <th className="px-6 py-4 font-bold">Materials</th>
                          <th className="px-6 py-4 font-bold">Missing Fields</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                        {qualityProducts.map((p) => {
                          const score = typeof p.aiScore === "number" ? Math.round(p.aiScore) : null;
                          const missing = Array.isArray(p.aiMissingFields) ? p.aiMissingFields.length : 0;
                          const materials = Array.isArray(p.materialsComposition) ? p.materialsComposition.map(m => m.materialName).join(", ") : null;
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="px-6 py-4">
                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{p.productName || "—"}</p>
                                <p className="text-xs text-slate-400 font-mono">{p.id}</p>
                              </td>
                              <td className="px-6 py-4 min-w-[200px]">
                                {score !== null ? (
                                  <ScoreBar score={score} />
                                ) : (
                                  <span className="text-xs text-slate-400">Not scored</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold status-slate">
                                  {p.variantName || "—"}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{materials || "—"}</td>
                              <td className="px-6 py-4">
                                {missing > 0 ? (
                                  <span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold status-amber">{missing} missing</span>
                                ) : (
                                  <span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold status-emerald">Complete</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            
            {activeTab === "summary" && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Total Inspections", value: visibleProductions.length, sub: "all time" },
                    { label: "Completed", value: completedInspections.length, sub: `${visibleProductions.length ? Math.round((completedInspections.length / visibleProductions.length) * 100) : 0}% completion rate` },
                    { label: "Pass Rate", value: `${passRate}%`, sub: `${certifiedCount} certified products` },
                    { label: "Avg. AI Score", value: avgScore, sub: "across all products" },
                  ].map((k) => (
                    <article key={k.label} className="glass-card p-5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{k.label}</p>
                      <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-slate-100">{k.value}</p>
                      <p className="text-xs text-slate-400 mt-1">{k.sub}</p>
                    </article>
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <article className="glass-card p-6">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Production Status Breakdown</h3>
                    <div className="space-y-3">
                      {["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => {
                        const count = visibleProductions.filter((p) => p.status === s).length;
                        const pct = visibleProductions.length ? Math.round((count / visibleProductions.length) * 100) : 0;
                        const st = PROD_STATUS_STYLE[s];
                        return (
                          <div key={s}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{st.label}</span>
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                              <div
                                className={`h-full rounded-full transition-all ${s === "COMPLETED" ? "bg-emerald-500" : s === "IN_PROGRESS" ? "bg-blue-500" : s === "CANCELLED" ? "bg-red-400" : "bg-slate-400"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>

                  <article className="glass-card p-6">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Product Quality Distribution</h3>
                    <div className="space-y-3">
                      {[
                        { label: "Certified (≥80)", count: products.filter((p) => (p.aiScore ?? 0) >= 80).length, color: "bg-emerald-500" },
                        { label: "In Review (40–79)", count: products.filter((p) => { const s = p.aiScore ?? -1; return s >= 40 && s < 80; }).length, color: "bg-amber-500" },
                        { label: "Issues (<40)", count: products.filter((p) => typeof p.aiScore === "number" && p.aiScore < 40).length, color: "bg-red-500" },
                        { label: "Not Scored", count: products.filter((p) => typeof p.aiScore !== "number").length, color: "bg-slate-300 dark:bg-slate-500" },
                      ].map((item) => {
                        const pct = products.length ? Math.round((item.count / products.length) * 100) : 0;
                        return (
                          <div key={item.label}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{item.label}</span>
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                              <div className={`h-full rounded-full transition-all ${item.color}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {confirm && (
        <ConfirmModal
          title={confirm.label}
          message={confirm.msg}
          confirmLabel={confirm.label}
          confirmClass={confirm.cls}
          loading={actionLoading === confirm.prodId}
          onConfirm={() => handleStatusChange(confirm.prodId, confirm.action)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </DashboardLayout>
  );
}
