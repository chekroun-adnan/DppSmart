import { useState, useEffect } from "react";
import { X, Clock, PlayCircle, CheckCircle, TrendingUp, Loader2 } from "lucide-react";
import { getProgressHistory } from "../services/authService";

const ACTION_ICONS = {
  STARTED: PlayCircle,
  PROGRESS: TrendingUp,
  COMPLETED: CheckCircle,
};

const ACTION_COLORS = {
  STARTED: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
  PROGRESS: "text-brand-600 bg-brand-50 dark:bg-brand-900/20",
  COMPLETED: "text-green-600 bg-green-50 dark:bg-green-900/20",
};

export default function ProgressHistoryModal({ step, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getProgressHistory(step.id || step.operationId);
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load progress history", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [step.id]);

  const required = step.requiredQuantity || step.orderQuantity || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Production History</h3>
            <p className="text-[10px] text-slate-400">{step.operationName || step.stepName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/20">
          <div className="text-center">
            <p className="text-[10px] text-slate-400">Required</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{required}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-green-600 dark:text-green-400">Completed</p>
            <p className="text-sm font-bold text-green-700 dark:text-green-300">{step.completedQuantity || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-amber-600 dark:text-amber-400">Remaining</p>
            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{step.remainingQuantity || 0}</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-brand-600" size={24} />
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div className="text-center py-8 text-sm text-slate-400 italic">No production history recorded yet.</div>
          )}

          {!loading && logs.length > 0 && (
            <div className="space-y-3">
              {logs.map((log, i) => {
                const Icon = ACTION_ICONS[log.action] || Clock;
                const color = ACTION_COLORS[log.action] || "text-slate-600 bg-slate-50 dark:bg-slate-700/50";
                const isLast = i === logs.length - 1;

                return (
                  <div key={log.id || i} className="flex gap-3">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={`p-1.5 rounded-full ${color}`}>
                        <Icon size={14} />
                      </div>
                      {!isLast && <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {log.action === "STARTED" ? "Operation Started"
                            : log.action === "COMPLETED" ? "Operation Completed"
                            : "Progress Report"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : ""}
                        </span>
                      </div>

                      {log.action === "PROGRESS" && (
                        <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-brand-600">+{log.reportedQuantity}</span> pieces completed
                          &middot; Total: {log.completedQuantity} / {required}
                          {log.remainingQuantity > 0 && ` (${log.remainingQuantity} remaining)`}
                        </div>
                      )}

                      {log.action === "STARTED" && (
                        <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                          Operation started with required quantity: {log.completedQuantity || required}
                        </div>
                      )}

                      {log.action === "COMPLETED" && (
                        <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                          All {log.completedQuantity} pieces completed
                          {log.remainingQuantity === 0 && " (100%)"}
                        </div>
                      )}

                      {log.completionPercentage != null && log.action !== "STARTED" && (
                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand-500"
                              style={{ width: `${Math.min(log.completionPercentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {Math.round(log.completionPercentage)}%
                          </span>
                        </div>
                      )}

                      {log.reportedByName && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          By: {log.reportedByName}
                        </p>
                      )}

                      {log.notes && (
                        <p className="mt-1 text-[10px] text-slate-400 italic">&ldquo;{log.notes}&rdquo;</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
