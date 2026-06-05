import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { getMyAssignments, startMyStep, completeMyStep } from "../services/authService";
import { Play, CheckCircle, Clock, Package, RefreshCw } from "lucide-react";

const CARD = "bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/[0.06] p-5";

function StatusBadge({ completed, started }) {
  if (completed) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Completed</span>;
  if (started)   return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">In Progress</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Pending</span>;
}

export default function MyTasksPage() {
  const [productions, setProductions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [saving, setSaving]           = useState({});
  const [actionMsg, setActionMsg]     = useState({});

  const employeeId = localStorage.getItem("employeeId") || localStorage.getItem("userId");

  const load = useCallback(async () => {
    setLoading(true);
    try { setProductions(await getMyAssignments()); }
    catch (e) { setError(e.message || "Failed to load."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const mySteps = productions.flatMap(prod =>
    (prod.steps || [])
      .map((step, idx) => ({ ...step, _prodId: prod.id, _stepIdx: idx, _productId: prod.productId }))
      .filter(s => s.assignedEmployeeId === employeeId)
  );

  const pending    = mySteps.filter(s => !s.completed && !s.startDate);
  const inProgress = mySteps.filter(s => !s.completed && s.startDate);
  const completed  = mySteps.filter(s => s.completed);

  const handleStart = async (prodId, stepIdx) => {
    const key = `${prodId}-${stepIdx}`;
    setSaving(p => ({ ...p, [key]: true })); setActionMsg({});
    try { await startMyStep(prodId, stepIdx); await load(); setActionMsg({ [key]: "Started!" }); }
    catch (e) { setActionMsg({ [key]: e.message || "Failed." }); }
    finally { setSaving(p => ({ ...p, [key]: false })); }
  };

  const handleComplete = async (prodId, stepIdx) => {
    const key = `${prodId}-${stepIdx}`;
    setSaving(p => ({ ...p, [key]: true })); setActionMsg({});
    try { await completeMyStep(prodId, stepIdx); await load(); setActionMsg({ [key]: "Completed!" }); }
    catch (e) { setActionMsg({ [key]: e.message || "Failed." }); }
    finally { setSaving(p => ({ ...p, [key]: false })); }
  };

  const StepCard = ({ step }) => {
    const key = `${step._prodId}-${step._stepIdx}`;
    const isStarted = !!step.startDate && !step.completed;
    return (
      <div className={CARD + " space-y-3"}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="font-semibold text-slate-900 dark:text-white">{step.operationName || step.stepName}</p>
            {step.instructions && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{step.instructions}</p>}
          </div>
          <StatusBadge completed={step.completed} started={isStarted} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {step.orderQuantity && <div><span className="text-slate-400">Qty: </span><span className="font-medium text-slate-700 dark:text-slate-300">{step.orderQuantity}</span></div>}
          {step.durationPerUnit && <div><span className="text-slate-400">Time/unit: </span><span className="font-medium text-slate-700 dark:text-slate-300">{step.durationPerUnit}{step.durationUnit || "min"}</span></div>}
          {step.totalDuration && <div><span className="text-slate-400">Total: </span><span className="font-medium text-slate-700 dark:text-slate-300">{step.totalDuration}min</span></div>}
        </div>
        {step.machine && <p className="text-xs text-slate-400"><span className="font-medium">Machine:</span> {step.machine}</p>}
        {actionMsg[key] && <p className="text-xs text-green-600 dark:text-green-400">{actionMsg[key]}</p>}
        {!step.completed && (
          <div className="flex gap-2 pt-1">
            {!isStarted && (
              <button onClick={() => handleStart(step._prodId, step._stepIdx)} disabled={saving[key]} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-colors disabled:opacity-60">
                <Play size={12} />{saving[key] ? "Starting…" : "Start"}
              </button>
            )}
            {isStarted && (
              <button onClick={() => handleComplete(step._prodId, step._stepIdx)} disabled={saving[key]} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors disabled:opacity-60">
                <CheckCircle size={12} />{saving[key] ? "Completing…" : "Complete"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Employee Portal</p>
            <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">My Tasks</h1>
            <p className="mt-1 text-sm text-slate-500">Production steps assigned to you</p>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.06] text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
            <RefreshCw size={14} />Refresh
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Pending", value: pending.length, icon: Clock, color: "bg-amber-100 dark:bg-amber-900/30 text-amber-500" },
            { label: "In Progress", value: inProgress.length, icon: Play, color: "bg-brand-100 dark:bg-brand-900/30 text-brand-600" },
            { label: "Completed", value: completed.length, icon: CheckCircle, color: "bg-green-100 dark:bg-green-900/30 text-green-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={CARD + " flex items-center gap-3"}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon size={18} /></div>
              <div><p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p><p className="text-xs text-slate-400">{label}</p></div>
            </div>
          ))}
        </div>

        {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
        ) : mySteps.length === 0 ? (
          <div className={CARD + " text-center py-16"}>
            <Package size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-500">No tasks assigned yet.</p>
            <p className="text-sm text-slate-400 mt-1">Your production assignments will appear here.</p>
          </div>
        ) : (
          <>
            {inProgress.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">In Progress</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{inProgress.map((s, i) => <StepCard key={i} step={s} />)}</div>
              </div>
            )}
            {pending.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Pending</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{pending.map((s, i) => <StepCard key={i} step={s} />)}</div>
              </div>
            )}
            {completed.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Completed</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{completed.map((s, i) => <StepCard key={i} step={s} />)}</div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
