import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import {
  getMyProfile, getMyAssignments, getMyAttendance,
  checkInSelf, checkOutSelf, getMyLeaves, getEmployeePerformance,
} from "../services/authService";
import {
  ClipboardList, Clock, CalendarDays, TrendingUp,
  LogIn, LogOut, CheckCircle, AlertTriangle, User, Building2,
} from "lucide-react";

const CARD = "bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/[0.06] p-5";

function KpiCard({ label, value, icon: Icon, colorClass, to }) {
  const inner = (
    <div className={`${CARD} flex items-center gap-4 ${to ? "hover:shadow-md transition-shadow" : ""}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorClass}`}><Icon size={20} /></div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function EmployeeDashboardPage() {
  const [profile, setProfile]         = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [attendance, setAttendance]   = useState([]);
  const [leaves, setLeaves]           = useState([]);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [checkingIn, setCheckingIn]   = useState(false);
  const [attendanceMsg, setAttendanceMsg] = useState("");

  const employeeId = localStorage.getItem("employeeId") || localStorage.getItem("userId");
  const fullName   = localStorage.getItem("userDisplayName") || localStorage.getItem("userEmail");

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      getMyProfile(),
      getMyAssignments(),
      getMyAttendance(),
      getMyLeaves(),
      getEmployeePerformance(employeeId),
    ]).then(([prof, assign, attend, leav, perf]) => {
      if (!mounted) return;
      if (prof.status === "fulfilled") setProfile(prof.value);
      if (assign.status === "fulfilled") setAssignments(assign.value || []);
      if (attend.status === "fulfilled") setAttendance(attend.value || []);
      if (leav.status === "fulfilled") setLeaves(leav.value || []);
      if (perf.status === "fulfilled") setPerformance(perf.value);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [employeeId]);

  const todayStr = new Date().toDateString();
  const todayRecord = attendance.find(a => a.checkIn && new Date(a.checkIn).toDateString() === todayStr);
  const isPresent = todayRecord?.status === "PRESENT";
  const activeSteps = assignments.flatMap(p => (p.steps || []).filter(s => !s.completed && s.assignedEmployeeId === employeeId));
  const completedToday = assignments.flatMap(p => (p.steps || []).filter(s => s.completed && s.assignedEmployeeId === employeeId)).length;
  const pendingLeaves = leaves.filter(l => l.status === "PENDING").length;

  const handleCheckIn = async () => {
    setCheckingIn(true); setAttendanceMsg("");
    try { await checkInSelf(); setAttendanceMsg("Checked in successfully!"); const d = await getMyAttendance(); setAttendance(d); }
    catch (e) { setAttendanceMsg(e.message || "Failed to check in."); }
    finally { setCheckingIn(false); }
  };

  const handleCheckOut = async () => {
    setCheckingIn(true); setAttendanceMsg("");
    try { await checkOutSelf(); setAttendanceMsg("Checked out. Have a great day!"); const d = await getMyAttendance(); setAttendance(d); }
    catch (e) { setAttendanceMsg(e.message || "Failed to check out."); }
    finally { setCheckingIn(false); }
  };

  const fmt = dt => dt ? new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Employee Portal</p>
            <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Welcome, {profile?.fullName || fullName?.split("@")[0]}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {profile?.departmentName ? `${profile.departmentName} · ` : ""}
              {profile?.employeeCode || profile?.position || "Employee"}
            </p>
          </div>
          {/* Attendance quick action */}
          <div className="flex flex-col items-end gap-2">
            {!isPresent ? (
              <button onClick={handleCheckIn} disabled={checkingIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                <LogIn size={15} />{checkingIn ? "Checking in…" : "Check In"}
              </button>
            ) : (
              <button onClick={handleCheckOut} disabled={checkingIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                <LogOut size={15} />{checkingIn ? "Checking out…" : "Check Out"}
              </button>
            )}
            {attendanceMsg && <p className="text-xs text-green-600 dark:text-green-400">{attendanceMsg}</p>}
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard label="Active Tasks" value={activeSteps.length} icon={ClipboardList} colorClass="bg-brand-100 dark:bg-brand-900/30 text-brand-600" to="/my-tasks" />
          <KpiCard label="Completed Today" value={completedToday} icon={CheckCircle} colorClass="bg-green-100 dark:bg-green-900/30 text-green-500" to="/my-tasks" />
          <KpiCard label="Pending Leaves" value={pendingLeaves} icon={CalendarDays} colorClass="bg-amber-100 dark:bg-amber-900/30 text-amber-500" to="/my-leaves" />
          <KpiCard label="Performance" value={performance ? `${performance.overallScore}/100` : "—"} icon={TrendingUp} colorClass="bg-blue-100 dark:bg-blue-900/30 text-blue-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's attendance */}
          <div className={CARD}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Today's Attendance</h3>
            {todayRecord ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isPresent ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>{todayRecord.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Check In</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{fmt(todayRecord.checkIn)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Check Out</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{fmt(todayRecord.checkOut)}</span>
                </div>
                {todayRecord.workDurationMinutes > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Hours Worked</span>
                    <span className="text-sm font-semibold text-green-600">{(todayRecord.workDurationMinutes / 60).toFixed(1)}h</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">No attendance recorded today.</p>
            )}
            <Link to="/my-attendance" className="mt-4 flex items-center gap-1 text-xs text-brand-600 hover:underline">
              <Clock size={12} />View all attendance
            </Link>
          </div>

          {/* Active tasks */}
          <div className={`${CARD} lg:col-span-2`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Active Tasks</h3>
              <Link to="/my-tasks" className="text-xs text-brand-600 hover:underline">View all</Link>
            </div>
            {loading ? (
              <div className="flex justify-center py-6"><div className="w-6 h-6 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
            ) : activeSteps.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No active tasks assigned.</p>
            ) : (
              <div className="space-y-3">
                {activeSteps.slice(0, 4).map((step, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{step.operationName || step.stepName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{step.durationPerUnit ? `${step.durationPerUnit}${step.durationUnit || "min"}/unit` : ""}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">Pending</span>
                  </div>
                ))}
                {activeSteps.length > 4 && <p className="text-xs text-slate-400 text-center">+{activeSteps.length - 4} more</p>}
              </div>
            )}
          </div>
        </div>

        {/* Performance summary */}
        {performance && (
          <div className={CARD}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Performance Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { label: "Overall Score", value: `${performance.overallScore}/100`, color: performance.overallScore >= 85 ? "text-green-600" : performance.overallScore >= 65 ? "text-blue-600" : "text-amber-600" },
                { label: "Productivity", value: `${performance.productivityScore}%`, color: "text-brand-600" },
                { label: "Ops Completed", value: `${performance.operationsCompleted}/${performance.operationsAssigned}`, color: "text-slate-700 dark:text-slate-300" },
                { label: "Level", value: performance.performanceLevel, color: performance.performanceLevel === "EXCELLENT" ? "text-green-600" : performance.performanceLevel === "GOOD" ? "text-blue-600" : "text-amber-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-400 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
