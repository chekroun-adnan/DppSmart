import { useState, useEffect, useCallback } from "react";
import { getKpiDashboard, getDepartmentQueues } from "../services/authService";
import {
  Activity, AlertTriangle, CheckCircle, Clock, TrendingUp, Users,
  Package, Loader2, RefreshCw
} from "lucide-react";

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className={`mt-1 text-2xl font-extrabold ${color || "text-slate-900 dark:text-slate-100"}`}>
            {value ?? "-"}
          </p>
          {sub != null && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${color ? color.replace("text-", "bg-").replace("dark:", "") : "bg-brand-50 dark:bg-brand-900/20"}`}>
          <Icon size={18} className={color || "text-brand-600"} />
        </div>
      </div>
    </div>
  );
}

function getHealthColor(score) {
  if (score == null) return "bg-slate-200 dark:bg-slate-600";
  if (score >= 80) return "bg-green-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export default function KpiDashboardView() {
  const [kpi, setKpi] = useState(null);
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("today");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiData, queueData] = await Promise.all([
        getKpiDashboard(),
        getDepartmentQueues(),
      ]);
      setKpi(kpiData);
      setQueues(Array.isArray(queueData) ? queueData : []);
    } catch (err) {
      console.error("Failed to load KPI dashboard", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onTimeRate = kpi?.onTimeCompletionRate != null
    ? (kpi.onTimeCompletionRate * 100).toFixed(1)
    : null;

  const avgDuration = kpi?.avgDuration != null
    ? kpi.avgDuration
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Top-level KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Package}
          label="Orders in Production"
          value={kpi?.ordersInProduction ?? 0}
          color="text-brand-600"
        />
        <StatCard
          icon={Activity}
          label="Active Operations"
          value={kpi?.operationsActive ?? 0}
          sub={`${kpi?.delayedOrders ?? 0} delayed orders`}
          color="text-blue-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Delayed"
          value={kpi?.delayedOperations ?? 0}
          sub={`${kpi?.delayedOrders ?? 0} orders delayed`}
          color="text-red-600"
        />
        <StatCard
          icon={TrendingUp}
          label="On-Time Rate"
          value={onTimeRate != null ? `${onTimeRate}%` : "-"}
          sub={avgDuration != null ? `Avg ${avgDuration.toFixed(0)}min` : null}
          color="text-green-600"
        />
      </div>

      {/* WIP KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          icon={Package}
          label="WIP Orders"
          value={kpi?.wipOrders ?? 0}
          sub="Orders currently in production"
          color="text-purple-600"
        />
        <StatCard
          icon={Activity}
          label="WIP Operations"
          value={kpi?.wipOperations ?? 0}
          sub={`${kpi?.operationsCarriedFromPreviousDays ?? 0} carried from prev day`}
          color="text-indigo-600"
        />
        <StatCard
          icon={Package}
          label="Total Remaining"
          value={kpi?.totalRemainingQuantity ?? 0}
          sub={`Avg completion: ${kpi?.averageCompletionPercentage != null ? kpi.averageCompletionPercentage.toFixed(0) : 0}%`}
          color="text-amber-600"
        />
      </div>

      {/* Production Efficiency */}
      {kpi?.productionEfficiency > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Production Efficiency</h3>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{kpi.productionEfficiency}%</span>
            <div className="flex-1 h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  kpi.productionEfficiency >= 90 ? "bg-green-500"
                    : kpi.productionEfficiency >= 75 ? "bg-brand-500"
                    : kpi.productionEfficiency >= 50 ? "bg-amber-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${Math.min(kpi.productionEfficiency, 100)}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Planned vs actual duration ratio for completed operations</p>
        </div>
      )}

      {/* Health Overview */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wider">Order Health Distribution</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-slate-600 dark:text-slate-400">Good (80-100)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-slate-600 dark:text-slate-400">At Risk (50-79)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-slate-600 dark:text-slate-400">Critical (0-49)</span>
          </div>
        </div>
      </div>

      {/* Department Capacities */}
      {queues.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wider">Department Capacities</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {queues.map((q, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{q.departmentName || q.department}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    (q.utilizationPercent || 0) > 100
                      ? "text-red-600 bg-red-50 dark:bg-red-900/20"
                      : (q.utilizationPercent || 0) > 80
                        ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20"
                        : "text-green-600 bg-green-50 dark:bg-green-900/20"
                  }`}>
                    {(q.utilizationPercent || 0) > 100 ? "OVERLOADED" : (q.utilizationPercent || 0) > 80 ? "NEAR LIMIT" : "OK"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>{q.assignedHours ?? 0}h assigned</span>
                  <span>{q.availableHours ?? 0}h available</span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (q.utilizationPercent || 0) > 100
                        ? "bg-red-500"
                        : (q.utilizationPercent || 0) > 80
                          ? "bg-amber-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min((q.utilizationPercent || 0), 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1"><CheckCircle size={10} /> {q.todayOperations?.length || 0} today</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {q.upcomingOperations?.length || 0} upcoming</span>
                  {q.delayedOperations?.length > 0 && (
                    <span className="flex items-center gap-1 text-red-500"><AlertTriangle size={10} /> {q.delayedOperations.length} delayed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Workload */}
      {kpi?.todayWorkload != null && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Today's Workload</h3>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{kpi.todayWorkload}</span>
            <span className="text-xs text-slate-400">operations scheduled today</span>
          </div>
        </div>
      )}

      {/* When no data */}
      {!kpi && (
        <div className="text-center py-12 text-sm text-slate-400">No KPI data available yet.</div>
      )}
    </div>
  );
}
