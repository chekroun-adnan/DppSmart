import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { getMyProfile, getEmployeePerformance } from "../services/authService";
import { User, Building2, Wrench, TrendingUp, Mail, Phone, MapPin, CalendarDays } from "lucide-react";

const CARD = "bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/[0.06] p-5";

const levelColor = { EXPERT: "text-green-600", ADVANCED: "text-blue-600", INTERMEDIATE: "text-amber-600", BEGINNER: "text-slate-500" };

export default function MyProfilePage() {
  const [profile, setProfile]       = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  const employeeId = localStorage.getItem("employeeId") || localStorage.getItem("userId");

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([getMyProfile(), getEmployeePerformance(employeeId)])
      .then(([prof, perf]) => {
        if (!mounted) return;
        if (prof.status === "fulfilled") setProfile(prof.value);
        else setError("Could not load profile.");
        if (perf.status === "fulfilled") setPerformance(perf.value);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [employeeId]);

  if (loading) return (
    <DashboardLayout>
      <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <div className="text-red-500 text-sm mt-8">{error}</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Employee Portal</p>
          <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">My Profile</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Identity card */}
          <div className={`${CARD} flex flex-col items-center text-center gap-4`}>
            <div className="w-20 h-20 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-300 text-3xl font-extrabold">
              {profile?.fullName?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{profile?.fullName || "—"}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{profile?.position || profile?.role || "Employee"}</p>
              {profile?.employeeCode && (
                <span className="mt-2 inline-block px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-xs font-mono text-slate-500">{profile.employeeCode}</span>
              )}
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              profile?.status === "ACTIVE" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
              profile?.status === "ON_LEAVE" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
              "bg-slate-100 text-slate-500"
            }`}>{profile?.status?.replace("_", " ") || "ACTIVE"}</div>
          </div>

          {/* Details */}
          <div className={`${CARD} space-y-4 lg:col-span-2`}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Mail,       label: "Email",         value: profile?.email },
                { icon: Phone,      label: "Phone",         value: profile?.phone },
                { icon: MapPin,     label: "Address",       value: profile?.address },
                { icon: Building2,  label: "Department",    value: profile?.departmentName },
                { icon: User,       label: "Organization",  value: profile?.organizationId },
                { icon: CalendarDays, label: "Hire Date",   value: profile?.hireDate },
              ].filter(f => f.value).map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center text-slate-500 shrink-0">
                    <Icon size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skills */}
        {profile?.skills?.length > 0 && (
          <div className={CARD}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Skills</h3>
            <div className="flex flex-wrap gap-3">
              {profile.skills.map((s, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
                  <Wrench size={13} className="text-brand-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.skillName}</span>
                  <span className={`text-xs font-semibold ${levelColor[s.level] || "text-slate-500"}`}>{s.level}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance */}
        {performance && (
          <div className={CARD}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Performance</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Overall Score",  value: `${performance.overallScore}/100` },
                { label: "Productivity",   value: `${performance.productivityScore}%` },
                { label: "Attendance",     value: `${performance.attendanceScore}%` },
                { label: "Level",          value: performance.performanceLevel },
              ].map(({ label, value }) => (
                <div key={label} className="text-center p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Operations Completed</span>
                <span>{performance.operationsCompleted}/{performance.operationsAssigned}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${performance.productivityScore}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
