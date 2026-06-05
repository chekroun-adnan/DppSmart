import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import OrgSelector from "../components/OrgSelector";
import {
  getAttendance, getAttendanceByOrg, checkIn, checkOut,
  getMainOrganizations, getMyOrganizations, getSubOrganizations,
  getEmployees,
} from "../services/authService";
import { Clock, LogIn, LogOut, Users, CheckCircle, X } from "lucide-react";

const INPUT = "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const SELECT = `${INPUT} cursor-pointer`;
const BTN_PRIMARY = "inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors";
const BTN_GHOST = "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors";

const loadOrgs = () => {
  const r = (localStorage.getItem("userRole") || "").toUpperCase();
  return r === "ADMIN"
    ? Promise.all([getMainOrganizations(), getSubOrganizations()]).then(([m, s]) => [...m, ...s])
    : getMyOrganizations();
};

function formatTime(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(minutes) {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function StatusChip({ status }) {
  const map = {
    PRESENT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    COMPLETED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    ABSENT: "bg-red-100 text-red-700",
    ON_BREAK: "bg-amber-100 text-amber-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || "bg-slate-100 text-slate-500"}`}>{status}</span>;
}

export default function AttendancePage() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(() => localStorage.getItem("orgId") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInForm, setCheckInForm] = useState({ employeeId: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const role = (localStorage.getItem("userRole") || "").toUpperCase();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recs, emps, orgData] = await Promise.all([getAttendance(), getEmployees(), loadOrgs()]);
      setRecords(recs);
      setEmployees(emps);
      setOrgs(orgData);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = records.filter(r => {
    if (selectedOrgId && r.organizationId !== selectedOrgId) return false;
    const q = search.toLowerCase();
    return !q || r.employeeName?.toLowerCase().includes(q);
  });

  const todayRecords = filtered.filter(r => {
    const d = new Date(r.checkIn);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const handleCheckIn = async () => {
    if (!checkInForm.employeeId) return setActionError("Select an employee.");
    setSaving(true); setActionError("");
    try {
      const emp = employees.find(e => e.id === checkInForm.employeeId);
      await checkIn({ ...checkInForm, organizationId: emp?.organizationId || selectedOrgId });
      setShowCheckIn(false);
      setCheckInForm({ employeeId: "", notes: "" });
      await load();
    } catch (e) { setActionError(e.message || "Check-in failed."); }
    finally { setSaving(false); }
  };

  const handleCheckOut = async (employeeId) => {
    try { await checkOut(employeeId); await load(); }
    catch (e) { setActionError(e.message); }
  };

  const presentToday = todayRecords.filter(r => r.status === "PRESENT").length;
  const completedToday = todayRecords.filter(r => r.status === "COMPLETED").length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Attendance</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track daily employee check-ins and check-outs</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <OrgSelector orgs={orgs} selectedOrgId={selectedOrgId} onSelect={setSelectedOrgId} />
            {role !== "EMPLOYEE" && (
              <button onClick={() => { setShowCheckIn(true); setActionError(""); }} className={BTN_PRIMARY}>
                <LogIn size={15} />Check In
              </button>
            )}
          </div>
        </div>

        {error && <div className="text-sm text-red-500">{error}</div>}
        {actionError && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{actionError}</div>}

        {/* Today's summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Present Now", value: presentToday, icon: Users, color: "text-green-500 bg-green-100 dark:bg-green-900/30" },
            { label: "Completed Today", value: completedToday, icon: CheckCircle, color: "text-blue-500 bg-blue-100 dark:bg-blue-900/30" },
            { label: "Total Records", value: filtered.length, icon: Clock, color: "text-slate-500 bg-slate-100 dark:bg-white/[0.05]" },
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

        {/* Search */}
        <input className={`${INPUT} max-w-xs`} placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} />

        {/* Records table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.06]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-white/[0.03]">
              <tr>
                {["Employee", "Date", "Check In", "Check Out", "Work Duration", "Overtime", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No records found.</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.employeeName}</td>
                  <td className="px-4 py-3 text-slate-500">{r.checkIn ? new Date(r.checkIn).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTime(r.checkIn)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTime(r.checkOut)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDuration(r.workDurationMinutes)}</td>
                  <td className="px-4 py-3 text-amber-600">{r.overtimeDurationMinutes > 0 ? formatDuration(r.overtimeDurationMinutes) : "—"}</td>
                  <td className="px-4 py-3"><StatusChip status={r.status} /></td>
                  <td className="px-4 py-3">
                    {r.status === "PRESENT" && role !== "EMPLOYEE" && (
                      <button onClick={() => handleCheckOut(r.employeeId)} className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
                        <LogOut size={13} />Check Out
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Check In Modal */}
        {showCheckIn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-white/[0.08]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                <h3 className="font-bold text-slate-900 dark:text-white">Check In Employee</h3>
                <button onClick={() => setShowCheckIn(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06]"><X size={16} /></button>
              </div>
              <div className="p-6 space-y-4">
                {actionError && <div className="text-sm text-red-500">{actionError}</div>}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Employee *</label>
                  <select className={SELECT} value={checkInForm.employeeId} onChange={e => setCheckInForm(p => ({ ...p, employeeId: e.target.value }))}>
                    <option value="">Select employee</option>
                    {employees.filter(e => !selectedOrgId || e.organizationId === selectedOrgId).map(e => (
                      <option key={e.id} value={e.id}>{e.fullName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Notes</label>
                  <input className={INPUT} value={checkInForm.notes} onChange={e => setCheckInForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowCheckIn(false)} className={BTN_GHOST}>Cancel</button>
                  <button onClick={handleCheckIn} disabled={saving} className={BTN_PRIMARY}><LogIn size={14} />{saving ? "Checking in…" : "Check In"}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
