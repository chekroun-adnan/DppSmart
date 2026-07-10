import { useState } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { reportProgress } from "../services/authService";

export default function ReportProgressModal({ step, onClose, onReported }) {
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [markComplete, setMarkComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const required = step.requiredQuantity || step.orderQuantity || 0;
  const completed = step.completedQuantity || 0;
  const remaining = required - completed;
  const maxReport = Math.min(remaining, required);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const q = parseInt(quantity, 10);
    if (!q || q <= 0) {
      setError("Quantity must be positive.");
      return;
    }
    if (q > maxReport) {
      setError(`Cannot report more than ${maxReport} (remaining quantity).`);
      return;
    }

    setSubmitting(true);
    try {
      await reportProgress(step.id || step.operationId, { quantity: q, notes: notes || undefined, markComplete });
      onReported?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to report progress.");
    } finally {
      setSubmitting(false);
    }
  };

  const willComplete = markComplete || completed + (parseInt(quantity, 10) || 0) >= required;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Report Production Progress</h3>
            <p className="text-[10px] text-slate-400">{step.operationName || step.stepName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Current status */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
              <p className="text-[10px] text-slate-400">Required</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{required}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
              <p className="text-[10px] text-green-600 dark:text-green-400">Completed</p>
              <p className="text-sm font-bold text-green-700 dark:text-green-300">{completed}</p>
            </div>
            <div className={`rounded-lg p-2 ${remaining > 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-slate-50 dark:bg-slate-700/50"}`}>
              <p className="text-[10px] text-amber-600 dark:text-amber-400">Remaining</p>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{remaining}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>Progress</span>
              <span>{required > 0 ? Math.round(completed / required * 100) : 0}%</span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${required > 0 ? Math.min(completed / required * 100, 100) : 0}%` }}
              />
            </div>
          </div>

          {/* Quantity input */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Quantity to report
            </label>
            <input
              type="number"
              min={1}
              max={maxReport}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder={`Enter quantity (max: ${maxReport})`}
              className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
              autoFocus
            />
            <p className="text-[10px] text-slate-400 mt-1">Remaining: {remaining} pieces</p>
          </div>

          {/* Mark as final */}
          <label className="flex items-start gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={markComplete}
              onChange={e => setMarkComplete(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500"
            />
            <div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-brand-600 transition-colors">
                This is the final quantity
              </span>
              <p className="text-[10px] text-slate-400">
                Close the operation even if the full required quantity hasn't been produced.
              </p>
            </div>
          </label>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any remarks about this production run..."
              className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Will complete message */}
          {willComplete && quantity > 0 && (
            <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
              This will complete the operation.
            </div>
          )}

          {error && (
            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !quantity || parseInt(quantity, 10) <= 0}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {willComplete ? "Complete Operation" : "Report Progress"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
