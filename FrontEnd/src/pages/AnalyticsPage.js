import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import OrgSelector from "../components/OrgSelector";
import {
  getDashboardData,
  getEmployees,
  getMyOrganizations,
  getOrders,
  getProductions,
  getScansByOrg,
  getTasks,
} from "../services/authService";

function BarRow({ label, value, max, color = "bg-brand-500", suffix = "" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className="text-xs font-bold text-slate-900">{value}{suffix}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon, tone = "brand" }) {
  const tones = {
    brand: "bg-brand-50 text-brand-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    slate: "bg-slate-100 text-slate-500",
  };
  return (
    <article className="glass-card p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{value ?? 0}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </article>
  );
}

function SectionTitle({ children }) {
  return <h2 className="text-lg font-bold text-slate-900">{children}</h2>;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [, setOrgs] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [productions, setProductions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [scans, setScans] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const orgList = await getMyOrganizations();
        if (!mounted) return;
        setOrgs(orgList);

        const primaryOrgId = selectedOrgId || (orgList[0]?.id ?? "");
        const [dash, prods, ords, taskList, emps] = await Promise.all([
          getDashboardData(primaryOrgId || undefined),
          getProductions(),
          getOrders(),
          getTasks(),
          getEmployees(),
        ]);

        let scanList = [];
        if (primaryOrgId) {
          try { scanList = await getScansByOrg(primaryOrgId); } catch { /* no scans */ }
        }

        if (mounted) {
          setDashboard(dash);
          setProductions(Array.isArray(prods) ? prods : []);
          setOrders(Array.isArray(ords) ? ords : []);
          setTasks(Array.isArray(taskList) ? taskList : []);
          setEmployees(Array.isArray(emps) ? emps : []);
          setScans(Array.isArray(scanList) ? scanList : []);
        }
      } catch (e) {
        if (mounted) setError(e.message || "Failed to load analytics.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrgId]);

  // ── Computed metrics ──────────────────────────────────────────────────────

  const filteredProds = selectedOrgId ? productions.filter((p) => p.organizationId === selectedOrgId) : productions;
  const filteredOrders = selectedOrgId ? orders.filter((o) => o.organizationId === selectedOrgId) : orders;
  const filteredTasks = selectedOrgId ? tasks.filter((t) => t.organizationId === selectedOrgId) : tasks;
  const filteredEmps = selectedOrgId ? employees.filter((e) => e.organizationId === selectedOrgId) : employees;

  // Production
  const prodByStatus = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => ({
    label: s.replace("_", " "),
    value: filteredProds.filter((p) => p.status === s).length,
    color: s === "COMPLETED" ? "bg-emerald-500" : s === "IN_PROGRESS" ? "bg-blue-500" : s === "CANCELLED" ? "bg-red-400" : "bg-slate-400",
  }));
  const prodCompletionRate = filteredProds.length
    ? Math.round((filteredProds.filter((p) => p.status === "COMPLETED").length / filteredProds.length) * 100)
    : 0;

  // Orders
  const orderStatuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"];
  const orderByStatus = orderStatuses.map((s) => ({
    label: s,
    value: filteredOrders.filter((o) => o.status === s).length,
    color: s === "COMPLETED" ? "bg-emerald-500" : s === "SHIPPED" ? "bg-purple-500" : s === "PROCESSING" ? "bg-blue-500" : s === "CONFIRMED" ? "bg-sky-500" : s === "CANCELLED" ? "bg-red-400" : "bg-amber-400",
  }));
  const orderFulfillmentRate = filteredOrders.length
    ? Math.round((filteredOrders.filter((o) => o.status === "COMPLETED" || o.status === "SHIPPED").length / filteredOrders.length) * 100)
    : 0;

  // Tasks
  const taskStatuses = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"];
  const taskByStatus = taskStatuses.map((s) => ({
    label: s.replace("_", " "),
    value: filteredTasks.filter((t) => t.status === s).length,
    color: s === "DONE" ? "bg-emerald-500" : s === "IN_PROGRESS" ? "bg-blue-500" : s === "REVIEW" ? "bg-amber-500" : s === "CANCELLED" ? "bg-red-400" : "bg-slate-400",
  }));
  const taskPriorities = ["URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => ({
    label: p,
    value: filteredTasks.filter((t) => t.priority === p).length,
    color: p === "URGENT" ? "bg-red-500" : p === "HIGH" ? "bg-orange-500" : p === "MEDIUM" ? "bg-sky-500" : "bg-slate-400",
  }));
  const overdueCount = filteredTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE" && t.status !== "CANCELLED").length;
  const taskCompletionRate = filteredTasks.length
    ? Math.round((filteredTasks.filter((t) => t.status === "DONE").length / filteredTasks.length) * 100)
    : 0;

  // Employees
  const avgPerfScore = filteredEmps.length
    ? Math.round(filteredEmps.reduce((s, e) => s + (e.performanceScore ?? 0), 0) / filteredEmps.length)
    : 0;
  const topPerformers = [...filteredEmps]
    .filter((e) => e.performanceScore != null)
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .slice(0, 5);
  const deptBreakdown = filteredEmps.reduce((acc, e) => {
    const d = e.department || "Other";
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});

  // Scans
  const uniqueProducts = new Set(scans.map((s) => s.productId)).size;
  const uniqueUsers = new Set(scans.map((s) => s.scannedByUserEmail).filter(Boolean)).size;
  const scansWithLocation = scans.filter((s) => s.locationText || s.latitude).length;
  const recentScans = [...scans].sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt)).slice(0, 5);

  const maxProdCount = Math.max(...prodByStatus.map((p) => p.value), 1);
  const maxOrderCount = Math.max(...orderByStatus.map((o) => o.value), 1);
  const maxTaskCount = Math.max(...taskByStatus.map((t) => t.value), 1);
  const maxPriorityCount = Math.max(...taskPriorities.map((p) => p.value), 1);
  const maxDeptCount = Math.max(...Object.values(deptBreakdown), 1);

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Insights</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Analytics</h1>
            <p className="mt-1 text-sm text-slate-500">Production KPIs, order pipeline, workforce efficiency, and DPP scan metrics.</p>
          </div>
          <OrgSelector value={selectedOrgId} onChange={setSelectedOrgId} />
        </div>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* ── KPI Strip ──────────────────────────────────────────────── */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <KpiCard label="Total Productions" value={filteredProds.length} sub={`${prodCompletionRate}% completion rate`} tone="brand" icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              <KpiCard label="Total Orders" value={filteredOrders.length} sub={`${orderFulfillmentRate}% fulfillment rate`} tone="emerald" icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              <KpiCard label="Active Tasks" value={filteredTasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED").length} sub={`${overdueCount} overdue · ${taskCompletionRate}% done`} tone={overdueCount > 0 ? "amber" : "slate"} icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              <KpiCard label="Employees" value={filteredEmps.length} sub={`Avg performance: ${avgPerfScore}/100`} tone="slate" icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              <KpiCard label="DPP Scans" value={scans.length} sub={`${uniqueProducts} products · ${uniqueUsers} users`} tone="brand" icon="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              <KpiCard label="DPP Compliance" value={`${dashboard?.dppComplianceScore ?? 0}%`} sub="AI-evaluated score" tone="emerald" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </section>

            {/* ── Production & Orders ─────────────────────────────────────── */}
            <section className="grid gap-6 lg:grid-cols-2">
              <article className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <SectionTitle>Production Efficiency</SectionTitle>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${prodCompletionRate >= 70 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {prodCompletionRate}% complete
                  </span>
                </div>
                <div className="space-y-3">
                  {prodByStatus.map((row) => (
                    <BarRow key={row.label} label={row.label} value={row.value} max={maxProdCount} color={row.color} />
                  ))}
                </div>
                {filteredProds.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No production data.</p>}
              </article>

              <article className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <SectionTitle>Order Pipeline</SectionTitle>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${orderFulfillmentRate >= 60 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {orderFulfillmentRate}% fulfilled
                  </span>
                </div>
                <div className="space-y-3">
                  {orderByStatus.map((row) => (
                    <BarRow key={row.label} label={row.label} value={row.value} max={maxOrderCount} color={row.color} />
                  ))}
                </div>
                {filteredOrders.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No order data.</p>}
              </article>
            </section>

            {/* ── Tasks ──────────────────────────────────────────────────── */}
            <section className="grid gap-6 lg:grid-cols-2">
              <article className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <SectionTitle>Task Completion</SectionTitle>
                  {overdueCount > 0 && (
                    <span className="rounded-full px-3 py-1 text-xs font-bold bg-red-100 text-red-600">{overdueCount} overdue</span>
                  )}
                </div>
                <div className="space-y-3">
                  {taskByStatus.map((row) => (
                    <BarRow key={row.label} label={row.label} value={row.value} max={maxTaskCount} color={row.color} />
                  ))}
                </div>
                {filteredTasks.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No task data.</p>}
              </article>

              <article className="glass-card p-6 space-y-4">
                <SectionTitle>Task Priority Breakdown</SectionTitle>
                <div className="space-y-3">
                  {taskPriorities.map((row) => (
                    <BarRow key={row.label} label={row.label} value={row.value} max={maxPriorityCount} color={row.color} />
                  ))}
                </div>
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <p className="text-xl font-extrabold text-slate-900">{taskCompletionRate}%</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Completion Rate</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <p className={`text-xl font-extrabold ${overdueCount > 0 ? "text-red-600" : "text-emerald-600"}`}>{overdueCount}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Overdue</p>
                  </div>
                </div>
              </article>
            </section>

            {/* ── Workforce ──────────────────────────────────────────────── */}
            <section className="grid gap-6 lg:grid-cols-2">
              <article className="glass-card p-6 space-y-4">
                <SectionTitle>Top Performers</SectionTitle>
                {topPerformers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No employee data.</p>
                ) : (
                  <div className="space-y-3">
                    {topPerformers.map((emp, i) => (
                      <div key={emp.id} className="flex items-center gap-3">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-600"}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{emp.fullName}</p>
                          <p className="text-xs text-slate-400">{emp.department}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-brand-500" style={{ width: `${emp.performanceScore}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-700 w-8 text-right">{emp.performanceScore}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="glass-card p-6 space-y-4">
                <SectionTitle>Department Breakdown</SectionTitle>
                {Object.keys(deptBreakdown).length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No department data.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(deptBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([dept, count]) => (
                        <BarRow key={dept} label={dept} value={count} max={maxDeptCount} color="bg-brand-400" suffix=" staff" />
                      ))}
                  </div>
                )}
                <div className="pt-3 border-t border-slate-100 rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-xl font-extrabold text-slate-900">{avgPerfScore}<span className="text-sm font-medium text-slate-400">/100</span></p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Avg. Performance Score</p>
                </div>
              </article>
            </section>

            {/* ── DPP Scans ──────────────────────────────────────────────── */}
            <section className="grid gap-6 lg:grid-cols-2">
              <article className="glass-card p-6 space-y-4">
                <SectionTitle>DPP Scan Overview</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Total Scans", value: scans.length, color: "text-brand-600" },
                    { label: "Unique Products", value: uniqueProducts, color: "text-emerald-600" },
                    { label: "Unique Users", value: uniqueUsers, color: "text-sky-600" },
                    { label: "With Location", value: scansWithLocation, color: "text-amber-600" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-slate-50 p-3 text-center">
                      <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                {scans.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">Select an organization to see scan data.</p>
                )}
              </article>

              <article className="glass-card p-6 space-y-4">
                <SectionTitle>Recent Scan Activity</SectionTitle>
                {recentScans.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No scan events recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {recentScans.map((scan) => (
                      <div key={scan.id} className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                        <div className="h-7 w-7 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                          <svg className="w-3.5 h-3.5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{scan.productId}</p>
                          <p className="text-[10px] text-slate-400">{scan.locationText || scan.ip || "Unknown location"}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {scan.scannedAt ? new Date(scan.scannedAt).toLocaleDateString() : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
