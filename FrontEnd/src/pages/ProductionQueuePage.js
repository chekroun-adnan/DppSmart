import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { getProductionQueue } from "../services/authService";
import { AlertTriangle, Clock, CheckCircle, Play, ArrowUp, ArrowDown, GripVertical } from "lucide-react";

const CARD = "bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/[0.06] p-5";

const STATUS_STYLES = {
  PLANNED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  READY: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PAUSED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  BLOCKED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const DELAY_STYLES = {
  DELAYED: { icon: AlertTriangle, className: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20", label: "Delayed" },
  AT_RISK: { icon: Clock, className: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20", label: "At Risk" },
  ON_SCHEDULE: { icon: CheckCircle, className: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20", label: "On Schedule" },
};

const SECTIONS = [
  { key: "overdue", label: "Overdue", icon: AlertTriangle, accent: "red", empty: "No overdue items." },
  { key: "ready", label: "Ready", icon: ArrowUp, accent: "amber", empty: "Nothing ready right now." },
  { key: "inProgress", label: "In Progress", icon: Play, accent: "blue", empty: "No operations in progress." },
];

function StatusBadge({ status }) {
  const label = (status || "UNKNOWN").replace(/_/g, " ");
  const style = STATUS_STYLES[status] || "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${style}`}>{label}</span>;
}

function fmt(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getDelayIcon(ds) {
  if (!ds || !DELAY_STYLES[ds]) return null;
  const Icon = DELAY_STYLES[ds].icon;
  return <Icon size={12} />;
}

export default function ProductionQueuePage() {
  const [queue, setQueue] = useState({ overdue: [], ready: [], inProgress: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(new Set(["overdue", "ready", "inProgress"]));

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getProductionQueue();
      setQueue(data);
    } catch (e) {
      setError(e?.message || "Failed to load production queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = (key) => {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const healthColor = (score) => {
    if (score == null) return "";
    if (score >= 70) return "text-green-600 dark:text-green-400";
    if (score >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const healthBg = (score) => {
    if (score == null) return "";
    if (score >= 70) return "bg-green-50 dark:bg-green-900/20";
    if (score >= 40) return "bg-amber-50 dark:bg-amber-900/20";
    return "bg-red-50 dark:bg-red-900/20";
  };

  const barColor = (pct) => {
    if (pct >= 80) return "bg-green-500";
    if (pct >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  const renderCard = (item) => {
    const pct = item.completionPercentage || 0;
    return (
      <div key={item.id} className={`${CARD} space-y-3 animate-fade-in`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white truncate">{item.operationName}</p>
            {item.productName && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{item.productName}</p>
            )}
          </div>
          <StatusBadge status={item.status} />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-600 dark:text-slate-300">Progress</span>
            <span className={healthColor(pct)}>{pct}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ease-out ${barColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-400 dark:text-slate-500">
            <span>{item.completedQuantity ?? 0}/{item.requiredQuantity ?? 0}</span>
            <span>{(item.remainingQuantity ?? 0) > 0 ? `${item.remainingQuantity} remaining` : "Complete"}</span>
          </div>
        </div>

        {(item.plannedStartTime || item.plannedEndTime) && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <Clock size={12} />
            <span>{fmt(item.plannedStartTime)} &rarr; {fmt(item.plannedEndTime)}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {item.delayStatus && DELAY_STYLES[item.delayStatus] && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${DELAY_STYLES[item.delayStatus].className}`}>
              {getDelayIcon(item.delayStatus)}
              {DELAY_STYLES[item.delayStatus].label}
            </span>
          )}
          {item.healthScore != null && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${healthColor(item.healthScore)} ${healthBg(item.healthScore)}`}>
              <GripVertical size={12} />
              {item.healthScore}%
            </span>
          )}
          {(item.priority ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              <ArrowUp size={12} />
              P{item.priority}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderSection = ({ key, label, icon: Icon, accent, empty }) => {
    const items = queue[key] || [];
    const isOpen = open.has(key);
    const count = items.length;

    const borderKey = { red: "border-l-red-500", amber: "border-l-amber-500", blue: "border-l-blue-500" }[accent];
    const badgeKey = { red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" }[accent];
    const iconKey = { red: "text-red-600 dark:text-red-400", amber: "text-amber-600 dark:text-amber-400", blue: "text-blue-600 dark:text-blue-400" }[accent];

    return (
      <div key={key} className="space-y-3">
        <button
          onClick={() => toggle(key)}
          className={`w-full flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all ${borderKey} border-l-4`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Icon size={20} className={`shrink-0 ${iconKey}`} />
            <span className="font-bold text-slate-900 dark:text-white truncate">{label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badgeKey}`}>{count}</span>
          </div>
          {isOpen ? <ArrowUp size={18} className="shrink-0 text-slate-400" /> : <ArrowDown size={18} className="shrink-0 text-slate-400" />}
        </button>

        {isOpen && (
          <div className="space-y-3">
            {items.length === 0 ? (
              <div className={`${CARD} text-center py-8`}>
                <Icon size={32} className={`mx-auto mb-2 ${iconKey} opacity-50`} />
                <p className="text-sm text-slate-400 dark:text-slate-500">{empty}</p>
              </div>
            ) : (
              items.map(renderCard)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Employee Portal</p>
          <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Production Queue</h1>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {SECTIONS.map(renderSection)}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
