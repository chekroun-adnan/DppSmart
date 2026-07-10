import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Calendar, ListOrdered, LayoutGrid, BarChart3, GanttChartSquare, CalendarDays, Puzzle, RefreshCw } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import ProductionOrdersView from "../components/ProductionOrdersView";
import DailyOperationsView from "../components/DailyOperationsView";
import DepartmentQueuesView from "../components/DepartmentQueuesView";
import KpiDashboardView from "../components/KpiDashboardView";
import GanttChartView from "../components/GanttChartView";
import ProductionCalendarView from "../components/ProductionCalendarView";
import PlannerView from "../components/PlannerView";
import { backfillWipFields } from "../services/authService";

const TABS = [
  { key: "orders", label: "Orders View", icon: ListOrdered },
  { key: "queues", label: "Department Queues", icon: LayoutGrid },
  { key: "gantt", label: "Gantt Chart", icon: GanttChartSquare },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "planner", label: "Planner", icon: Puzzle },
  { key: "kpi", label: "KPI Dashboard", icon: BarChart3 },
  { key: "daily", label: "Daily Operations", icon: Calendar },
];

const TAB_SECTIONS = {
  orders: { title: "Orders in Production", subtitle: "From linked orders" },
  queues: { title: "Department Queues", subtitle: "Work queues by department" },
  gantt: { title: "Gantt Chart", subtitle: "Production timeline view" },
  calendar: { title: "Production Calendar", subtitle: "Monthly production calendar" },
  planner: { title: "Production Planner", subtitle: "Drag and drop planning" },
  kpi: { title: "KPI Dashboard", subtitle: "Production performance metrics" },
  daily: { title: "Daily Operations", subtitle: "Department work queues" },
};

export default function ProductionPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "orders";
  const [migrating, setMigrating] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState("");

  const setTab = (key) => {
    setSearchParams(prev => {
      const n = new URLSearchParams(prev);
      n.set("tab", key);
      return n;
    }, { replace: true });
  };

  const section = TAB_SECTIONS[activeTab] || TAB_SECTIONS.orders;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">{t("production.manufacturing", "Manufacturing")}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{t("production.title")}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("production.subtitle", "Manage production workflow steps.")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setMigrating(true);
                setMigrateMsg("");
                try {
                  const result = await backfillWipFields();
                  setMigrateMsg(`Backfilled ${result.updated} steps`);
                  setTimeout(() => setMigrateMsg(""), 4000);
                } catch (e) {
                  setMigrateMsg("Migration failed");
                  setTimeout(() => setMigrateMsg(""), 4000);
                } finally {
                  setMigrating(false);
                }
              }}
              disabled={migrating}
              className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={12} className={migrating ? "animate-spin" : ""} />
              {migrating ? "Migrating…" : "Backfill WIP"}
            </button>
            {migrateMsg && (
              <span className="text-xs font-semibold text-brand-600">{migrateMsg}</span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 min-w-max p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.03] w-fit overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === key
                  ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "orders" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{section.title}</h2>
              <span className="text-[10px] text-slate-400">{section.subtitle}</span>
            </div>
            <ProductionOrdersView />
          </div>
        )}

        {activeTab === "queues" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{section.title}</h2>
              <span className="text-[10px] text-slate-400">{section.subtitle}</span>
            </div>
            <DepartmentQueuesView />
          </div>
        )}

        {activeTab === "gantt" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{section.title}</h2>
              <span className="text-[10px] text-slate-400">{section.subtitle}</span>
            </div>
            <GanttChartView />
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{section.title}</h2>
              <span className="text-[10px] text-slate-400">{section.subtitle}</span>
            </div>
            <ProductionCalendarView />
          </div>
        )}

        {activeTab === "planner" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{section.title}</h2>
              <span className="text-[10px] text-slate-400">{section.subtitle}</span>
            </div>
            <PlannerView />
          </div>
        )}

        {activeTab === "kpi" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{section.title}</h2>
              <span className="text-[10px] text-slate-400">{section.subtitle}</span>
            </div>
            <KpiDashboardView />
          </div>
        )}

        {activeTab === "daily" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{section.title}</h2>
              <span className="text-[10px] text-slate-400">{section.subtitle}</span>
            </div>
            <DailyOperationsView />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
