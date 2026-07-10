import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { getTodaySchedule } from "../services/authService";
import { Clock, CheckCircle, Play, AlertTriangle, Sun, Moon, Sunrise } from "lucide-react";

const CARD = "bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/[0.06] p-5";

function formatTime(localTimeStr) {
  if (!localTimeStr) return "--:--";
  return localTimeStr.substring(0, 5);
}

function getHour(timeStr) {
  if (!timeStr) return 12;
  return parseInt(timeStr.substring(0, 2), 10) || 12;
}

function getTimeBlock(hour) {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

const PERIOD_LABELS = {
  current: "In Progress",
  upcoming: "Upcoming",
  completed: "Completed",
};

const PERIOD_COLORS = {
  completed: "border-green-400 dark:border-green-600",
  current: "border-blue-400 dark:border-blue-600",
  upcoming: "border-slate-200 dark:border-slate-700",
};

const BADGE_COLORS = {
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  current: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  upcoming: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const DOT_COLORS = {
  completed: "bg-green-500 ring-green-200 dark:ring-green-900",
  current: "bg-blue-500 ring-blue-200 dark:ring-blue-900",
  upcoming: "bg-slate-300 dark:bg-slate-600 ring-slate-100 dark:ring-slate-800",
};

const BAR_COLORS = {
  completed: "bg-green-500",
  current: "bg-blue-500",
  upcoming: "bg-slate-400",
};

const SECTION_ICONS = {
  current: Play,
  upcoming: Clock,
  completed: CheckCircle,
};

function TimelineDot({ period }) {
  return (
    <div className={`w-3.5 h-3.5 rounded-full ring-4 ${DOT_COLORS[period] || DOT_COLORS.upcoming}`} />
  );
}

function TimelineItem({ item, isLast }) {
  const period = item.period || "upcoming";
  return (
    <div className={`relative pl-8 ${isLast ? "pb-2" : "pb-6"} border-l-2 ${PERIOD_COLORS[period] || PERIOD_COLORS.upcoming}`}>
      <div className="absolute -left-[9px] top-0">
        <TimelineDot period={period} />
      </div>
      <div className={`${CARD} p-4`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900 dark:text-white truncate">{item.operationName}</p>
            {item.productName && (
              <p className="text-sm text-slate-400 mt-0.5 truncate">{item.productName}</p>
            )}
          </div>
          <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${BADGE_COLORS[period] || BADGE_COLORS.upcoming}`}>
            {PERIOD_LABELS[period] || period}
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
                className={`h-full rounded-full transition-all duration-500 ${BAR_COLORS[period] || BAR_COLORS.upcoming}`}
                style={{ width: `${item.completionPercentage}%` }}
              />
            </div>
          </div>
        )}
        {item.requiredQuantity != null && (
          <div className="mt-2 text-xs text-slate-400">
            <span className="font-medium text-slate-600 dark:text-slate-300">{item.completedQuantity ?? 0}</span>
            {" / "}
            <span>{item.requiredQuantity}</span>
            {" produced"}
          </div>
        )}
      </div>
    </div>
  );
}

const BLOCK_ICONS = { morning: Sun, afternoon: Sunrise, evening: Moon };
const BLOCK_LABELS = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };

function TimeBlockGroup({ block, items }) {
  const Icon = BLOCK_ICONS[block];
  return (
    <div className="mt-6 first:mt-0">
      <div className="flex items-center gap-2 mb-4 pl-8">
        <Icon size={16} className="text-slate-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {BLOCK_LABELS[block]}
        </span>
      </div>
      {items.map((item, i) => (
        <TimelineItem key={item.id || i} item={item} isLast={i === items.length - 1} />
      ))}
    </div>
  );
}

function PeriodSection({ period, items }) {
  const Icon = SECTION_ICONS[period] || Clock;

  const blocks = { morning: [], afternoon: [], evening: [] };
  items.forEach((item) => {
    const hour = getHour(item.plannedStart);
    const block = getTimeBlock(hour);
    blocks[block].push(item);
  });

  const hasItems = blocks.morning.length > 0 || blocks.afternoon.length > 0 || blocks.evening.length > 0;
  if (!hasItems) return null;

  return (
    <div className={`${CARD} p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className={
          period === "current" ? "text-blue-500" :
          period === "completed" ? "text-green-500" :
          "text-slate-400"
        } />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          {PERIOD_LABELS[period] || period}
        </h3>
        <span className="text-xs text-slate-400 ml-auto">{items.length}</span>
      </div>
      {Object.entries(blocks).map(([block, blockItems]) =>
        blockItems.length > 0 ? (
          <TimeBlockGroup key={block} block={block} items={blockItems} />
        ) : null
      )}
    </div>
  );
}

export default function TodaySchedulePage() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    getTodaySchedule()
      .then((data) => {
        if (!mounted) return;
        setSchedule(data || []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message || "Failed to load schedule.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const grouped = { current: [], upcoming: [], completed: [] };
  (schedule || []).forEach((item) => {
    const p = item.period || "upcoming";
    if (grouped[p]) grouped[p].push(item);
    else grouped.upcoming.push(item);
  });

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

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

  const totalItems = schedule.length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
            Employee Portal
          </p>
          <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Today's Schedule
          </h1>
          <p className="text-sm text-slate-400 mt-1">{dateStr}</p>
        </div>

        {totalItems === 0 ? (
          <div className={`${CARD} flex flex-col items-center justify-center py-14 gap-3`}>
            <Clock size={40} className="text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400 text-center">No operations scheduled for today.</p>
          </div>
        ) : (
          <>
            {grouped.current.length > 0 && (
              <PeriodSection period="current" items={grouped.current} />
            )}
            {grouped.upcoming.length > 0 && (
              <PeriodSection period="upcoming" items={grouped.upcoming} />
            )}
            {grouped.completed.length > 0 && (
              <PeriodSection period="completed" items={grouped.completed} />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
