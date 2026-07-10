import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { getMyPerformanceStats } from "../services/authService";
import { TrendingUp, CheckCircle, BarChart3, Target, Award, Clock, Layers } from "lucide-react";

const CARD = "bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/[0.06] p-5";

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function Gauge({ value, size = 44, icon: Icon, label, color }) {
  const offset = CIRCUMFERENCE - (Math.min(value, 100) / 100) * CIRCUMFERENCE;
  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-white/[0.06]" />
        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={color}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {Icon && <Icon size={16} className={`mb-0.5 ${color}`} />}
        <span className="text-xs font-extrabold text-slate-900 dark:text-white">{Math.round(value)}%</span>
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getMyPerformanceStats();
      setData(result);
    } catch (e) {
      setError(e.message || "Failed to load performance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-24 animate-fade-in">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl animate-fade-in">
          <Clock size={16} />
          {error}
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className={`${CARD} text-center py-16 animate-fade-in`}>
          <BarChart3 size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="font-semibold text-slate-500 dark:text-slate-400">No performance data available yet.</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Complete some operations to see your metrics.</p>
        </div>
      </DashboardLayout>
    );
  }

  const {
    completedOperations = 0,
    completedQuantity = 0,
    averageCompletionPct = 0,
    productivity = 0,
    assignedTasks = 0,
    byOperation = {},
  } = data;

  const maxOpCount = Math.max(...Object.values(byOperation), 1);
  const opEntries = Object.entries(byOperation);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Employee Portal</p>
          <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">My Performance</h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: "Completed Operations", value: completedOperations, icon: CheckCircle, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30" },
            { label: "Completed Quantity", value: completedQuantity, icon: BarChart3, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
            { label: "Avg Completion", value: `${Math.round(averageCompletionPct)}%`, icon: Target, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30" },
            { label: "Productivity", value: `${Math.round(productivity)}%`, icon: TrendingUp, color: "text-brand-600 dark:text-brand-400", bg: "bg-brand-100 dark:bg-brand-900/30" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`${CARD} flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${color}`}>
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={`${CARD} flex flex-col items-center justify-center py-8`}>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-5">Overall Productivity</p>
          <Gauge value={productivity} icon={TrendingUp} color="text-brand-600 dark:text-brand-400" />
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <Award size={14} className="text-amber-500" />
            <span>
              {productivity >= 80
                ? "Outstanding performance!"
                : productivity >= 60
                  ? "Good productivity level"
                  : "Room for improvement"}
            </span>
          </div>
        </div>

        <div className={`${CARD} flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{assignedTasks}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Assigned Tasks</p>
          </div>
        </div>

        {opEntries.length > 0 && (
          <div className={`${CARD} space-y-5`}>
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-brand-600 dark:text-brand-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Operations Breakdown</h2>
            </div>
            <div className="space-y-4">
              {opEntries.map(([name, count]) => {
                const barPct = (count / maxOpCount) * 100;
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-24 text-sm font-medium text-slate-700 dark:text-slate-300 truncate shrink-0">{name}</span>
                    <div className="flex-1 h-3 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 dark:bg-brand-400 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm font-bold text-slate-900 dark:text-white shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
