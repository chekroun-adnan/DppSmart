import { useState, useEffect, useCallback } from "react";
import { getDepartmentQueues } from "../services/authService";
import { Clock, AlertTriangle, CheckCircle, Users, Loader2 } from "lucide-react";

const DEPARTMENTS = [
  { value: "", label: "All Departments" },
  { value: "Découpe", label: "Découpe" },
  { value: "Fabrication", label: "Fabrication" },
  { value: "Peinture", label: "Peinture" },
  { value: "Chaudronnerie", label: "Chaudronnerie" },
  { value: "Montage", label: "Montage" },
  { value: "Contrôle", label: "Contrôle" },
  { value: "Expédition", label: "Expédition" },
];

function getHealthColor(score) {
  if (score == null) return "bg-slate-200 dark:bg-slate-600";
  if (score >= 80) return "bg-green-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function getDelayIcon(status) {
  switch (status) {
    case "DELAYED":
      return <AlertTriangle size={14} className="text-red-500" />;
    case "AT_RISK":
      return <Clock size={14} className="text-amber-500" />;
    default:
      return <CheckCircle size={14} className="text-green-500" />;
  }
}

export default function DepartmentQueuesView() {
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [expandedDept, setExpandedDept] = useState(null);

  const fetchQueues = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDepartmentQueues(selectedDepartment || undefined);
      setQueues(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load department queues", err);
      setQueues([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  const capacityLabel = (status) => {
    switch (status) {
      case "OVERLOADED": return "Overloaded";
      case "UNDERUTILIZED": return "Underutilized";
      default: return "Normal";
    }
  };

  const capacityColor = (status) => {
    switch (status) {
      case "OVERLOADED": return "text-red-600 bg-red-50 dark:bg-red-900/20";
      case "UNDERUTILIZED": return "text-amber-600 bg-amber-50 dark:bg-amber-900/20";
      default: return "text-green-600 bg-green-50 dark:bg-green-900/20";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Department:</label>
        <select
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
          className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
        >
          {DEPARTMENTS.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>

      {queues.length === 0 && !loading && (
        <div className="text-center py-12 text-sm text-slate-400">No department queues found.</div>
      )}

      {queues.map((queue, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setExpandedDept(expandedDept === i ? null : i)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-900/20">
                <Users size={18} className="text-brand-600" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">{queue.departmentName || queue.department}</h3>
                <p className="text-xs text-slate-400">
                  {queue.todayOperations?.length || 0} today &middot; {queue.upcomingOperations?.length || 0} upcoming &middot; {queue.delayedOperations?.length || 0} delayed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {queue.assignedHours ?? 0}h / {queue.availableHours ?? 0}h
                </div>
                <div className="text-[10px] text-slate-400">
                  {queue.utilizationPercent != null ? queue.utilizationPercent.toFixed(0) : 0}% utilized
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${capacityColor(queue.capacityStatus)}`}>
                {capacityLabel(queue.capacityStatus)}
              </span>
            </div>
          </button>

          {/* Expanded Content */}
          {expandedDept === i && (
            <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-4">
              {/* Today's Operations */}
              {queue.todayOperations?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Today's Operations</h4>
                  <div className="space-y-1">
                    {queue.todayOperations.map((op, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-1.5">
                        {getDelayIcon(op.delayStatus)}
                        <span className="font-medium">{op.operationName}</span>
                        <span className="text-slate-400">&middot;</span>
                        <span>Order: {op.orderReference || op.orderId?.slice(-6) || "-"}</span>
                        {(op.plannedStartDateTime || op.plannedStart) && (
                          <>
                            <span className="text-slate-400">&middot;</span>
                            <span>{new Date(op.plannedStartDateTime || op.plannedStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </>
                        )}
                        {/* Quantity / Progress */}
                        {op.requiredQuantity > 0 && (
                          <>
                            <span className="text-slate-400">&middot;</span>
                            <span className={op.remainingQuantity > 0 ? "text-amber-600" : "text-green-600"}>
                              {op.completedQuantity || 0}/{op.requiredQuantity}
                            </span>
                          </>
                        )}
                        {op.healthScore != null && (
                          <span className={`ml-auto w-2 h-2 rounded-full ${getHealthColor(op.healthScore)}`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Operations */}
              {queue.upcomingOperations?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Upcoming</h4>
                  <div className="flex flex-wrap gap-1">
                    {queue.upcomingOperations.map((op, j) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                        {op.operationName}
                        {op.requiredQuantity > 0 && ` (${op.completedQuantity || 0}/${op.requiredQuantity})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Delayed Operations */}
              {queue.delayedOperations?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-red-600 dark:text-red-400 mb-2">Delayed</h4>
                  <div className="space-y-1">
                    {queue.delayedOperations.map((op, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-1.5">
                        <AlertTriangle size={12} className="text-red-500" />
                        <span className="font-medium">{op.operationName}</span>
                        <span className="text-red-400">&middot;</span>
                        <span>Delay: {op.delayMinutes ?? 0}min</span>
                        {op.requiredQuantity > 0 && (
                          <>
                            <span className="text-red-400">&middot;</span>
                            <span>{op.completedQuantity || 0}/{op.requiredQuantity}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Capacity Bar */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>Capacity</span>
                  <span>{queue.assignedHours ?? 0}h / {queue.availableHours ?? 0}h</span>
                </div>
                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (queue.utilizationPercent || 0) > 100
                        ? "bg-red-500"
                        : (queue.utilizationPercent || 0) > 80
                          ? "bg-amber-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min((queue.utilizationPercent || 0), 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
