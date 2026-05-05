import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import OrgSelector from "../components/OrgSelector";
import {
  getAvailableProducts,
  getDashboardData,
  getEmployees,
  getMyOrganizations,
  getOrders,
  getProductions,
  getTasks,
} from "../services/authService";

// ─── Shared small components ───────────────────────────────────────────────

function KpiCard({ label, value, sub, tone = "brand", icon }) {
  const tones = {
    brand:   "from-brand-500 to-brand-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber:   "from-amber-400 to-amber-500",
    red:     "from-red-500 to-red-600",
    slate:   "from-slate-500 to-slate-600",
    purple:  "from-purple-500 to-purple-600",
  };
  return (
    <article className="glass-card p-5 flex items-center gap-4 group hover:shadow-premium-hover transition-all">
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br ${tones[tone]} shadow-lg`}>
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 group-hover:text-brand-500 transition-colors">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 mt-0.5 leading-none">{value ?? 0}</p>
        {sub && <p className="text-xs text-slate-400 mt-1 truncate">{sub}</p>}
      </div>
    </article>
  );
}

function BarRow({ label, value, max, color = "bg-brand-500", badge }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <div className="flex items-center gap-2">
          {badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}>{value}</span>}
          {!badge && <span className="text-xs font-bold text-slate-800">{value}</span>}
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SectionHeader({ title, badge, badgeTone, action }) {
  const tones = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber:   "bg-amber-100 text-amber-700",
    red:     "bg-red-100 text-red-600",
    slate:   "bg-slate-100 text-slate-600",
    blue:    "bg-blue-100 text-blue-700",
  };
  return (
    <div className="flex items-center justify-between mb-5">
      <h3 className="text-sm font-extrabold uppercase tracking-[0.15em] text-slate-500">{title}</h3>
      <div className="flex items-center gap-2">
        {badge && <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${tones[badgeTone] || tones.slate}`}>{badge}</span>}
        {action}
      </div>
    </div>
  );
}

const TASK_STYLE = {
  TODO:        { dot: "bg-slate-400",   bg: "bg-slate-100 text-slate-600",   label: "To Do",      bar: "bg-slate-400" },
  IN_PROGRESS: { dot: "bg-blue-500",    bg: "bg-blue-100 text-blue-700",     label: "In Progress", bar: "bg-blue-500" },
  REVIEW:      { dot: "bg-amber-500",   bg: "bg-amber-100 text-amber-700",   label: "Review",     bar: "bg-amber-500" },
  DONE:        { dot: "bg-emerald-500", bg: "bg-emerald-100 text-emerald-700", label: "Done",     bar: "bg-emerald-500" },
  CANCELLED:   { dot: "bg-red-400",     bg: "bg-red-100 text-red-600",       label: "Cancelled",  bar: "bg-red-400" },
};

// ─── Employee-only dashboard ───────────────────────────────────────────────

function EmployeeDashboard({ tasks, t }) {
  const open = tasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED");
  const done = tasks.filter((t) => t.status === "DONE");
  const overdue = open.filter((t) => t.dueDate && new Date(t.dueDate) < new Date());
  const avgProgress = open.length
    ? Math.round(open.reduce((s, t) => s + (t.progress ?? 0), 0) / open.length)
    : 0;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">{t("dashboard.myWorkspace", "My Workspace")}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{t("dashboard.taskOverview", "Task Overview")}</h1>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("dashboard.openTasks", "Open Tasks")} value={open.length} sub={t("dashboard.active", "Active")} tone="brand" icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        <KpiCard label={t("dashboard.completed", "Completed")} value={done.length} sub={t("dashboard.done", "Done")} tone="emerald" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        <KpiCard label={t("dashboard.overdue", "Overdue")} value={overdue.length} sub={overdue.length > 0 ? t("dashboard.needsAttention", "Needs attention") : t("dashboard.onTrack", "On track")} tone={overdue.length > 0 ? "red" : "slate"} icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        <KpiCard label={t("dashboard.avgProgress", "Avg. Progress")} value={`${avgProgress}%`} sub={t("dashboard.openTasks", "Open tasks")} tone="slate" icon="M13 10V3L4 14h7v7l9-11h-7z" />
      </section>

      <section className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-extrabold uppercase tracking-[0.15em] text-slate-500">{t("dashboard.myTasks", "My Tasks")}</h3>
          <Link to="/tasks" className="text-xs font-semibold text-brand-600 hover:text-brand-700">{t("common.viewAll", "View all →")}</Link>
        </div>
        {tasks.length === 0 ? (
          <div className="py-12 text-center"><p className="text-sm text-slate-500">{t("dashboard.noTasksAssigned", "No tasks assigned yet.")}</p></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.slice(0, 8).map((task) => {
              const st = TASK_STYLE[task.status] || TASK_STYLE.TODO;
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE" && task.status !== "CANCELLED";
              return (
                <div key={task.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{task.title}</p>
                    {task.dueDate && (
                      <p className={`text-xs mt-0.5 ${isOverdue ? "text-rose-500 font-semibold" : "text-slate-400"}`}>
                        {isOverdue ? `${t("dashboard.overdue", "Overdue")} · ` : `${t("dashboard.due", "Due")} `}
                        {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:flex items-center gap-1.5 w-24">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${task.progress ?? 0}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 w-6 text-right">{task.progress ?? 0}%</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${st.bg}`}>{st.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="glass-card p-6">
          <SectionHeader title={t("dashboard.statusBreakdown", "Status Breakdown")} />
          <div className="space-y-3">
            {["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"].map((s) => {
              const count = tasks.filter((t) => t.status === s).length;
              const pct = tasks.length ? Math.round((count / tasks.length) * 100) : 0;
              const st = TASK_STYLE[s];
              return (
                <div key={s}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-600">{st.label}</span>
                    <span className="text-xs font-bold text-slate-800">{count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                    <div className={`h-full rounded-full transition-all ${st.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
        <article className="glass-card p-6">
          <SectionHeader title={t("dashboard.quickActions", "Quick Actions")} />
          <div className="space-y-3">
            <Link to="/tasks" className="flex items-center gap-3 rounded-2xl bg-brand-50 border border-brand-100 px-4 py-3 hover:bg-brand-100 transition-colors">
              <svg className="w-5 h-5 text-brand-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              <span className="text-sm font-semibold text-brand-700">{t("dashboard.openTaskList", "Open task list")}</span>
            </Link>
            <Link to="/products" className="flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 hover:bg-slate-100 transition-colors">
              <svg className="w-5 h-5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" /></svg>
              <span className="text-sm font-semibold text-slate-700">{t("dashboard.browseProducts", "Browse products")}</span>
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}

// ─── Admin / SubAdmin combined dashboard ──────────────────────────────────

function AdminDashboard({ dashboard, productions, orders, tasks, employees, products, selectedOrgId, onOrgChange, t }) {
  // ── Computed metrics ────────────────────────────────────────────────────
  const filteredProds  = selectedOrgId ? productions.filter((p) => p.organizationId === selectedOrgId) : productions;
  const filteredOrders = selectedOrgId ? orders.filter((o) => o.organizationId === selectedOrgId) : orders;
  const filteredTasks  = selectedOrgId ? tasks.filter((t) => t.organizationId === selectedOrgId)  : tasks;
  const filteredEmps   = selectedOrgId ? employees.filter((e) => e.organizationId === selectedOrgId) : employees;

  // Production
  const prodByStatus = [
    { label: t("dashboard.planned", "Planned"),     value: filteredProds.filter((p) => p.status === "PLANNED").length,     color: "bg-slate-400",    badge: "bg-slate-100 text-slate-600" },
    { label: t("dashboard.inProgress", "In Progress"), value: filteredProds.filter((p) => p.status === "IN_PROGRESS").length,  color: "bg-blue-500",     badge: "bg-blue-100 text-blue-700" },
    { label: t("dashboard.completed", "Completed"),   value: filteredProds.filter((p) => p.status === "COMPLETED").length,    color: "bg-emerald-500",  badge: "bg-emerald-100 text-emerald-700" },
    { label: t("dashboard.cancelled", "Cancelled"),   value: filteredProds.filter((p) => p.status === "CANCELLED").length,    color: "bg-red-400",      badge: "bg-red-100 text-red-600" },
  ];
  const maxProd = Math.max(...prodByStatus.map((p) => p.value), 1);
  const prodCompletion = filteredProds.length
    ? Math.round((filteredProds.filter((p) => p.status === "COMPLETED").length / filteredProds.length) * 100)
    : 0;

  // Orders
  const orderByStatus = [
    { label: t("dashboard.pending", "Pending"),    value: filteredOrders.filter((o) => o.status === "PENDING").length,    color: "bg-amber-400",   badge: "bg-amber-100 text-amber-700" },
    { label: t("dashboard.confirmed", "Confirmed"),  value: filteredOrders.filter((o) => o.status === "CONFIRMED").length,  color: "bg-sky-500",     badge: "bg-sky-100 text-sky-700" },
    { label: t("dashboard.processing", "Processing"), value: filteredOrders.filter((o) => o.status === "PROCESSING").length, color: "bg-blue-500",    badge: "bg-blue-100 text-blue-700" },
    { label: t("dashboard.shipped", "Shipped"),    value: filteredOrders.filter((o) => o.status === "SHIPPED").length,    color: "bg-purple-500",  badge: "bg-purple-100 text-purple-700" },
    { label: t("dashboard.completed", "Completed"),  value: filteredOrders.filter((o) => o.status === "COMPLETED").length,  color: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
    { label: t("dashboard.cancelled", "Cancelled"),  value: filteredOrders.filter((o) => o.status === "CANCELLED").length,  color: "bg-red-400",     badge: "bg-red-100 text-red-600" },
  ];
  const maxOrder = Math.max(...orderByStatus.map((o) => o.value), 1);
  const orderFulfillment = filteredOrders.length
    ? Math.round((filteredOrders.filter((o) => ["COMPLETED", "SHIPPED"].includes(o.status)).length / filteredOrders.length) * 100)
    : 0;

  // Tasks
  const taskByStatus = [
    { label: t("tasks.todo", "To Do"),       value: filteredTasks.filter((t) => t.status === "TODO").length,        color: "bg-slate-400" },
    { label: t("dashboard.inProgress", "In Progress"), value: filteredTasks.filter((t) => t.status === "IN_PROGRESS").length, color: "bg-blue-500" },
    { label: t("dashboard.review", "Review"),      value: filteredTasks.filter((t) => t.status === "REVIEW").length,      color: "bg-amber-500" },
    { label: t("dashboard.done", "Done"),        value: filteredTasks.filter((t) => t.status === "DONE").length,        color: "bg-emerald-500" },
    { label: t("dashboard.cancelled", "Cancelled"),   value: filteredTasks.filter((t) => t.status === "CANCELLED").length,   color: "bg-red-400" },
  ];
  const taskPriorities = [
    { label: t("dashboard.urgent", "Urgent"), value: filteredTasks.filter((t) => t.priority === "URGENT").length, color: "bg-red-500" },
    { label: t("dashboard.high", "High"),   value: filteredTasks.filter((t) => t.priority === "HIGH").length,   color: "bg-orange-500" },
    { label: t("dashboard.medium", "Medium"), value: filteredTasks.filter((t) => t.priority === "MEDIUM").length, color: "bg-sky-500" },
    { label: t("dashboard.low", "Low"),    value: filteredTasks.filter((t) => t.priority === "LOW").length,    color: "bg-slate-400" },
  ];
  const maxTask  = Math.max(...taskByStatus.map((t) => t.value), 1);
  const maxPrior = Math.max(...taskPriorities.map((t) => t.value), 1);
  const overdueCount = filteredTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && !["DONE", "CANCELLED"].includes(t.status)).length;
  const taskCompletion = filteredTasks.length
    ? Math.round((filteredTasks.filter((t) => t.status === "DONE").length / filteredTasks.length) * 100)
    : 0;

  // Quality (from products AI scores)
  const certified   = products.filter((p) => typeof p.aiScore === "number" && p.aiScore >= 80).length;
  const inReview    = products.filter((p) => typeof p.aiScore === "number" && p.aiScore >= 40 && p.aiScore < 80).length;
  const hasIssues   = products.filter((p) => typeof p.aiScore === "number" && p.aiScore < 40).length;
  const activeInspections = filteredProds.filter((p) => p.status === "IN_PROGRESS").length;
  const qualityMax  = Math.max(certified, inReview, hasIssues, 1);

  // Employees
  const avgPerf = filteredEmps.length
    ? Math.round(filteredEmps.reduce((s, e) => s + (e.performanceScore ?? 0), 0) / filteredEmps.length)
    : 0;

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">{t("dashboard.operationsCenter", "Operations Center")}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{t("nav.dashboard")}</h1>
          <p className="mt-1 text-sm text-slate-400">{today}</p>
        </div>
        <div className="glass-card px-4 py-3 shrink-0">
          <OrgSelector value={selectedOrgId} onChange={onOrgChange} />
        </div>
      </section>

      {/* ── KPI Strip ──────────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label={t("nav.production")} value={filteredProds.length} sub={`${prodCompletion}% ${t("dashboard.completionRate", "completion rate")}`} tone="brand" icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        <KpiCard label={t("nav.orders")} value={filteredOrders.length} sub={`${orderFulfillment}% ${t("dashboard.fulfillment", "fulfillment")}`} tone="emerald" icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        <KpiCard label={t("dashboard.activeTasks", "Active Tasks")} value={filteredTasks.filter((t) => !["DONE","CANCELLED"].includes(t.status)).length} sub={overdueCount > 0 ? `${overdueCount} ${t("dashboard.overdue", "overdue")}` : t("dashboard.allOnTrack", "All on track")} tone={overdueCount > 0 ? "amber" : "slate"} icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        <KpiCard label={t("dashboard.stockAlerts", "Stock Alerts")} value={dashboard?.kpis?.lowStockItems ?? 0} sub={t("dashboard.lowThresholdItems", "Low threshold items")} tone={dashboard?.kpis?.lowStockItems > 0 ? "red" : "slate"} icon="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        <KpiCard label={t("nav.employees")} value={filteredEmps.length} sub={`${t("dashboard.avgPerformance", "Avg performance")} ${avgPerf}/100`} tone="slate" icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        <KpiCard label={t("dashboard.dppCompliance", "DPP Compliance")} value={`${dashboard?.dppComplianceScore ?? 0}%`} sub={t("dashboard.aiEvaluatedScore", "AI-evaluated score")} tone="purple" icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </section>

      {/* ── Production · Orders · Quality Control ──────────────────────── */}
      <section className="grid gap-6 xl:grid-cols-3">

        {/* Production */}
        <article className="glass-card p-6 space-y-4">
          <SectionHeader
            title={t("nav.production")}
            badge={`${prodCompletion}% ${t("dashboard.complete", "complete")}`}
            badgeTone={prodCompletion >= 70 ? "emerald" : "amber"}
            action={<Link to="/production" className="text-[10px] font-bold text-brand-500 hover:text-brand-600 uppercase tracking-wide">{t("common.viewAll", "View all →")}</Link>}
          />
          <div className="space-y-3">
            {prodByStatus.map((row) => (
              <BarRow key={row.label} label={row.label} value={row.value} max={maxProd} color={row.color} badge={row.badge} />
            ))}
          </div>
          {filteredProds.length === 0 && <p className="text-xs text-slate-400 text-center py-3">{t("dashboard.noProductionData", "No production data.")}</p>}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">{t("dashboard.bottleneck", "Bottleneck")}</p>
            <span className="text-xs font-bold text-amber-600">{dashboard?.bottleneck?.stage || t("dashboard.none", "None")} {dashboard?.bottleneck?.delayedCount ? `· ${dashboard.bottleneck.delayedCount} ${t("dashboard.delayed", "delayed")}` : ""}</span>
          </div>
        </article>

        {/* Orders */}
        <article className="glass-card p-6 space-y-4">
          <SectionHeader
            title={t("dashboard.orderPipeline", "Order Pipeline")}
            badge={`${orderFulfillment}% ${t("dashboard.fulfilled", "fulfilled")}`}
            badgeTone={orderFulfillment >= 60 ? "emerald" : "amber"}
            action={<Link to="/orders" className="text-[10px] font-bold text-brand-500 hover:text-brand-600 uppercase tracking-wide">{t("common.viewAll", "View all →")}</Link>}
          />
          <div className="space-y-3">
            {orderByStatus.map((row) => (
              <BarRow key={row.label} label={row.label} value={row.value} max={maxOrder} color={row.color} badge={row.badge} />
            ))}
          </div>
          {filteredOrders.length === 0 && <p className="text-xs text-slate-400 text-center py-3">{t("dashboard.noOrderData", "No order data.")}</p>}
        </article>

        {/* Quality Control */}
        <article className="glass-card p-6 space-y-4">
          <SectionHeader
            title={t("dashboard.qualityControl", "Quality Control")}
            badge={`${activeInspections} ${t("dashboard.active", "active")}`}
            badgeTone="blue"
            action={<Link to="/quality-control" className="text-[10px] font-bold text-brand-500 hover:text-brand-600 uppercase tracking-wide">{t("dashboard.manage", "Manage →")}</Link>}
          />

          {/* AI quality distribution */}
          <div className="space-y-3">
            <BarRow label={t("dashboard.certified", "Certified (≥80)")} value={certified} max={qualityMax} color="bg-emerald-500" badge="bg-emerald-100 text-emerald-700" />
            <BarRow label={t("dashboard.inReview", "In Review (40–79)")} value={inReview} max={qualityMax} color="bg-amber-500" badge="bg-amber-100 text-amber-700" />
            <BarRow label={t("dashboard.issues", "Issues (<40)")} value={hasIssues} max={qualityMax} color="bg-red-500" badge="bg-red-100 text-red-600" />
          </div>

          {/* Inspection status summary */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-center">
              <p className="text-xl font-extrabold text-blue-700">{activeInspections}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-blue-400 mt-0.5">{t("dashboard.inProgress", "In Progress")}</p>
            </div>
            <div className={`rounded-xl p-3 text-center border ${hasIssues > 0 ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}>
              <p className={`text-xl font-extrabold ${hasIssues > 0 ? "text-red-600" : "text-emerald-600"}`}>{hasIssues}</p>
              <p className={`text-[10px] font-bold uppercase tracking-wide mt-0.5 ${hasIssues > 0 ? "text-red-400" : "text-emerald-400"}`}>{t("dashboard.issues", "Issues")}</p>
            </div>
          </div>

          {/* Top risk products */}
          {(dashboard?.topRiskProducts || []).slice(0, 2).map((item) => (
            <div key={item.productId} className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 gap-2">
              <p className="text-xs font-semibold text-rose-800 truncate">{item.productName || item.productId}</p>
              <span className="text-[10px] font-bold bg-rose-200 text-rose-700 px-2 py-0.5 rounded-full shrink-0">{t("dashboard.risk", "Risk")} {item.riskScore}</span>
            </div>
          ))}
          {(dashboard?.topRiskProducts || []).length === 0 && products.length > 0 && (
            <p className="text-xs text-slate-400 text-center">{t("dashboard.noHighRiskProducts", "No high-risk products")}</p>
          )}
        </article>
      </section>

      {/* ── Tasks · Analytics ──────────────────────────────────────────── */}
      <section className="grid gap-6 xl:grid-cols-2">

        {/* Task completion */}
        <article className="glass-card p-6 space-y-4">
          <SectionHeader
            title={t("dashboard.taskCompletion", "Task Completion")}
            badge={overdueCount > 0 ? `${overdueCount} ${t("dashboard.overdue", "overdue")}` : `${taskCompletion}% ${t("dashboard.done", "done")}`}
            badgeTone={overdueCount > 0 ? "red" : "emerald"}
            action={<Link to="/tasks" className="text-[10px] font-bold text-brand-500 hover:text-brand-600 uppercase tracking-wide">{t("common.viewAll", "View all →")}</Link>}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("dashboard.byStatus", "By Status")}</p>
              {taskByStatus.map((row) => (
                <BarRow key={row.label} label={row.label} value={row.value} max={maxTask} color={row.color} />
              ))}
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("dashboard.byPriority", "By Priority")}</p>
              {taskPriorities.map((row) => (
                <BarRow key={row.label} label={row.label} value={row.value} max={maxPrior} color={row.color} />
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-xl font-extrabold text-slate-900">{filteredTasks.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">{t("dashboard.total", "Total")}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-center">
              <p className="text-xl font-extrabold text-emerald-700">{taskCompletion}%</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-400 mt-0.5">{t("dashboard.done", "Done")}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${overdueCount > 0 ? "bg-red-50" : "bg-slate-50"}`}>
              <p className={`text-xl font-extrabold ${overdueCount > 0 ? "text-red-600" : "text-slate-400"}`}>{overdueCount}</p>
              <p className={`text-[10px] font-bold uppercase tracking-wide mt-0.5 ${overdueCount > 0 ? "text-red-400" : "text-slate-400"}`}>{t("dashboard.overdue", "Overdue")}</p>
            </div>
          </div>
        </article>

        {/* Workforce + Org overview */}
        <article className="glass-card p-6 space-y-5">
          <SectionHeader title={t("dashboard.workforceScope", "Workforce & Scope")} />

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 border border-brand-100 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">{t("nav.employees")}</p>
              <p className="text-3xl font-extrabold text-brand-700 mt-1">{filteredEmps.length}</p>
              <p className="text-xs text-brand-500 mt-0.5">{t("dashboard.avgScore", "Avg score")} {avgPerf}/100</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("nav.products")}</p>
              <p className="text-3xl font-extrabold text-slate-800 mt-1">{products.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">{certified} {t("dashboard.certified", "certified")}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">{t("dashboard.organizationScope", "Organization Scope")}</p>
            <div className="flex flex-wrap gap-2">
              {(dashboard?.organizationScopes || []).length === 0 ? (
                <span className="text-xs text-slate-400">{t("dashboard.globalScope", "Global scope")}</span>
              ) : (
                dashboard.organizationScopes.map((org) => (
                  <span key={org.id} className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">{org.name}</span>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-extrabold text-slate-900">{dashboard?.kpis?.organizationsMain ?? 0}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">{t("dashboard.mainOrgs", "Main orgs")}</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900">{dashboard?.kpis?.organizationsSub ?? 0}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">{t("dashboard.subOrgs", "Sub orgs")}</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900">{dashboard?.kpis?.userCounts?.total ?? 0}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">{t("dashboard.users", "Users")}</p>
            </div>
          </div>
        </article>
      </section>

      {/* ── Live Feed · Priorities · Notifications ─────────────────────── */}
      <section className="grid gap-6 xl:grid-cols-3">

        {/* Live activity */}
        <article className="glass-card p-6">
          <SectionHeader title={t("dashboard.liveActivity", "Live Activity")} />
          <div className="space-y-3">
            {(dashboard?.liveActivity || []).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">{t("dashboard.noRecentActivity", "No recent activity.")}</p>
            ) : (
              dashboard.liveActivity.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.type}</p>
                    <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        {/* Today's priorities */}
        <article className="glass-card p-6">
          <SectionHeader title={t("dashboard.todaysPriorities", "Today's Priorities")} />
          <div className="space-y-3">
            {(dashboard?.todayPriorities || []).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">{t("dashboard.noPrioritiesToday", "No priorities today.")}</p>
            ) : (
              dashboard.todayPriorities.slice(0, 5).map((item, i) => {
                const isHigh = item.severity === "HIGH" || item.severity === "CRITICAL";
                return (
                  <div key={i} className={`rounded-xl border p-3 ${isHigh ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50"}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isHigh ? "bg-amber-200 text-amber-700" : "bg-slate-200 text-slate-600"}`}>
                        {item.severity || "INFO"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{item.action}</p>
                  </div>
                );
              })
            )}
          </div>
        </article>

        {/* Notifications */}
        <article className="glass-card p-6">
          <SectionHeader title={t("dashboard.notifications", "Notifications")} />
          <div className="space-y-3">
            {(dashboard?.notifications || []).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">{t("dashboard.noNotifications", "No notifications.")}</p>
            ) : (
              dashboard.notifications.slice(0, 5).map((item, i) => {
                const isCritical = item.severity === "CRITICAL";
                const isWarning  = item.severity === "WARNING";
                const style = isCritical
                  ? "border-red-200 bg-red-50"
                  : isWarning
                  ? "border-amber-200 bg-amber-50"
                  : "border-slate-100 bg-slate-50";
                const badge = isCritical
                  ? "bg-red-200 text-red-700"
                  : isWarning
                  ? "bg-amber-200 text-amber-700"
                  : "bg-slate-200 text-slate-600";
                return (
                  <div key={i} className={`rounded-xl border p-3 ${style}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badge}`}>{item.severity || "INFO"}</span>
                    </div>
                    <p className="text-xs text-slate-500">{item.message}</p>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </section>

    </div>
  );
}

// ─── Page shell ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t } = useTranslation();
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [dashboard, setDashboard]     = useState(null);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [productions, setProductions] = useState([]);
  const [orders, setOrders]           = useState([]);
  const [tasks, setTasks]             = useState([]);
  const [employees, setEmployees]     = useState([]);
  const [products, setProducts]       = useState([]);
  const [myTasks, setMyTasks]         = useState([]);

  const currentRole = (localStorage.getItem("userRole") || "").toUpperCase();
  const isEmployee  = currentRole === "EMPLOYEE";
  const isSubAdmin  = currentRole === "SUBADMIN";

  // Auto-scope subadmin to their first sub-org on mount
  useEffect(() => {
    if (!isSubAdmin) return;
    getMyOrganizations()
      .then((data) => {
        const orgs = Array.isArray(data) ? data : [];
        if (orgs.length > 0 && !selectedOrgId) {
          setSelectedOrgId(orgs[0].id);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        if (isEmployee) {
          const taskList = await getTasks();
          if (mounted) setMyTasks(Array.isArray(taskList) ? taskList : []);
          return;
        }
        const [dash, prods, ords, taskList, emps, productList] = await Promise.all([
          getDashboardData(selectedOrgId || undefined),
          getProductions(),
          getOrders(),
          getTasks(),
          getEmployees(),
          getAvailableProducts(),
        ]);
        if (mounted) {
          setDashboard(dash);
          setProductions(Array.isArray(prods) ? prods : []);
          setOrders(Array.isArray(ords) ? ords : []);
          setTasks(Array.isArray(taskList) ? taskList : []);
          setEmployees(Array.isArray(emps) ? emps : []);
          setProducts(Array.isArray(productList) ? productList : []);
        }
      } catch (e) {
        if (mounted) setError(e.message || t("dashboard.unableToLoad", "Unable to load dashboard."));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [selectedOrgId]); // eslint-disable-line

  const handleOrgChange = (id) => { setSelectedOrgId(id); };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">{t("common.loading")}</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            <p className="font-bold">{t("dashboard.unavailable", "Dashboard unavailable")}</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : isEmployee ? (
          <EmployeeDashboard tasks={myTasks} t={t} />
        ) : (
          <AdminDashboard
            dashboard={dashboard}
            productions={productions}
            orders={orders}
            tasks={tasks}
            employees={employees}
            products={products}
            selectedOrgId={selectedOrgId}
            onOrgChange={handleOrgChange}
            t={t}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
