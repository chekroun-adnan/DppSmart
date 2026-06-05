import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { getMyAttendance, checkInSelf, checkOutSelf } from "../services/authService";
import { LogIn, LogOut, Clock, CheckCircle, AlertTriangle } from "lucide-react";

const CARD = "bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/[0.06] p-5";

function fmt(dt) { return dt ? new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"; }
function fmtDate(dt) { return dt ? new Date(dt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : "—"; }
function fmtDur(m) { return !m ? "—" : m >= 60 ? `${Math.floor(m / 60)}h ${Math.round(m % 60)}m` : `${Math.round(m)}m`; }

export default function MyAttendancePage() {
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [msg, setMsg]           = useState("");
  const [acting, setActing]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRecords(await getMyAttendance()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const todayStr     = new Date().toDateString();
  const todayRecord  = records.find(r => r.checkIn && new Date(r.checkIn).toDateString() === todayStr);
  const isPresent    = todayRecord?.status === "PRESENT";
  const totalHours   = records.filter(r => r.workDurationMinutes).reduce((s, r) => s + r.workDurationMinutes, 0);
  const avgHours     = records.length > 0 ? (totalHours / records.length / 60).toFixed(1) : "—";

  const handleCheckIn = async () => {
    setActing(true); setMsg(""); setError("");
    try { await checkInSelf(); setMsg("Checked in successfully!"); await load(); }
    catch (e) { setError(e.message || "Check-in failed."); }
    finally { setActing(false); }
  };

  const handleCheckOut = async () => {
    setActing(true); setMsg(""); setError("");
    try { await checkOutSelf(); setMsg("Checked out. Have a great day!"); await load(); }
    catch (e) { setError(e.message || "Check-out failed."); }
    finally { setActing(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Employee Portal</p>
            <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">My Attendance</h1>
          </div>
          <div className="flex items-center gap-3">
            {!isPresent ? (
              <button onClick={handleCheckIn} disabled={acting} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                <LogIn size={15} />{acting ? "Checking in…" : "Check In"}
              </button>
            ) : (
              <button onClick={handleCheckOut} disabled={acting} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                <LogOut size={15} />{acting ? "Checking out…" : "Check Out"}
              </button>
            )}
          </div>
        </div>

        {msg   && <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-xl">{msg}</div>}
        {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{error}</div>}

        {/* Today's summary */}
        <div className={CARD}>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Today</h3>
          {todayRecord ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Status",     value: todayRecord.status },
                { label: "Check In",   value: fmt(todayRecord.checkIn) },
                { label: "Check Out",  value: fmt(todayRecord.checkOut) },
                { label: "Hours",      value: fmtDur(todayRecord.workDurationMinutes) },
              ].map(({ label, value }) => (
                <div key={label} className="text-center p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <AlertTriangle size={18} className="text-amber-500 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">You haven't checked in today.</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Records",   value: records.length, icon: Clock, color: "bg-blue-100 dark:bg-blue-900/30 text-blue-500" },
            { label: "Avg Daily Hours", value: avgHours === "—" ? "—" : `${avgHours}h`, icon: CheckCircle, color: "bg-green-100 dark:bg-green-900/30 text-green-500" },
            { label: "Days Present",    value: records.filter(r => r.status === "COMPLETED").length, icon: Clock, color: "bg-brand-100 dark:bg-brand-900/30 text-brand-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={CARD + " flex items-center gap-3"}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon size={18} /></div>
              <div><p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p><p className="text-xs text-slate-400">{label}</p></div>
            </div>
          ))}
        </div>

        {/* History table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.06]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-white/[0.03]">
              <tr>{["Date", "Check In", "Check Out", "Hours Worked", "Overtime", "Status"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center"><div className="w-7 h-7 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" /></td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No attendance records yet.</td></tr>
              ) : [...records].reverse().map(r => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{fmtDate(r.checkIn)}</td>
                  <td className="px-4 py-3 text-slate-600">{fmt(r.checkIn)}</td>
                  <td className="px-4 py-3 text-slate-600">{fmt(r.checkOut)}</td>
                  <td className="px-4 py-3 font-medium text-green-600">{fmtDur(r.workDurationMinutes)}</td>
                  <td className="px-4 py-3 text-amber-600">{r.overtimeDurationMinutes > 0 ? fmtDur(r.overtimeDurationMinutes) : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.status === "PRESENT" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : r.status === "COMPLETED" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-slate-100 text-slate-500"}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
