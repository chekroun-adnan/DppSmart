import { useState, useEffect, useCallback, useMemo } from "react";
import { getProductionOrders, getProductionOrderSteps } from "../services/authService";
import { ChevronLeft, ChevronRight, Loader2, AlertTriangle, CheckCircle } from "lucide-react";

const DAY_MS = 86400000;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDelayColor(status) {
  switch (status) {
    case "DELAYED": return "bg-red-500";
    case "AT_RISK": return "bg-amber-500";
    default: return "bg-green-500";
  }
}

export default function ProductionCalendarView() {
  const [orders, setOrders] = useState([]);
  const [stepsMap, setStepsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);

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
      console.error("Failed to load calendar data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date();

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  const isToday = (day) => {
    return today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
  };

  const getEventsForDay = useMemo(() => {
    const events = {};
    const startOfMonth = new Date(currentYear, currentMonth, 1).getTime();
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).getTime();

    orders.forEach((order) => {
      const steps = stepsMap[order.id] || [];
      steps.forEach((step) => {
        const start = step.plannedStartTime || step.forecastStartTime;
        const end = step.plannedEndTime || step.forecastEndTime || start;
        if (!start) return;
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        if (startTime > endOfMonth || endTime < startOfMonth) return;

        const startDay = new Date(start).getDate();
        const endDay = new Date(end).getDate();

        for (let d = startDay; d <= endDay && d <= daysInMonth; d++) {
          const key = d;
          if (!events[key]) events[key] = [];
          events[key].push({
            orderId: order.id,
            orderTitle: order.orderTitle || order.title || `Order ${order.id?.slice(-6)}`,
            stepName: step.stepName || step.name || `Step ${step.stepOrder || step.order}`,
            delayStatus: step.delayStatus,
            healthScore: step.healthScore,
            status: step.status,
            start,
            end,
          });
        }
      });
    });
    return events;
  }, [orders, stepsMap, currentYear, currentMonth, daysInMonth]);

  const selectedEvents = selectedDay ? getEventsForDay[selectedDay] || [] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ChevronLeft size={18} className="text-slate-600 dark:text-slate-400" />
        </button>
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          {MONTHS[currentMonth]} {currentYear}
        </h2>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ChevronRight size={18} className="text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      <div className="flex gap-4">
        {/* Calendar Grid */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
            {DAYS.map((d) => (
              <div key={d} className="text-[10px] font-bold text-slate-400 uppercase text-center py-2">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-700/10" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay[day] || [];
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                  className={`min-h-[80px] border-b border-r border-slate-100 dark:border-slate-700/50 p-1 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                    selectedDay === day ? "ring-2 ring-brand-500 z-10" : ""
                  } ${isToday(day) ? "bg-brand-50/50 dark:bg-brand-900/10" : ""}`}
                >
                  <div className={`text-[10px] font-bold mb-1 ${
                    isToday(day)
                      ? "text-brand-600 bg-brand-100 dark:bg-brand-900/30 w-5 h-5 rounded-full flex items-center justify-center"
                      : "text-slate-500 dark:text-slate-400"
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((evt, j) => (
                      <div
                        key={j}
                        title={`${evt.stepName} - ${evt.orderTitle}`}
                        className={`text-[8px] leading-tight px-1 py-0.5 rounded truncate text-white ${getDelayColor(evt.delayStatus)}`}
                      >
                        {evt.stepName}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[8px] text-slate-400 px-1">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Detail Sidebar */}
        {selectedDay && (
          <div className="w-72 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex-shrink-0 max-h-[500px] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
              {MONTHS[currentMonth]} {selectedDay}, {currentYear}
            </h3>
            <p className="text-[10px] text-slate-400 mb-3">{selectedEvents.length} operations</p>

            {selectedEvents.length === 0 && (
              <p className="text-xs text-slate-400 italic">No operations scheduled</p>
            )}

            <div className="space-y-2">
              {selectedEvents.map((evt, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-2 h-2 rounded-full ${getDelayColor(evt.delayStatus)}`} />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{evt.stepName}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{evt.orderTitle}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(evt.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {evt.end ? ` - ${new Date(evt.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                  </p>
                  <span className={`text-[9px] font-semibold ${
                    evt.status === "COMPLETED" ? "text-green-600" : evt.status === "IN_PROGRESS" ? "text-blue-600" : evt.status === "BLOCKED" ? "text-red-600" : "text-slate-400"
                  }`}>
                    {evt.status || "PENDING"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
