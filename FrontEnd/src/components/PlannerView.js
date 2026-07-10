import { useState, useEffect, useCallback } from "react";
import { getDepartmentQueues, getProductionOrders, startProductionOrderStep } from "../services/authService";
import { Loader2, GripVertical, AlertTriangle, CheckCircle, Clock } from "lucide-react";

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

function OperationCard({ operation, department, onStart }) {
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    if (!operation.id) return;
    setStarting(true);
    try {
      await startProductionOrderStep(operation.id);
      onStart?.();
    } catch (err) {
      console.error("Failed to start operation", err);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div
      draggable
      className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow ${
        operation.delayStatus === "DELAYED" ? "border-l-red-500 border-l-2" : operation.delayStatus === "AT_RISK" ? "border-l-amber-500 border-l-2" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical size={12} className="text-slate-300 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {operation.stepName || operation.operationName || operation.operation || "Unnamed"}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              Order: {operation.orderTitle || operation.orderId?.slice(-6) || "-"}
            </p>
          </div>
        </div>
        {getDelayIcon(operation.delayStatus)}
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          {operation.department && <span>{operation.department}</span>}
          {operation.delayMinutes > 0 && (
            <span className="text-red-500 font-semibold">{operation.delayMinutes}min delay</span>
          )}
        </div>
        {operation.status === "PENDING" && (
          <button
            onClick={handleStart}
            disabled={starting}
            className="text-[10px] font-bold text-brand-600 hover:text-brand-700 disabled:opacity-50 transition-colors"
          >
            {starting ? "..." : "Start"}
          </button>
        )}
        {operation.status === "IN_PROGRESS" && (
          <span className="text-[10px] font-bold text-blue-600">In Progress</span>
        )}
        {operation.status === "COMPLETED" && (
          <span className="text-[10px] font-bold text-green-600">Done</span>
        )}
      </div>

      {/* Time */}
      {(operation.plannedStart || operation.startTime) && (
        <div className="mt-1 text-[9px] text-slate-400">
          {new Date(operation.plannedStart || operation.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
    </div>
  );
}

export default function PlannerView() {
  const [queues, setQueues] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [viewMode, setViewMode] = useState("queues");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [queueData, ordersData] = await Promise.all([
        getDepartmentQueues(selectedDepartment || undefined),
        getProductionOrders(),
      ]);
      setQueues(Array.isArray(queueData) ? queueData : []);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (err) {
      console.error("Failed to load planner data", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  const getOperations = (queue) => {
    return [
      ...(queue.delayedOperations || []).map(op => ({ ...op, _section: "delayed" })),
      ...(queue.todayOperations || []).map(op => ({ ...op, _section: "today" })),
      ...(queue.upcomingOperations || []).map(op => ({ ...op, _section: "upcoming" })),
    ];
  };

  if (queues.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-slate-400">No planner data available. Generate steps for orders first.</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
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
        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={() => setViewMode("queues")}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
              viewMode === "queues" ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
            }`}
          >
            Queues
          </button>
          <button
            onClick={() => setViewMode("board")}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
              viewMode === "board" ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
            }`}
          >
            Board
          </button>
        </div>
      </div>

      {viewMode === "queues" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {queues.map((queue, i) => {
            const operations = getOperations(queue);
            return (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">{queue.departmentName || queue.department}</h3>
                  <p className="text-[10px] text-slate-400">{operations.length} operations</p>
                </div>
                <div className="p-2 space-y-2 max-h-[400px] overflow-y-auto">
                  {operations.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4 italic">No operations</p>
                  )}
                  {operations.map((op, j) => (
                    <OperationCard key={j} operation={op} department={queue.departmentName || queue.department} onStart={fetchData} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Pending */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 rounded-t-xl">
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400">Pending</h3>
            </div>
            <div className="p-2 space-y-2 min-h-[200px]">
              {queues.flatMap(q => (q.todayOperations || []).concat(q.upcomingOperations || [])).filter(op => op.status === "PENDING" || !op.status).slice(0, 10).map((op, j) => (
                <OperationCard key={j} operation={op} onStart={fetchData} />
              ))}
              {queues.flatMap(q => (q.todayOperations || []).concat(q.upcomingOperations || [])).filter(op => op.status === "PENDING" || !op.status).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6 italic">No pending operations</p>
              )}
            </div>
          </div>

          {/* In Progress */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20 rounded-t-xl">
              <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400">In Progress</h3>
            </div>
            <div className="p-2 space-y-2 min-h-[200px]">
              {queues.flatMap(q => (q.todayOperations || []).concat(q.upcomingOperations || [])).filter(op => op.status === "IN_PROGRESS").map((op, j) => (
                <OperationCard key={j} operation={op} onStart={fetchData} />
              ))}
              {queues.flatMap(q => (q.todayOperations || []).concat(q.upcomingOperations || [])).filter(op => op.status === "IN_PROGRESS").length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6 italic">No operations in progress</p>
              )}
            </div>
          </div>

          {/* Delayed */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-red-50 dark:bg-red-900/20 rounded-t-xl">
              <h3 className="text-xs font-bold text-red-600 dark:text-red-400">Delayed</h3>
            </div>
            <div className="p-2 space-y-2 min-h-[200px]">
              {queues.flatMap(q => q.delayedOperations || []).map((op, j) => (
                <OperationCard key={j} operation={op} onStart={fetchData} />
              ))}
              {queues.flatMap(q => q.delayedOperations || []).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6 italic">No delayed operations</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
