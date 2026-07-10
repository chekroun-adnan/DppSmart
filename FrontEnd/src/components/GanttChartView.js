import { useState, useEffect, useCallback, useMemo } from "react";
import { getProductionOrders, getProductionOrderSteps } from "../services/authService";
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut } from "lucide-react";

const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const MIN_WIDTH_PER_DAY = 24;
const MIN_WIDTH_PER_HOUR = 2;
const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 48;
const LABEL_WIDTH = 200;

function getDelayColor(status) {
  switch (status) {
    case "DELAYED": return "bg-red-500";
    case "AT_RISK": return "bg-amber-500";
    default: return "bg-green-500";
  }
}

function getHealthColor(score) {
  if (score == null) return "bg-slate-400";
  if (score >= 80) return "bg-green-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export default function GanttChartView() {
  const [orders, setOrders] = useState([]);
  const [stepsMap, setStepsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("day");
  const [scrollOffset, setScrollOffset] = useState(0);
  const [expandedOrders, setExpandedOrders] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const ordersData = await getProductionOrders();
      const ordersList = Array.isArray(ordersData) ? ordersData : [];
      setOrders(ordersList);

      const sm = {};
      await Promise.all(ordersList.map(async (o) => {
        try {
          const steps = await getProductionOrderSteps(o.id);
          sm[o.id] = Array.isArray(steps) ? steps : [];
        } catch {
          sm[o.id] = [];
        }
      }));
      setStepsMap(sm);
    } catch (err) {
      console.error("Failed to load Gantt data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const dateRange = useMemo(() => {
    let min = Infinity, max = -Infinity;
    orders.forEach((o) => {
      const start = o.productionStartDate ? new Date(o.productionStartDate).getTime() : null;
      const end = o.forecastEndDateTime ? new Date(o.forecastEndDateTime).getTime() : o.dueDate ? new Date(o.dueDate).getTime() : null;
      if (start && start < min) min = start;
      if (end && end > max) max = end;
      const steps = stepsMap[o.id] || [];
      steps.forEach((s) => {
        const ps = s.plannedStartTime ? new Date(s.plannedStartTime).getTime() : null;
        const pe = s.plannedEndTime ? new Date(s.plannedEndTime).getTime() : null;
        if (ps && ps < min) min = ps;
        if (pe && pe > max) max = pe;
      });
    });
    if (!isFinite(min)) min = Date.now() - 7 * DAY_MS;
    if (!isFinite(max)) max = Date.now() + 7 * DAY_MS;
    const start = new Date(min);
    start.setHours(0, 0, 0, 0);
    const end = new Date(max);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [orders, stepsMap]);

  const totalDays = useMemo(() => {
    return Math.max(1, Math.ceil((dateRange.end - dateRange.start) / DAY_MS));
  }, [dateRange]);

  const pixelWidth = useMemo(() => {
    if (viewMode === "week") return totalDays * MIN_WIDTH_PER_DAY;
    return totalDays * MIN_WIDTH_PER_DAY;
  }, [viewMode, totalDays]);

  const nowOffset = useMemo(() => {
    const now = Date.now();
    if (now < dateRange.start.getTime()) return 0;
    if (now > dateRange.end.getTime()) return pixelWidth;
    return ((now - dateRange.start.getTime()) / (dateRange.end.getTime() - dateRange.start.getTime())) * pixelWidth;
  }, [dateRange, pixelWidth]);

  const toggleOrder = (orderId) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const renderHeader = () => {
    const days = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(dateRange.start.getTime() + i * DAY_MS);
      days.push(d);
    }
    const dayWidth = pixelWidth / totalDays;

    return (
      <div className="flex" style={{ width: pixelWidth + LABEL_WIDTH, minWidth: "100%" }}>
        <div className="flex-shrink-0 border-r border-slate-200 dark:border-slate-700" style={{ width: LABEL_WIDTH }}>
          <div className="h-full flex items-end pb-1 px-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Orders / Steps</span>
          </div>
        </div>
        <div className="flex" style={{ width: pixelWidth }}>
          {days.map((d, i) => (
            <div
              key={i}
              className="flex-shrink-0 text-center border-r border-slate-100 dark:border-slate-700/50"
              style={{ width: dayWidth }}
            >
              <div className="text-[9px] font-bold text-slate-400 uppercase leading-tight">{d.toLocaleDateString("en", { weekday: "short" })}</div>
              <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{d.getDate()}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBar = (startDate, endDate, color, status) => {
    if (!startDate) return null;
    const start = new Date(startDate).getTime();
    const end = endDate ? new Date(endDate).getTime() : start + HOUR_MS;
    const range = dateRange.end.getTime() - dateRange.start.getTime();
    if (range <= 0) return null;
    const left = ((start - dateRange.start.getTime()) / range) * pixelWidth;
    const width = Math.max(4, ((end - start) / range) * pixelWidth);
    const barColor = status === "DELAYED" ? "bg-red-500" : status === "AT_RISK" ? "bg-amber-500" : color || "bg-brand-500";

    return (
      <div
        className={`absolute top-1 h-5 rounded ${barColor} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
        style={{ left, width, minWidth: 4 }}
        title={`${new Date(startDate).toLocaleString()} - ${endDate ? new Date(endDate).toLocaleString() : ""}`}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-slate-400">No production orders to display in Gantt chart.</div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("day")}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
              viewMode === "day" ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
              viewMode === "week" ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
              viewMode === "month" ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
            }`}
          >
            Month
          </button>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 mr-3">
            <span className="w-2.5 h-2.5 rounded bg-green-500" />
            <span>On Time</span>
          </div>
          <div className="flex items-center gap-1.5 mr-3">
            <span className="w-2.5 h-2.5 rounded bg-amber-500" />
            <span>At Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-red-500" />
            <span>Delayed</span>
          </div>
        </div>
      </div>

      {/* Gantt Container */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: LABEL_WIDTH + pixelWidth }}>
            {renderHeader()}

            {/* Rows */}
            <div className="relative" style={{ width: pixelWidth + LABEL_WIDTH }}>
              {/* "Now" line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                style={{ left: LABEL_WIDTH + nowOffset }}
              />

              {orders.map((order) => {
                const steps = stepsMap[order.id] || [];
                const isExpanded = expandedOrders[order.id];
                const orderBarColor = order.delayStatus === "DELAYED" ? "bg-red-500" : order.delayStatus === "AT_RISK" ? "bg-amber-500" : order.healthStatus === "GOOD" ? "bg-green-500" : "bg-brand-500";

                return (
                  <div key={order.id}>
                    {/* Order Row */}
                    <div
                      onClick={() => toggleOrder(order.id)}
                      className="flex items-center border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                      style={{ height: ROW_HEIGHT }}
                    >
                      <div className="flex-shrink-0 px-2 border-r border-slate-200 dark:border-slate-700 flex items-center gap-1.5" style={{ width: LABEL_WIDTH }}>
                        <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">{order.orderTitle || order.title || `Order ${order.id?.slice(-6)}`}</span>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getHealthColor(order.healthScore)}`} />
                      </div>
                      <div className="relative flex-1" style={{ height: ROW_HEIGHT }}>
                        {renderBar(order.productionStartDate || order.startDate, order.forecastEndDateTime || order.dueDate, orderBarColor, order.delayStatus)}
                      </div>
                    </div>

                    {/* Steps (expanded) */}
                    {isExpanded && steps.map((step) => (
                      <div
                        key={step.id}
                        className="flex items-center border-b border-slate-50 dark:border-slate-700/20 bg-slate-50/50 dark:bg-slate-700/10"
                        style={{ height: ROW_HEIGHT }}
                      >
                        <div className="flex-shrink-0 px-2 border-r border-slate-200 dark:border-slate-700 flex items-center gap-1.5 pl-6" style={{ width: LABEL_WIDTH }}>
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate">{step.stepName || step.name || `Step ${step.stepOrder || step.order}`}</span>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getHealthColor(step.healthScore)}`} />
                        </div>
                        <div className="relative flex-1" style={{ height: ROW_HEIGHT }}>
                          {renderBar(step.plannedStartTime || step.forecastStartTime, step.plannedEndTime || step.forecastEndTime, getDelayColor(step.delayStatus), step.delayStatus)}
                          {step.actualStartTime && step.actualEndTime && renderBar(step.actualStartTime, step.actualEndTime, "bg-blue-500", "")}
                        </div>
                      </div>
                    ))}

                    {/* Empty steps message */}
                    {isExpanded && steps.length === 0 && (
                      <div className="flex items-center border-b border-slate-50 dark:border-slate-700/20" style={{ height: ROW_HEIGHT }}>
                        <div className="flex-shrink-0 px-2 pl-6 border-r border-slate-200 dark:border-slate-700" style={{ width: LABEL_WIDTH }}>
                          <span className="text-[10px] text-slate-400 italic">No steps generated</span>
                        </div>
                        <div className="flex-1" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-slate-400">
        <div className="flex items-center gap-1">
          <span className="w-3 h-1.5 rounded bg-brand-500" />
          <span>Planned</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-1.5 rounded bg-blue-500" />
          <span>Actual</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-0.5 h-3 bg-red-500" />
          <span>Now</span>
        </div>
      </div>
    </div>
  );
}
