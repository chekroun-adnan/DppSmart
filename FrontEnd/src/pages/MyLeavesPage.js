import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { getMyLeaves, submitMyLeave } from "../services/authService";
import { Plus, CalendarDays, Clock, CheckCircle, XCircle, X } from "lucide-react";

const INPUT  = "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const SELECT = `${INPUT} cursor-pointer`;
const CARD   = "bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/[0.06] p-5";
const BTN    = "inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-60";
const GHOST  = "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors";
const TYPES  = ["ANNUAL", "SICK", "EMERGENCY", "UNPAID"];

function daysBetween(s, e) { return !s || !e ? 0 : Math.round((new Date(e) - new Date(s)) / 86400000) + 1; }

export default function MyLeavesPage() {
  const [leaves, setLeaves]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft]       = useState({});
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setLeaves(await getMyLeaves()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending  = leaves.filter(l => l.status === "PENDING").length;
  const approved = leaves.filter(l => l.status === "APPROVED").length;
  const rejected = leaves.filter(l => l.status === "REJECTED").length;

  const handleSubmit = async () => {
    if (!draft.type)      { setFormError("Select leave type."); return; }
    if (!draft.startDate) { setFormError("Select start date."); return; }
    if (!draft.endDate)   { setFormError("Select end date."); return; }
    setSaving(true); setFormError("");
    try { await submitMyLeave(draft); setShowCreate(false); setDraft({}); await load(); }
    catch (e) { setFormError(e.message || "Failed to submit."); }
    finally { setSaving(false); }
  };

  const typeColor   = { ANNUAL: "bg-blue-100 text-blue-700", SICK: "bg-red-100 text-red-700", EMERGENCY: "bg-orange-100 text-orange-700", UNPAID: "bg-slate-100 text-slate-600" };
  const statusStyle = { PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Employee Portal</p>
            <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">My Leaves</h1>
          </div>
          <button onClick={() => { setDraft({}); setFormError(""); setShowCreate(true); }} className={BTN}>
            <Plus size={15} />Request Leave
          </button>
        </div>

        {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Pending",  value: pending,  icon: Clock,        color: "bg-amber-100 dark:bg-amber-900/30 text-amber-500" },
            { label: "Approved", value: approved, icon: CheckCircle,  color: "bg-green-100 dark:bg-green-900/30 text-green-500" },
            { label: "Rejected", value: rejected, icon: XCircle,      color: "bg-red-100 dark:bg-red-900/30 text-red-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={CARD + " flex items-center gap-3"}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon size={18} /></div>
              <div><p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p><p className="text-xs text-slate-400">{label}</p></div>
            </div>
          ))}
        </div>

        {/* Leave history */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
          ) : leaves.length === 0 ? (
            <div className={CARD + " text-center py-12"}>
              <CalendarDays size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-500">No leave requests yet.</p>
              <p className="text-sm text-slate-400 mt-1">Submit a request using the button above.</p>
            </div>
          ) : [...leaves].reverse().map(l => (
            <div key={l.id} className={CARD + " flex items-start justify-between gap-4 flex-wrap"}>
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor[l.type] || ""}`}>{l.type}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyle[l.status] || ""}`}>{l.status}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {l.startDate} → {l.endDate} &nbsp;·&nbsp; <span className="font-medium">{daysBetween(l.startDate, l.endDate)} day{daysBetween(l.startDate, l.endDate) !== 1 ? "s" : ""}</span>
                </p>
                {l.reason && <p className="text-xs text-slate-400 italic">"{l.reason}"</p>}
                {l.rejectionReason && <p className="text-xs text-red-500">Reason: {l.rejectionReason}</p>}
              </div>
              {l.approvedBy && (
                <p className="text-xs text-slate-400 shrink-0">
                  {l.status === "APPROVED" ? "Approved" : "Reviewed"} by {l.approvedBy}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-white/[0.08]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                <h3 className="font-bold text-slate-900 dark:text-white">Request Leave</h3>
                <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06]"><X size={16} /></button>
              </div>
              <div className="p-6 space-y-4">
                {formError && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{formError}</div>}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Leave Type *</label>
                  <select className={SELECT} value={draft.type || ""} onChange={e => setDraft(p => ({ ...p, type: e.target.value }))}>
                    <option value="">Select type</option>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Start Date *</label>
                    <input className={INPUT} type="date" value={draft.startDate || ""} onChange={e => setDraft(p => ({ ...p, startDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">End Date *</label>
                    <input className={INPUT} type="date" value={draft.endDate || ""} onChange={e => setDraft(p => ({ ...p, endDate: e.target.value }))} />
                  </div>
                </div>
                {draft.startDate && draft.endDate && (
                  <p className="text-xs text-slate-500">{daysBetween(draft.startDate, draft.endDate)} day(s) requested</p>
                )}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Reason</label>
                  <textarea className={`${INPUT} h-20 resize-none`} value={draft.reason || ""} onChange={e => setDraft(p => ({ ...p, reason: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowCreate(false)} className={GHOST}>Cancel</button>
                  <button onClick={handleSubmit} disabled={saving} className={BTN}>{saving ? "Submitting…" : "Submit Request"}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
