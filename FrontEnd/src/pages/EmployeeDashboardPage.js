import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { getEmployeeDashboard, getTodaySchedule } from "../services/authService";
import { ClipboardList, Play, AlertTriangle, CheckCircle, Clock, CalendarDays, Factory, Bug, TrendingUp, ArrowRight } from "lucide-react";

const CARD = "bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/[0.06] p-5";

function formatTime(dateStr) {
  if (!dateStr) return "--:--";
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatCurrency(amount, currency) {
  const curr = currency || "MAD";
  if (amount == null) return `0.00 ${curr}`;
  return `${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
}

function KpiCard({ label, value, icon: Icon, colorClass }) {
  return (
    <div className={`${CARD} flex items-center gap-4`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorClass}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function TimelineDot({ period }) {
  const colors = {
    completed: "bg-green-500 ring-green-200 dark:ring-green-900",
    current: "bg-blue-500 ring-blue-200 dark:ring-blue-900",
    upcoming: "bg-slate-300 dark:bg-slate-600 ring-slate-100 dark:ring-slate-800",
  };
  return (
    <div className="flex flex-col items-center">
      <div className={`w-3.5 h-3.5 rounded-full ring-4 ${colors[period] || colors.upcoming}`} />
    </div>
  );
}

function ScheduleItem({ item }) {
  const period = item.period || "upcoming";
  const colors = {
    completed: "border-green-400 dark:border-green-600",
    current: "border-blue-400 dark:border-blue-600",
    upcoming: "border-slate-200 dark:border-slate-700",
  };
  const badgeColors = {
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    current: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    upcoming: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
  const statusLabels = {
    completed: "Completed",
    current: "In Progress",
    upcoming: "Upcoming",
  };
  return (
    <div className={`relative pl-8 pb-6 border-l-2 ${colors[period]}`}>
      <div className="absolute -left-[9px] top-0">
        <TimelineDot period={period} />
      </div>
      <div className={`${CARD} p-4`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900 dark:text-white truncate">{item.operationName}</p>
            {item.productName && (
              <p className="text-sm text-slate-400 mt-0.5">{item.productName}</p>
            )}
          </div>
          <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeColors[period]}`}>
            {statusLabels[period]}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
          <Clock size={12} />
          <span>{formatTime(item.plannedStart)} - {formatTime(item.plannedEnd)}</span>
        </div>
        {period === "current" && item.completionPercentage != null && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">Progress</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{item.completionPercentage}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${item.completionPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickAction({ label, to, icon: Icon }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/[0.06] hover:shadow-md hover:border-brand-200 dark:hover:border-brand-500/30 transition-all group"
    >
      <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
        <Icon size={18} />
      </div>
      <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
      <ArrowRight size={15} className="text-slate-300 dark:text-slate-600 group-hover:text-brand-500 transition-colors" />
    </Link>
  );
}

export default function EmployeeDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    Promise.all([
      getEmployeeDashboard(),
      getTodaySchedule(),
    ]).then(([dash, sched]) => {
      if (!mounted) return;
      setDashboard(dash);
      setSchedule(sched || []);
    }).catch((e) => {
      if (!mounted) return;
      setError(e.message || "Failed to load dashboard data.");
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const kpis = dashboard?.kpis || {};

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in gap-4">
          <AlertTriangle size={40} className="text-red-400" />
          <p className="text-sm text-red-500 text-center max-w-xs">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
            Employee Portal
          </p>
          <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Dashboard
          </h1>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Tasks Today"
            value={kpis.tasksAssignedToday ?? "--"}
            icon={ClipboardList}
            colorClass="bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400"
          />
          <KpiCard
            label="In Progress"
            value={kpis.operationsInProgress ?? "--"}
            icon={Play}
            colorClass="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          />
          <KpiCard
            label="Overdue"
            value={kpis.overdueTasks ?? "--"}
            icon={AlertTriangle}
            colorClass="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          />
          <KpiCard
            label="Completed Today"
            value={kpis.completedToday ?? "--"}
            icon={CheckCircle}
            colorClass="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
          />
        </div>

        {/* Extra KPI row for produced quantity */}
        {kpis.producedQuantityToday != null && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`${CARD} flex items-center gap-4`}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <Factory size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{kpis.producedQuantityToday}</p>
                <p className="text-xs text-slate-400">Produced Today</p>
              </div>
            </div>
          </div>
        )}

        {/* Today's Schedule Timeline */}
        <div className={CARD}>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">Today's Schedule</h2>
          {schedule.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No operations scheduled for today.</p>
          ) : (
            <div className="space-y-0">
              {schedule.map((item, i) => (
                <ScheduleItem key={i} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <QuickAction label="My Tasks" to="/my-tasks" icon={ClipboardList} />
            <QuickAction label="My Operations" to="/my-operations" icon={Factory} />
            <QuickAction label="Today's Schedule" to="/today-schedule" icon={CalendarDays} />
            <QuickAction label="Production Queue" to="/production-queue" icon={Clock} />
            <QuickAction label="Report Issue" to="/report-issue" icon={Bug} />
            <QuickAction label="Performance" to="/performance" icon={TrendingUp} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
