import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import OrgSelector from "../components/OrgSelector";
import {
  getLeaves, createLeaveRequest, approveLeave, rejectLeave,
  getMainOrganizations, getMyOrganizations, getSubOrganizations,
  getEmployees,
} from "../services/authService";
import { Plus, CheckCircle, XCircle, Clock, X, CalendarDays } from "lucide-react";

const INPUT = "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const SELECT = `${INPUT} cursor-pointer`;
const BTN_PRIMARY = "inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors";
const BTN_GHOST = "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors";

const LEAVE_TYPES = ["ANNUAL", "SICK", "EMERGENCY", "UNPAID"];

const loadOrgs = () => {
  const r = (localStorage.getItem("userRole") || "").toUpperCase();
  return r === "ADMIN"
    ? Promise.all([getMainOrganizations(), getSubOrganizations()]).then(([m, s]) => [...m, ...s])
    : getMyOrganizations();
};

function StatusChip({ status }) {
  const map = {
    PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || ""}`}>{status}</span>;
}

function TypeChip({ type }) {
  const map = {
    ANNUAL: "bg-blue-100 text-blue-700",
    SICK: "bg-red-100 text-red-700",
    EMERGENCY: "bg-orange-100 text-orange-700",
    UNPAID: "bg-slate-100 text-slate-600",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[type] || ""}`}>{type}</span>;
}

function daysBetween(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start), e = new Date(end);
  return Math.round((e - s) / 86400000) + 1;
}

export default function LeavesPage() {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(() => localStorage.getItem("orgId") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const role = (localStorage.getItem("userRole") || "").toUpperCase();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leavData, empData, orgData] = await Promise.all([getLeaves(), getEmployees(), loadOrgs()]);
      setLeaves(leavData);
      setEmployees(empData);
      setOrgs(orgData);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = leaves.filter(l => {
    if (selectedOrgId && l.organizationId !== selectedOrgId) return false;
    if (statusFilter !== "ALL" && l.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return !q || l.employeeName?.toLowerCase().includes(q);
  });

  const handleCreate = async () => {
    if (!draft.employeeId) return setActionError("Select an employee.");
    if (!draft.type) return setActionError("Select leave type.");
    if (!draft.startDate || !draft.endDate) return setActionError("Select dates.");
    setSaving(true); setActionError("");
    try {
      const emp = employees.find(e => e.id === draft.employeeId);
      await createLeaveRequest({ ...draft, organizationId: emp?.organizationId || selectedOrgId });
      setShowCreate(false); setDraft({});
      await load();
    } catch (e) { setActionError(e.message || "Failed to submit."); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id) => {
    try { await approveLeave(id); await load(); }
    catch (e) { setActionError(e.message); }
  };

  const handleReject = async () => {
    try { await rejectLeave(rejectModal, rejectReason); setRejectModal(null); setRejectReason(""); await load(); }
    catch (e) { setActionError(e.message); }
  };

  const pending = leaves.filter(l => l.status === "PENDING").length;
  const approved = leaves.filter(l => l.status === "APPROVED").length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Leave Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Review and manage employee leave requests</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <OrgSelector orgs={orgs} selectedOrgId={selectedOrgId} onSelect={setSelectedOrgId} />
            <button onClick={() => { setDraft({}); setActionError(""); setShowCreate(true); }} className={BTN_PRIMARY}>
              <Plus size={15} />New Request
            </button>
          </div>
        </div>

        {error && <div className="text-sm text-red-500">{error}</div>}
        {actionError && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{actionError}</div>}

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Pending Requests", value: pending, icon: Clock, color: "text-amber-500 bg-amber-100 dark:bg-amber-900/30" },
            { label: "Approved", value: approved, icon: CheckCircle, color: "text-green-500 bg-green-100 dark:bg-green-900/30" },
            { label: "Total Requests", value: leaves.length, icon: CalendarDays, color: "text-blue-500 bg-blue-100 dark:bg-blue-900/30" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/[0.06] p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}><Icon size={20} /></div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <input className={`${INPUT} max-w-xs`} placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className={`${SELECT} w-40`} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Requests table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.06]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-white/[0.03]">
              <tr>
                {["Employee", "Type", "Start", "End", "Days", "Reason", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No leave requests found.</td></tr>
              ) : filtered.map(l => (
                <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{l.employeeName}</td>
                  <td className="px-4 py-3"><TypeChip type={l.type} /></td>
                  <td className="px-4 py-3 text-slate-600">{l.startDate}</td>
                  <td className="px-4 py-3 text-slate-600">{l.endDate}</td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{daysBetween(l.startDate, l.endDate)}d</td>
                  <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">{l.reason || "—"}</td>
                  <td className="px-4 py-3"><StatusChip status={l.status} /></td>
                  <td className="px-4 py-3">
                    {l.status === "PENDING" && role !== "EMPLOYEE" && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleApprove(l.id)} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"><CheckCircle size={15} /></button>
                        <button onClick={() => { setRejectModal(l.id); setRejectReason(""); }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><XCircle size={15} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-white/[0.08]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                <h3 className="font-bold text-slate-900 dark:text-white">New Leave Request</h3>
                <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06]"><X size={16} /></button>
              </div>
              <div className="p-6 space-y-4">
                {actionError && <div className="text-sm text-red-500">{actionError}</div>}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Employee *</label>
                  <select className={SELECT} value={draft.employeeId || ""} onChange={e => setDraft(p => ({ ...p, employeeId: e.target.value }))}>
                    <option value="">Select employee</option>
                    {employees.filter(e => !selectedOrgId || e.organizationId === selectedOrgId).map(e => (
                      <option key={e.id} value={e.id}>{e.fullName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Leave Type *</label>
                  <select className={SELECT} value={draft.type || ""} onChange={e => setDraft(p => ({ ...p, type: e.target.value }))}>
                    <option value="">Select type</option>
                    {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Reason</label>
                  <textarea className={`${INPUT} h-20 resize-none`} value={draft.reason || ""} onChange={e => setDraft(p => ({ ...p, reason: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowCreate(false)} className={BTN_GHOST}>Cancel</button>
                  <button onClick={handleCreate} disabled={saving} className={BTN_PRIMARY}>{saving ? "Submitting…" : "Submit Request"}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {rejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-white/[0.08]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                <h3 className="font-bold text-slate-900 dark:text-white">Reject Leave</h3>
                <button onClick={() => setRejectModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06]"><X size={16} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Reason (optional)</label>
                  <textarea className={`${INPUT} h-20 resize-none`} value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setRejectModal(null)} className={BTN_GHOST}>Cancel</button>
                  <button onClick={handleReject} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Reject</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
