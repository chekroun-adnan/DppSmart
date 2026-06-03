import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import OrgSelector from "../components/OrgSelector";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, LineChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Zap, ShieldCheck, Activity, Clock, BarChart2, Package,
  Users, Building2, Factory, Archive, ClipboardList, CheckSquare,
} from "lucide-react";
import {
  getAvailableProducts,
  getDashboardData,
  getEmployees,
  getMyOrganizations,
  getOrders,
  getProductions,
  getTasks,
} from "../services/authService";



const CHART_COLORS = {
  brand:   "#4d7aff",
  emerald: "#22C55E",
  amber:   "#F59E0B",
  red:     "#EF4444",
  purple:  "#8B5CF6",
  slate:   "#94A3B8",
  sky:     "#0EA5E9",
  orange:  "#F97316",
};

const PROD_COLORS = {
  PLANNED:     CHART_COLORS.slate,
  IN_PROGRESS: CHART_COLORS.brand,
  COMPLETED:   CHART_COLORS.emerald,
  CANCELLED:   CHART_COLORS.red,
};

const ORDER_COLORS = [
  CHART_COLORS.amber, CHART_COLORS.sky, CHART_COLORS.brand,
  CHART_COLORS.purple, CHART_COLORS.emerald, CHART_COLORS.red,
];

const TASK_STATUS_COLORS = [
  CHART_COLORS.slate, CHART_COLORS.brand, CHART_COLORS.amber,
  CHART_COLORS.emerald, CHART_COLORS.red,
];

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#1E293B",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    fontSize: 11,
    boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
    padding: "8px 12px",
  },
  labelStyle:  { color: "#F8FAFC", fontWeight: 700, marginBottom: 2 },
  itemStyle:   { color: "#94A3B8" },
  cursor:      { stroke: "rgba(148,163,184,0.15)", strokeWidth: 1 },
};



function makeSparkline(endValue = 0, variance = 0.28, points = 8) {
  const result = [];
  for (let i = 0; i < points; i++) {
    const factor = 0.6 + (i / (points - 1)) * 0.4;
    const noise  = 1 - variance / 2 + Math.random() * variance;
    result.push({ v: Math.max(0, Math.round(endValue * factor * noise)) });
  }
  result[points - 1] = { v: endValue };
  return result;
}

function delta(sparkline) {
  if (sparkline.length < 2) return 0;
  const last = sparkline[sparkline.length - 1].v;
  const prev = sparkline[sparkline.length - 2].v;
  if (prev === 0) return last > 0 ? 100 : 0;
  return Math.round(((last - prev) / prev) * 100);
}



function SectionHeader({ title, badge, badgeTone, action, icon: Icon }) {
  const tones = {
    emerald: "status-emerald", amber: "status-amber", red: "status-red",
    slate: "status-slate", blue: "status-blue", purple: "status-purple",
  };
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" strokeWidth={2} />}
        <h3 className="text-xs font-extrabold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${tones[badgeTone] || tones.slate}`}>
            {badge}
          </span>
        )}
        {action}
      </div>
    </div>
  );
}

function BarRow({ label, value, max, color = "bg-brand-500", badge }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</span>
        {badge
          ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}>{value}</span>
          : <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{value}</span>
        }
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}



function KpiCard({ label, value, sub, tone = "brand", icon: Icon, sparkline, isPercent }) {
  const iconBg = {
    brand:   "bg-gradient-to-br from-brand-500 to-brand-700",
    emerald: "bg-gradient-to-br from-emerald-400 to-emerald-600",
    amber:   "bg-gradient-to-br from-amber-400 to-amber-600",
    red:     "bg-gradient-to-br from-red-500 to-red-600",
    slate:   "bg-gradient-to-br from-slate-500 to-slate-600",
    purple:  "bg-gradient-to-br from-purple-500 to-purple-700",
  };
  const lineColor = {
    brand: CHART_COLORS.brand, emerald: CHART_COLORS.emerald,
    amber: CHART_COLORS.amber, red: CHART_COLORS.red,
    slate: CHART_COLORS.slate, purple: CHART_COLORS.purple,
  };

  const d  = delta(sparkline ?? []);
  const up = d >= 0;

  return (
    <article className="glass-card p-5 flex gap-4 group hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-300">
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${iconBg[tone]} shadow-lg`}>
        {Icon && <Icon className="w-5 h-5 text-white" strokeWidth={2} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 group-hover:text-brand-500 transition-colors">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 leading-none">{value ?? 0}</p>
        {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">{sub}</p>}
        {sparkline && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-12 min-h-[48px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <LineChart data={sparkline}>
                  <Line type="monotone" dataKey="v" stroke={lineColor[tone]} strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className={`flex items-center gap-0.5 text-[10px] font-bold shrink-0 ${up ? "text-emerald-500" : "text-red-400"}`}>
              {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(d)}%
            </div>
          </div>
        )}
      </div>
    </article>
  );
}



function ProductionTimeline({ productions, products, t }) {
  const recent = [...productions]
    .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))
    .slice(0, 6);

  const statusDot = {
    PLANNED:     "bg-slate-400",
    IN_PROGRESS: "bg-blue-500 ring-4 ring-blue-500/20",
    COMPLETED:   "bg-emerald-500",
    CANCELLED:   "bg-red-400",
  };
  const statusBadge = {
    PLANNED:     "status-slate",
    IN_PROGRESS: "status-blue",
    COMPLETED:   "status-emerald",
    CANCELLED:   "status-red",
  };

  if (recent.length === 0) return null;

  return (
    <article className="glass-card p-6">
      <SectionHeader
        title={t("dashboard.productionTimeline", "Production Timeline")}
        icon={Activity}
        action={<Link to="/production" className="text-[10px] font-bold text-brand-500 hover:text-brand-600 uppercase tracking-wide">{t("common.viewAll", "View all →")}</Link>}
      />
      <div className="relative">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200 dark:bg-white/[0.07]" />
        <div className="space-y-4 pl-6">
          {recent.map((prod) => {
            const pName = products.find((p) => p.id === prod.productId)?.productName || prod.productId || "—";
            const steps = Array.isArray(prod.steps) ? prod.steps : [];
            const done  = steps.filter((s) => s.completed).length;
            const pct   = steps.length ? Math.round((done / steps.length) * 100) : 0;
            return (
              <div key={prod.id} className="relative flex items-start gap-4">
                <div className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 shrink-0 ${statusDot[prod.status] || "bg-slate-300"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{pName}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusBadge[prod.status] || "status-slate"}`}>
                        {prod.status?.replace("_", " ")}
                      </span>
                    </div>
                    {prod.createdAt && (
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(prod.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                  {steps.length > 0 && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1 rounded-full bg-slate-100 dark:bg-slate-700">
                        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{pct}%</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}



function AIInsightsCard({ dashboard, t }) {
  const notifications = dashboard?.notifications || [];
  const priorities    = dashboard?.todayPriorities || [];

  const allAlerts = [
    ...notifications.map((n) => ({ ...n, _type: "notif" })),
    ...priorities.map((p)   => ({ ...p, _type: "prio" })),
  ].slice(0, 6);

  const getIcon = (severity) => {
    if (severity === "CRITICAL" || severity === "HIGH") return <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-500" strokeWidth={2} />;
    if (severity === "WARNING")  return <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" strokeWidth={2} />;
    return <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-brand-500" strokeWidth={2} />;
  };

  const getBorderColor = (severity) => {
    if (severity === "CRITICAL" || severity === "HIGH") return "border-l-red-400";
    if (severity === "WARNING") return "border-l-amber-400";
    return "border-l-brand-400";
  };

  return (
    <article className="glass-card p-6">
      <SectionHeader
        title="AI Insights & Alerts"
        icon={Zap}
        badge={allAlerts.filter((a) => a.severity === "CRITICAL" || a.severity === "HIGH").length > 0
          ? `${allAlerts.filter((a) => a.severity === "CRITICAL" || a.severity === "HIGH").length} critical`
          : "All clear"}
        badgeTone={allAlerts.some((a) => a.severity === "CRITICAL" || a.severity === "HIGH") ? "red" : "emerald"}
      />
      {allAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <ShieldCheck className="w-8 h-8 text-emerald-400" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">All systems nominal</p>
          <p className="text-xs text-slate-400">No alerts detected</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allAlerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-xl border-l-2 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-white/[0.05] px-3 py-2.5 ${getBorderColor(alert.severity)}`}
            >
              {getIcon(alert.severity)}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{alert.title}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{alert.message || alert.action || alert.description}</p>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                alert.severity === "CRITICAL" || alert.severity === "HIGH" ? "status-red"
                : alert.severity === "WARNING" ? "status-amber"
                : "status-slate"
              }`}>
                {alert.severity || "INFO"}
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}



function LiveActivityCard({ dashboard, t }) {
  const activity = dashboard?.liveActivity || [];
  return (
    <article className="glass-card p-6">
      <SectionHeader
        title={t("dashboard.liveActivity", "Live Activity")}
        icon={Activity}
        badge={activity.length > 0 ? "Live" : undefined}
        badgeTone="blue"
      />
      {activity.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
          {t("dashboard.noRecentActivity", "No recent activity.")}
        </p>
      ) : (
        <div className="space-y-2">
          {activity.slice(0, 5).map((item, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-white/[0.05] border-l-2 border-l-brand-400 px-3 py-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0 animate-pulse" />
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{item.type}</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">{item.title}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}



const TASK_STYLE = {
  TODO:        { dot: "bg-slate-400",   bg: "status-slate",   label: "To Do",       bar: "bg-slate-400",   color: CHART_COLORS.slate },
  IN_PROGRESS: { dot: "bg-blue-500",    bg: "status-blue",    label: "In Progress", bar: "bg-blue-500",    color: CHART_COLORS.brand },
  REVIEW:      { dot: "bg-amber-500",   bg: "status-amber",   label: "Review",      bar: "bg-amber-500",   color: CHART_COLORS.amber },
  DONE:        { dot: "bg-emerald-500", bg: "status-emerald", label: "Done",        bar: "bg-emerald-500", color: CHART_COLORS.emerald },
  CANCELLED:   { dot: "bg-red-400",     bg: "status-red",     label: "Cancelled",   bar: "bg-red-400",     color: CHART_COLORS.red },
};



function EmployeeDashboard({ tasks, t }) {
  const open     = tasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED");
  const done     = tasks.filter((t) => t.status === "DONE");
  const overdue  = open.filter((t) => t.dueDate && new Date(t.dueDate) < new Date());
  const avgProgress = open.length
    ? Math.round(open.reduce((s, t) => s + (t.progress ?? 0), 0) / open.length)
    : 0;

  const openSpark    = makeSparkline(open.length);
  const doneSpark    = makeSparkline(done.length);
  const overdueSpark = makeSparkline(overdue.length, 0.5);
  const progSpark    = makeSparkline(avgProgress, 0.1);

  const taskDonutData = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"]
    .map((s) => ({ name: TASK_STYLE[s].label, value: tasks.filter((t) => t.status === s).length, fill: TASK_STYLE[s].color }))
    .filter((d) => d.value > 0);

  return (
    <div className="space-y-8 animate-fade-in">
      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">{t("dashboard.myWorkspace", "My Workspace")}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{t("dashboard.taskOverview", "Task Overview")}</h1>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        <KpiCard label={t("dashboard.openTasks", "Open Tasks")}   value={open.length}    sub={t("dashboard.active", "Active")}                tone="brand"   icon={CheckSquare} sparkline={openSpark} />
        <KpiCard label={t("dashboard.completed", "Completed")}     value={done.length}    sub={t("dashboard.done", "Done")}                    tone="emerald" icon={CheckCircle2} sparkline={doneSpark} />
        <KpiCard label={t("dashboard.overdue", "Overdue")}         value={overdue.length} sub={overdue.length > 0 ? "Needs attention" : "On track"} tone={overdue.length > 0 ? "red" : "slate"} icon={Clock} sparkline={overdueSpark} />
        <KpiCard label={t("dashboard.avgProgress", "Avg Progress")} value={`${avgProgress}%`} sub="Open tasks" tone="slate" icon={BarChart2}  sparkline={progSpark} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        
        <article className="glass-card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{t("dashboard.myTasks", "My Tasks")}</h3>
            <Link to="/tasks" className="text-xs font-semibold text-brand-600 hover:text-brand-700">{t("common.viewAll", "View all →")}</Link>
          </div>
          {tasks.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("dashboard.noTasksAssigned", "No tasks assigned yet.")}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
              {tasks.slice(0, 8).map((task) => {
                const st = TASK_STYLE[task.status] || TASK_STYLE.TODO;
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE" && task.status !== "CANCELLED";
                return (
                  <div key={task.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{task.title}</p>
                      {task.dueDate && (
                        <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${isOverdue ? "text-rose-500 font-semibold" : "text-slate-400 dark:text-slate-500"}`}>
                          {isOverdue ? <AlertTriangle className="w-3 h-3" strokeWidth={2} /> : <Clock className="w-3 h-3" strokeWidth={1.75} />}
                          {isOverdue ? "Overdue · " : "Due "}
                          {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:flex items-center gap-1.5 w-20">
                        <div className="flex-1 h-1 rounded-full bg-slate-100 dark:bg-slate-700">
                          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${task.progress ?? 0}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 w-5 text-right">{task.progress ?? 0}%</span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${st.bg}`}>{st.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        
        <article className="glass-card p-6 flex flex-col">
          <SectionHeader title={t("dashboard.statusBreakdown", "Status Breakdown")} />
          {taskDonutData.length > 0 ? (
            <>
              <div className="flex justify-center my-2" style={{ minHeight: 160 }}>
                <ResponsiveContainer width={160} height={160} minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie data={taskDonutData} cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={2} dataKey="value" strokeWidth={0}>
                      {taskDonutData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {taskDonutData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
                      <span className="text-slate-600 dark:text-slate-400">{d.name}</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-slate-400">No task data.</p>
            </div>
          )}
        </article>
      </section>

      
      <section>
        <div className="flex gap-3 flex-wrap">
          <Link to="/tasks" className="flex items-center gap-2.5 rounded-2xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/25 px-5 py-3 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors">
            <CheckSquare className="w-4 h-4 text-brand-600 dark:text-brand-400" strokeWidth={2} />
            <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">{t("dashboard.openTaskList", "Open task list")}</span>
          </Link>
          <Link to="/products" className="flex items-center gap-2.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] px-5 py-3 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors">
            <Package className="w-4 h-4 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("dashboard.browseProducts", "Browse products")}</span>
          </Link>
        </div>
      </section>
    </div>
  );
}



function AdminDashboard({ dashboard, productions, orders, tasks, employees, products, selectedOrgId, onOrgChange, t }) {
  const filteredProds  = selectedOrgId ? productions.filter((p) => p.organizationId === selectedOrgId) : productions;
  const filteredOrders = selectedOrgId ? orders.filter((o) => o.organizationId === selectedOrgId) : orders;
  const filteredTasks  = selectedOrgId ? tasks.filter((t) => t.organizationId === selectedOrgId)  : tasks;
  const filteredEmps   = selectedOrgId ? employees.filter((e) => e.organizationId === selectedOrgId) : employees;

  
  const apiProdsByStatus = dashboard?.kpis?.productionsByStatus || {};
  const PROD_STATUS_META = {
    PLANNED:     { color: "bg-slate-400", badge: "status-slate",   fill: PROD_COLORS.PLANNED,     label: t("dashboard.planned","Planned") },
    IN_PROGRESS: { color: "bg-blue-500",  badge: "status-blue",    fill: PROD_COLORS.IN_PROGRESS,  label: t("dashboard.inProgress","In Progress") },
    COMPLETED:   { color: "bg-emerald-500",badge:"status-emerald", fill: PROD_COLORS.COMPLETED,    label: t("dashboard.completed","Completed") },
    CANCELLED:   { color: "bg-red-400",   badge: "status-red",     fill: PROD_COLORS.CANCELLED,    label: t("dashboard.cancelled","Cancelled") },
  };
  const prodByStatus = Object.keys(apiProdsByStatus).length > 0
    ? Object.entries(apiProdsByStatus).map(([status, count]) => ({
        label: (PROD_STATUS_META[status] || {}).label || status,
        value: count,
        color: (PROD_STATUS_META[status] || {}).color || "bg-slate-400",
        badge: (PROD_STATUS_META[status] || {}).badge || "status-slate",
        fill:  (PROD_STATUS_META[status] || {}).fill  || PROD_COLORS.PLANNED,
      }))
    : [
        { label: t("dashboard.planned","Planned"),     value: filteredProds.filter((p) => p.status === "PLANNED").length,     color: "bg-slate-400", badge: "status-slate",   fill: PROD_COLORS.PLANNED },
        { label: t("dashboard.inProgress","In Progress"),value: filteredProds.filter((p) => p.status === "IN_PROGRESS").length, color: "bg-blue-500",  badge: "status-blue",    fill: PROD_COLORS.IN_PROGRESS },
        { label: t("dashboard.completed","Completed"), value: filteredProds.filter((p) => p.status === "COMPLETED").length,   color: "bg-emerald-500",badge:"status-emerald",  fill: PROD_COLORS.COMPLETED },
        { label: t("dashboard.cancelled","Cancelled"), value: filteredProds.filter((p) => p.status === "CANCELLED").length,   color: "bg-red-400",   badge: "status-red",     fill: PROD_COLORS.CANCELLED },
      ];
  const maxProd = Math.max(...prodByStatus.map((p) => p.value), 1);
  const prodCompletion = filteredProds.length
    ? Math.round((filteredProds.filter((p) => p.status === "COMPLETED").length / filteredProds.length) * 100)
    : 0;

  
  const ORDER_STATUS_COLORS = {
    PENDING_REVIEW:                 { color: "bg-amber-400",  label: "Pending Review" },
    READY_FOR_CONFIRMATION:         { color: "bg-sky-400",    label: "Ready for Conf." },
    IN_PRODUCTION:                  { color: "bg-blue-500",   label: "In Production" },
    DELIVERED:                      { color: "bg-slate-400",  label: "Delivered" },
    BLOCKED_INSUFFICIENT_STOCK:     { color: "bg-red-500",    label: "Blocked (Stock)" },
    BLOCKED_INSUFFICIENT_MATERIALS: { color: "bg-red-500",    label: "Blocked (Mat.)" },
    BLOCKED_NO_BOM:                 { color: "bg-red-400",    label: "Blocked (BOM)" },
    CONFIRMED:                      { color: "bg-emerald-500",label: "Confirmed" },
    DATE_CHANGE_REQUESTED:          { color: "bg-sky-500",    label: "Date Change" },
    READY:                          { color: "bg-emerald-400",label: "Ready" },
    CANCELLED:                      { color: "bg-slate-400",  label: "Cancelled" },
    REJECTED:                       { color: "bg-rose-400",   label: "Rejected" },
  };
  const apiOrdersByStatus = dashboard?.kpis?.ordersByStatus || {};
  const orderByStatus = Object.keys(apiOrdersByStatus).length > 0
    ? Object.entries(apiOrdersByStatus).map(([status, count]) => ({
        label: (ORDER_STATUS_COLORS[status] || {}).label || status,
        value: count,
        color: (ORDER_STATUS_COLORS[status] || {}).color || "bg-slate-400",
      }))
    : [
        { label: "Pending Review",  value: filteredOrders.filter((o) => ["PENDING_REVIEW","READY_FOR_CONFIRMATION"].includes(o.status)).length, color: "bg-amber-400" },
        { label: "Confirmed",       value: filteredOrders.filter((o) => o.status === "CONFIRMED").length, color: "bg-emerald-500" },
        { label: "In Production",   value: filteredOrders.filter((o) => o.status === "IN_PRODUCTION").length, color: "bg-blue-500" },
        { label: "Ready",           value: filteredOrders.filter((o) => o.status === "READY").length, color: "bg-emerald-400" },
        { label: "Delivered",       value: filteredOrders.filter((o) => o.status === "DELIVERED").length, color: "bg-slate-400" },
        { label: "Cancelled",       value: filteredOrders.filter((o) => o.status === "CANCELLED").length, color: "bg-red-400" },
      ];
  const maxOrder = Math.max(...orderByStatus.map((o) => o.value), 1);
  const orderFulfillment = filteredOrders.length
    ? Math.round((filteredOrders.filter((o) => ["DELIVERED","READY"].includes(o.status)).length / filteredOrders.length) * 100)
    : 0;

  
  const taskByStatus = [
    { label: t("tasks.todo","To Do"),                 value: filteredTasks.filter((t) => t.status === "TODO").length,        color: "bg-slate-400" },
    { label: t("dashboard.inProgress","In Progress"),  value: filteredTasks.filter((t) => t.status === "IN_PROGRESS").length, color: "bg-blue-500" },
    { label: t("dashboard.review","Review"),            value: filteredTasks.filter((t) => t.status === "REVIEW").length,     color: "bg-amber-500" },
    { label: t("dashboard.done","Done"),                value: filteredTasks.filter((t) => t.status === "DONE").length,       color: "bg-emerald-500" },
    { label: t("dashboard.cancelled","Cancelled"),      value: filteredTasks.filter((t) => t.status === "CANCELLED").length,  color: "bg-red-400" },
  ];
  const taskPriorities = [
    { label: t("dashboard.urgent","Urgent"), value: filteredTasks.filter((t) => t.priority === "URGENT").length, color: "bg-red-500" },
    { label: t("dashboard.high","High"),     value: filteredTasks.filter((t) => t.priority === "HIGH").length,   color: "bg-orange-500" },
    { label: t("dashboard.medium","Medium"), value: filteredTasks.filter((t) => t.priority === "MEDIUM").length, color: "bg-sky-500" },
    { label: t("dashboard.low","Low"),       value: filteredTasks.filter((t) => t.priority === "LOW").length,    color: "bg-slate-400" },
  ];
  const maxTask  = Math.max(...taskByStatus.map((t) => t.value), 1);
  const maxPrior = Math.max(...taskPriorities.map((t) => t.value), 1);
  const overdueCount = filteredTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && !["DONE","CANCELLED"].includes(t.status)
  ).length;
  const taskCompletion = filteredTasks.length
    ? Math.round((filteredTasks.filter((t) => t.status === "DONE").length / filteredTasks.length) * 100)
    : 0;

  
  const certified  = products.filter((p) => typeof p.aiScore === "number" && p.aiScore >= 80).length;
  const inReview   = products.filter((p) => typeof p.aiScore === "number" && p.aiScore >= 40 && p.aiScore < 80).length;
  const hasIssues  = products.filter((p) => typeof p.aiScore === "number" && p.aiScore < 40).length;
  const activeInspections = filteredProds.filter((p) => p.status === "IN_PROGRESS").length;
  const qualityMax = Math.max(certified, inReview, hasIssues, 1);

  
  const avgPerf = filteredEmps.length
    ? Math.round(filteredEmps.reduce((s, e) => s + (e.performanceScore ?? 0), 0) / filteredEmps.length)
    : 0;

  
  const prodSpark      = makeSparkline(filteredProds.length);
  const orderSpark     = makeSparkline(filteredOrders.length);
  const activeTasks    = filteredTasks.filter((t) => !["DONE","CANCELLED"].includes(t.status)).length;
  const taskSpark      = makeSparkline(activeTasks);
  const stockAlerts    = dashboard?.kpis?.lowStockItems ?? 0;
  const stockSpark     = makeSparkline(stockAlerts, 0.5);
  const empSpark       = makeSparkline(filteredEmps.length, 0.05);
  const dppScore       = dashboard?.dppComplianceScore ?? 0;
  const dppSpark       = makeSparkline(dppScore, 0.1);

  
  const productionFlowData = prodByStatus.map((p) => ({ stage: p.label, count: p.value }));

  
  const orderBarData = orderByStatus.map((o, i) => ({ label: o.label.slice(0, 4), value: o.value, fill: ORDER_COLORS[i] }));

  
  const taskDonutData = ["TODO","IN_PROGRESS","REVIEW","DONE","CANCELLED"]
    .map((s, i) => ({
      name: TASK_STYLE[s].label,
      value: filteredTasks.filter((t) => t.status === s).length,
      fill: TASK_STATUS_COLORS[i],
    }))
    .filter((d) => d.value > 0);

  
  const prodDonutData = prodByStatus
    .filter((p) => p.value > 0)
    .map((p) => ({ name: p.label, value: p.value, fill: p.fill }));

  
  const radialData = [{ name: "Compliance", value: dppScore, fill: CHART_COLORS.purple }];

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-8 animate-fade-in">

      
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">{t("dashboard.operationsCenter", "Operations Center")}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{t("nav.dashboard")}</h1>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">{today}</p>
        </div>
        <div className="glass-card px-4 py-3 shrink-0">
          <OrgSelector value={selectedOrgId} onChange={onOrgChange} />
        </div>
      </section>

      
      <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label={t("nav.production")}
          value={filteredProds.length}
          sub={`${prodCompletion}% completion rate`}
          tone="brand" icon={Factory} sparkline={prodSpark}
        />
        <KpiCard
          label={t("nav.orders")}
          value={filteredOrders.length}
          sub={`${orderFulfillment}% fulfillment`}
          tone="emerald" icon={ClipboardList} sparkline={orderSpark}
        />
        <KpiCard
          label={t("dashboard.activeTasks","Active Tasks")}
          value={activeTasks}
          sub={overdueCount > 0 ? `${overdueCount} overdue` : "All on track"}
          tone={overdueCount > 0 ? "amber" : "slate"} icon={CheckSquare} sparkline={taskSpark}
        />
        <KpiCard
          label={t("dashboard.stockAlerts","Stock Alerts")}
          value={stockAlerts}
          sub="Low threshold items"
          tone={stockAlerts > 0 ? "red" : "slate"} icon={Archive} sparkline={stockSpark}
        />
        <KpiCard
          label={t("nav.employees")}
          value={filteredEmps.length}
          sub={`Avg performance ${avgPerf}/100`}
          tone="slate" icon={Users} sparkline={empSpark}
        />
        <KpiCard
          label={t("dashboard.dppCompliance","DPP Compliance")}
          value={`${dppScore}%`}
          sub="AI-evaluated score"
          tone="purple" icon={ShieldCheck} sparkline={dppSpark}
        />
      </section>

      
      {(dashboard?.kpis?.lowStockItems ?? 0) > 0 && (
        <section className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" strokeWidth={2} />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                {dashboard.kpis.lowStockItems} item{dashboard.kpis.lowStockItems !== 1 ? "s" : ""} below minimum stock threshold
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Replenish materials to avoid production delays.</p>
            </div>
          </div>
          <Link
            to="/stock"
            className="shrink-0 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 px-4 py-2 rounded-xl hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors"
          >
            View Stock →
          </Link>
        </section>
      )}

      
      {filteredProds.length > 0 && (
        <section className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <Factory className="w-4 h-4 text-slate-400" strokeWidth={2} />
              <h3 className="text-xs font-extrabold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Production Throughput</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${prodCompletion >= 70 ? "status-emerald" : "status-amber"}`}>
                {prodCompletion}% complete
              </span>
              <Link to="/production" className="text-[10px] font-bold text-brand-500 hover:text-brand-600 uppercase tracking-wide">{t("common.viewAll","View all →")}</Link>
            </div>
          </div>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <AreaChart data={productionFlowData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CHART_COLORS.brand} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CHART_COLORS.brand} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="count" stroke={CHART_COLORS.brand} strokeWidth={2} fill="url(#prodGrad)" dot={{ r: 4, fill: CHART_COLORS.brand, strokeWidth: 0 }} activeDot={{ r: 6, fill: CHART_COLORS.brand }} />
</AreaChart>
            </ResponsiveContainer>
            </div>
        </section>
      )}

      
      <section className="grid gap-6 xl:grid-cols-3">

        
        <article className="glass-card p-6 space-y-4">
          <SectionHeader
            title={t("nav.production")}
            icon={Factory}
            badge={`${prodCompletion}% complete`}
            badgeTone={prodCompletion >= 70 ? "emerald" : "amber"}
            action={<Link to="/production" className="text-[10px] font-bold text-brand-500 hover:text-brand-600 uppercase tracking-wide">{t("common.viewAll","View all →")}</Link>}
          />
          <div className="space-y-3">
            {prodByStatus.map((row) => (
              <BarRow key={row.label} label={row.label} value={row.value} max={maxProd} color={row.color} badge={row.badge} />
            ))}
          </div>
          {prodDonutData.length > 0 && (
            <div className="flex justify-center pt-3 border-t border-slate-100 dark:border-white/[0.05]" style={{ minHeight: 120 }}>
              <ResponsiveContainer width={120} height={120} minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie data={prodDonutData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={2} dataKey="value" strokeWidth={0}>
                    {prodDonutData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {filteredProds.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">No production data.</p>}
          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.05] flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("dashboard.bottleneck","Bottleneck")}</p>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {dashboard?.bottleneck?.stage || t("dashboard.none","None")}
              {dashboard?.bottleneck?.delayedCount ? ` · ${dashboard.bottleneck.delayedCount} delayed` : ""}
            </span>
          </div>
        </article>

        
        <article className="glass-card p-6 space-y-4">
          <SectionHeader
            title={t("dashboard.orderPipeline","Order Pipeline")}
            icon={ClipboardList}
            badge={`${orderFulfillment}% fulfilled`}
            badgeTone={orderFulfillment >= 60 ? "emerald" : "amber"}
            action={<Link to="/client-orders" className="text-[10px] font-bold text-brand-500 hover:text-brand-600 uppercase tracking-wide">{t("common.viewAll","View all →")}</Link>}
          />
          <div className="space-y-3">
            {orderByStatus.slice(0, 6).map((row) => (
              <BarRow key={row.label} label={row.label} value={row.value} max={maxOrder} color={row.color || "bg-brand-500"} />
            ))}
          </div>
          {orderBarData.some((d) => d.value > 0) && (
            <div className="pt-3 border-t border-slate-100 dark:border-white/[0.05]">
              <div style={{ height: 90 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={orderBarData} layout="vertical" margin={{ left: 0, right: 4, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: "#94A3B8" }} width={28} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {orderBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            </div>
          )}
          {filteredOrders.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">No order data.</p>}
        </article>

        
        <article className="glass-card p-6 space-y-4">
          <SectionHeader
            title={t("dashboard.qualityControl","Quality Control")}
            icon={ShieldCheck}
            badge={`${activeInspections} active`}
            badgeTone="blue"
            action={<Link to="/quality-control" className="text-[10px] font-bold text-brand-500 hover:text-brand-600 uppercase tracking-wide">Manage →</Link>}
          />
          
          <div className="flex items-center gap-4">
            <div className="relative shrink-0" style={{ minHeight: 100 }}>
              <ResponsiveContainer width={100} height={100} minWidth={1} minHeight={1}>
                <RadialBarChart cx="50%" cy="50%" innerRadius={32} outerRadius={48} data={radialData} startAngle={220} endAngle={-40}>
                  <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "rgba(148,163,184,0.1)" }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-base font-extrabold text-purple-600 dark:text-purple-400">{dppScore}%</p>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <BarRow label={t("dashboard.certified","Certified (≥80)")} value={certified} max={qualityMax} color="bg-emerald-500" badge="status-emerald" />
              <BarRow label={t("dashboard.inReview","In Review")}        value={inReview}  max={qualityMax} color="bg-amber-500" badge="status-amber" />
              <BarRow label={t("dashboard.issues","Issues")}             value={hasIssues} max={qualityMax} color="bg-red-500"  badge="status-red" />
            </div>
          </div>
          {(dashboard?.topRiskProducts || []).slice(0, 2).map((item) => (
            <div key={item.productId} className="flex items-center justify-between rounded-xl border border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 gap-2">
              <p className="text-xs font-semibold text-rose-800 dark:text-rose-300 truncate">{item.productName || item.productId}</p>
              <span className="text-[10px] font-bold status-red px-2 py-0.5 rounded-full shrink-0">Risk {item.riskScore}</span>
            </div>
          ))}
        </article>
      </section>

      
      {filteredProds.length > 0 && (
        <ProductionTimeline productions={filteredProds} products={products} t={t} />
      )}

      
      <section className="grid gap-6 xl:grid-cols-2">

        
        <article className="glass-card p-6 space-y-4">
          <SectionHeader
            title={t("dashboard.taskCompletion","Task Completion")}
            icon={CheckSquare}
            badge={overdueCount > 0 ? `${overdueCount} overdue` : `${taskCompletion}% done`}
            badgeTone={overdueCount > 0 ? "red" : "emerald"}
            action={<Link to="/tasks" className="text-[10px] font-bold text-brand-500 hover:text-brand-600 uppercase tracking-wide">{t("common.viewAll","View all →")}</Link>}
          />

          
          <div className="flex items-center gap-4">
            {taskDonutData.length > 0 ? (
              <div className="relative shrink-0">
                <ResponsiveContainer width={100} height={100} minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie data={taskDonutData} cx="50%" cy="50%" innerRadius={30} outerRadius={48} paddingAngle={2} dataKey="value" strokeWidth={0}>
                      {taskDonutData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200">{taskCompletion}%</p>
                </div>
              </div>
            ) : null}
            <div className="flex-1 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/[0.05] p-2">
                <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{filteredTasks.length}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Total</p>
              </div>
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-2">
                <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{taskCompletion}%</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400 mt-0.5">Done</p>
              </div>
              <div className={overdueCount > 0 ? "rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-2" : "rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/[0.05] p-2"}>
                <p className={`text-lg font-extrabold ${overdueCount > 0 ? "text-red-600 dark:text-red-300" : "text-slate-400 dark:text-slate-500"}`}>{overdueCount}</p>
                <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${overdueCount > 0 ? "text-red-400" : "text-slate-400 dark:text-slate-500"}`}>Overdue</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{t("dashboard.byStatus","By Status")}</p>
              {taskByStatus.map((row) => (
                <BarRow key={row.label} label={row.label} value={row.value} max={maxTask} color={row.color} />
              ))}
            </div>
            <div className="space-y-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{t("dashboard.byPriority","By Priority")}</p>
              {taskPriorities.map((row) => (
                <BarRow key={row.label} label={row.label} value={row.value} max={maxPrior} color={row.color} />
              ))}
            </div>
          </div>
        </article>

        
        <article className="glass-card p-6 space-y-5">
          <SectionHeader title={t("dashboard.workforceScope","Workforce & Scope")} icon={Users} />
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl p-4 bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/40 dark:to-brand-800/30 border border-brand-100 dark:border-brand-500/25">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-brand-500 dark:text-brand-400" strokeWidth={2} />
                <p className="text-[9px] font-bold uppercase tracking-widest text-brand-500 dark:text-brand-400">{t("nav.employees")}</p>
              </div>
              <p className="text-3xl font-extrabold text-brand-700 dark:text-brand-300">{filteredEmps.length}</p>
              <p className="text-xs text-brand-500 dark:text-brand-400 mt-0.5">Avg score {avgPerf}/100</p>
            </div>
            <div className="rounded-2xl p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/60 dark:to-slate-700/40 border border-slate-200 dark:border-white/[0.07]">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t("nav.products")}</p>
              </div>
              <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-200">{products.length}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{certified} certified</p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{t("dashboard.organizationScope","Organization Scope")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(dashboard?.organizationScopes || []).length === 0 ? (
                <span className="text-xs text-slate-400 dark:text-slate-500">Global scope</span>
              ) : (
                dashboard.organizationScopes.map((org) => (
                  <span key={org.id} className="rounded-full bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-white/[0.07] px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">{org.name}</span>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-white/[0.05] grid grid-cols-3 gap-3 text-center">
            {[
              { value: dashboard?.kpis?.organizationsMain ?? 0, label: "Main orgs" },
              { value: dashboard?.kpis?.organizationsSub ?? 0,  label: "Sub orgs" },
              { value: dashboard?.kpis?.userCounts?.total ?? 0, label: "Users" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{stat.value}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      
      <section className="grid gap-6 xl:grid-cols-3">
        <AIInsightsCard dashboard={dashboard} t={t} />
        <LiveActivityCard dashboard={dashboard} t={t} />

        
        <article className="glass-card p-6">
          <SectionHeader
            title={t("dashboard.todaysPriorities","Today's Priorities")}
            icon={AlertTriangle}
            badge={dashboard?.todayPriorities?.length > 0 ? `${dashboard.todayPriorities.length} items` : undefined}
            badgeTone="amber"
          />
          {(dashboard?.todayPriorities || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">No priorities today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(dashboard.todayPriorities || []).slice(0, 5).map((item, i) => {
                const isHigh = item.severity === "HIGH" || item.severity === "CRITICAL";
                return (
                  <div key={i} className={`rounded-xl border-l-2 px-3 py-2.5 ${isHigh ? "border-l-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20" : "border-l-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20"}`}>
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.title}</p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isHigh ? "status-red" : "status-amber"}`}>
                        {item.severity || "INFO"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{item.action}</p>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>

    </div>
  );
}



export default function DashboardPage() {
  const { t } = useTranslation();
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [dashboard, setDashboard]         = useState(null);
  const [selectedOrgId, setSelectedOrgId] = useState(() => localStorage.getItem("orgId") || "");
  const [productions, setProductions]     = useState([]);
  const [orders, setOrders]               = useState([]);
  const [tasks, setTasks]                 = useState([]);
  const [employees, setEmployees]         = useState([]);
  const [products, setProducts]           = useState([]);
  const [myTasks, setMyTasks]             = useState([]);

  const currentRole = (localStorage.getItem("userRole") || "").toUpperCase();
  const isEmployee  = currentRole === "EMPLOYEE";
  const isSubAdmin  = currentRole === "SUBADMIN";

  useEffect(() => {
    const storedOrgId = localStorage.getItem("orgId");
    if (storedOrgId) { setSelectedOrgId(storedOrgId); return; }
    if (!isSubAdmin) return;
    getMyOrganizations()
      .then((data) => {
        const orgs = Array.isArray(data) ? data : [];
        if (orgs.length > 0) { setSelectedOrgId(orgs[0].id); localStorage.setItem("orgId", orgs[0].id); }
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
        if (mounted) setError(e.message || t("dashboard.unableToLoad","Unable to load dashboard."));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [selectedOrgId]); // eslint-disable-line

  const handleOrgChange = (id) => setSelectedOrgId(id);

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-brand-100 dark:border-brand-900" />
              <div className="absolute inset-0 rounded-full border-4 border-t-brand-600 animate-spin" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.loading")}</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 p-6 text-sm text-rose-700 dark:text-rose-300">
            <p className="font-bold">{t("dashboard.unavailable","Dashboard unavailable")}</p>
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

