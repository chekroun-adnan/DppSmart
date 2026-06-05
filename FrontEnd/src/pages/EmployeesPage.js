import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import OrgSelector from "../components/OrgSelector";
import AuditHistoryModal from "../components/AuditHistoryModal";
import {
  createEmployee, updateEmployee, deleteEmployee, getEmployees,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getActiveSkills, createSkill, updateSkill, deleteSkill,
  getAttendance, checkIn, checkOut,
  getLeaves, createLeaveRequest, approveLeave, rejectLeave,
  getWorkforcePlan, getEmployeePerformance, getEmployeeWorkload,
  getMainOrganizations, getMyOrganizations, getSubOrganizations,
} from "../services/authService";
import {
  Users, Building2, Wrench, BarChart2, CalendarDays, ClipboardCheck,
  Plus, Pencil, Trash2, X, LogIn, LogOut, CheckCircle, XCircle,
  Clock, Star, AlertTriangle, UserCheck, TrendingUp, Award,
} from "lucide-react";

// ─── Shared styles ────────────────────────────────────────────────────────────
const INPUT = "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const SELECT = "h-11 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 pl-4 pr-10 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 cursor-pointer";
const BTN_PRIMARY = "inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-60";
const BTN_GHOST = "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors";
const CARD = "bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/[0.06] p-5";

const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];
const EMPLOYEE_STATUSES = ["ACTIVE", "INACTIVE", "ON_LEAVE", "SUSPENDED"];
const LEAVE_TYPES = ["ANNUAL", "SICK", "EMERGENCY", "UNPAID"];

const loadOrgs = () => {
  const r = (localStorage.getItem("userRole") || "").toUpperCase();
  return r === "ADMIN"
    ? Promise.all([getMainOrganizations(), getSubOrganizations()]).then(([m, s]) => [...m, ...s])
    : getMyOrganizations();
};

// ─── Shared primitives ────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className={`bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl w-full border border-slate-200 dark:border-white/[0.08] max-h-[92vh] flex flex-col ${wide ? "max-w-2xl" : "max-w-lg"}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
          <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06]"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = status || "ACTIVE";
  const map = {
    ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    INACTIVE: "bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-slate-400",
    ON_LEAVE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    SUSPENDED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[s]}`}>{s.replace("_", " ")}</span>;
}

function WorkloadBadge({ level }) {
  const map = {
    LOW: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    NORMAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    HIGH: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    OVERLOADED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[level] || map.NORMAL}`}>{level}</span>;
}

function KpiCard({ label, value, icon: Icon, colorClass }) {
  return (
    <div className={CARD + " flex items-center gap-4"}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorClass}`}><Icon size={20} /></div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function ErrBanner({ msg }) {
  return msg ? <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{msg}</div> : null;
}

// ─── TAB 1: Employees ─────────────────────────────────────────────────────────
function EmployeesTab({ orgId, orgs }) {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);   // "create" | "edit" | "delete"
  const [draft, setDraft] = useState({});
  const [editingId, setEditingId] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [historyId, setHistoryId] = useState(null);
  const role = (localStorage.getItem("userRole") || "").toUpperCase();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empData, deptData, skillData] = await Promise.all([getEmployees(), getDepartments(), getActiveSkills()]);
      setEmployees(empData);
      setDepartments(deptData.filter(d => !orgId || d.organizationId === orgId));
      setSkills(skillData);
    } catch (e) { setError(e.message || "Failed to load."); }
    finally { setLoading(false); }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const filtered = employees.filter(e => {
    if (orgId && e.organizationId !== orgId) return false;
    const q = search.toLowerCase();
    return !q || [e.fullName, e.email, e.role, e.position, e.departmentName, e.employeeCode].some(f => f?.toLowerCase().includes(q));
  });

  const orgName = id => orgs.find(o => o.id === id)?.name || id || "—";

  const openCreate = () => { setDraft({ organizationId: orgId || "", role: "EMPLOYEE", status: "ACTIVE" }); setSelectedSkills([]); setActionError(""); setModal("create"); };
  const openEdit = emp => {
    setEditingId(emp.id);
    setDraft({ ...emp, password: "" });
    setSelectedSkills(emp.skills || []);
    setActionError("");
    setModal("edit");
  };

  const validate = () => {
    if (!draft.fullName?.trim()) return "Full name is required.";
    if (!draft.email?.trim()) return "Email is required.";
    if (modal === "create" && (!draft.password || draft.password.length < 6)) return "Password must be at least 6 characters.";
    if (!draft.organizationId) return "Organization is required.";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setActionError(err); return; }
    setSaving(true); setActionError("");
    try {
      const payload = { ...draft, skills: selectedSkills };
      if (modal === "create") await createEmployee(payload);
      else await updateEmployee({ id: editingId, ...payload });
      await load();
      setModal(null);
    } catch (e) { setActionError(e.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true); setActionError("");
    try { await deleteEmployee(pendingDelete.id); await load(); setModal(null); setPendingDelete(null); }
    catch (e) { setActionError(e.message || "Failed to delete."); }
    finally { setSaving(false); }
  };

  const addSkill = () => setSelectedSkills(p => [...p, { skillId: "", skillName: "", level: "BEGINNER" }]);
  const removeSkill = i => setSelectedSkills(p => p.filter((_, idx) => idx !== i));
  const updateSkillEntry = (i, field, value) => setSelectedSkills(p => {
    const copy = [...p];
    copy[i] = { ...copy[i], [field]: value };
    if (field === "skillId") { const s = skills.find(s => s.id === value); if (s) copy[i].skillName = s.name; }
    return copy;
  });

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input className={`${INPUT} pl-9`} placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={openCreate} className={BTN_PRIMARY}><Plus size={15} />Add Employee</button>
      </div>

      {error && <ErrBanner msg={error} />}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.06]">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-white/[0.03]">
            <tr>
              {["Code", "Employee", "Position", "Department", "Status", "Skills", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center"><div className="w-7 h-7 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                {search ? "No employees match your search." : <span>No employees yet. <button onClick={openCreate} className="text-brand-600 hover:underline">Add first employee</button></span>}
              </td></tr>
            ) : filtered.map(emp => (
              <tr key={emp.id} className="group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{emp.employeeCode || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold text-sm flex-none">
                      {emp.fullName?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{emp.fullName || "—"}</p>
                      <p className="text-xs text-slate-400">{emp.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{emp.position || emp.role || "—"}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{emp.departmentName || "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={emp.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(emp.skills || []).slice(0, 2).map((s, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-[10px] font-medium">{s.skillName}</span>
                    ))}
                    {(emp.skills || []).length > 2 && <span className="text-xs text-slate-400">+{emp.skills.length - 2}</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(emp)} className={BTN_GHOST}><Pencil size={14} /></button>
                    {role === "ADMIN" && (
                      <button onClick={() => setHistoryId(emp.id)} className={BTN_GHOST} title="History">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0114 0z"/></svg>
                      </button>
                    )}
                    <button onClick={() => { setPendingDelete(emp); setActionError(""); setModal("delete"); }} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal === "create" || modal === "edit") && (
        <Modal title={modal === "create" ? "Add Employee" : "Edit Employee"} onClose={() => setModal(null)} wide>
          <div className="space-y-4">
            <ErrBanner msg={actionError} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name *"><input className={INPUT} value={draft.fullName || ""} onChange={e => setDraft(p => ({ ...p, fullName: e.target.value }))} /></Field>
              <Field label="Email *"><input className={INPUT} type="email" value={draft.email || ""} onChange={e => setDraft(p => ({ ...p, email: e.target.value }))} /></Field>
              {modal === "create" && <Field label="Password *"><input className={INPUT} type="password" value={draft.password || ""} onChange={e => setDraft(p => ({ ...p, password: e.target.value }))} /></Field>}
              <Field label="Position"><input className={INPUT} value={draft.position || ""} onChange={e => setDraft(p => ({ ...p, position: e.target.value }))} /></Field>
              <Field label="Phone"><input className={INPUT} value={draft.phone || ""} onChange={e => setDraft(p => ({ ...p, phone: e.target.value }))} /></Field>
              <Field label="Department">
                <select className={SELECT} value={draft.departmentId || ""} onChange={e => setDraft(p => ({ ...p, departmentId: e.target.value }))}>
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Hire Date"><input className={INPUT} type="date" value={draft.hireDate || ""} onChange={e => setDraft(p => ({ ...p, hireDate: e.target.value }))} /></Field>
              <Field label="Status">
                <select className={SELECT} value={draft.status || "ACTIVE"} onChange={e => setDraft(p => ({ ...p, status: e.target.value }))}>
                  {EMPLOYEE_STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </Field>
              {modal === "create" && (
                <Field label="Organization *">
                  <select className={SELECT} value={draft.organizationId || ""} onChange={e => setDraft(p => ({ ...p, organizationId: e.target.value }))}>
                    <option value="">Select organization</option>
                    {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Salary (optional)"><input className={INPUT} type="number" value={draft.salary || ""} onChange={e => setDraft(p => ({ ...p, salary: e.target.value }))} /></Field>
            </div>
            <Field label="Notes"><textarea className={`${INPUT} h-16 resize-none`} value={draft.notes || ""} onChange={e => setDraft(p => ({ ...p, notes: e.target.value }))} /></Field>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Skills</label>
                <button type="button" onClick={addSkill} className="text-xs text-brand-600 hover:underline flex items-center gap-1"><Plus size={12} />Add</button>
              </div>
              {selectedSkills.map((sk, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <select className={`${SELECT} flex-1`} value={sk.skillId} onChange={e => updateSkillEntry(i, "skillId", e.target.value)}>
                    <option value="">Select skill</option>
                    {skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select className={`${SELECT} w-36`} value={sk.level} onChange={e => updateSkillEntry(i, "level", e.target.value)}>
                    {SKILL_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <button type="button" onClick={() => removeSkill(i)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModal(null)} className={BTN_GHOST}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className={BTN_PRIMARY}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </Modal>
      )}

      {modal === "delete" && pendingDelete && (
        <Modal title="Delete Employee" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600 dark:text-slate-400">Delete <strong>{pendingDelete.fullName}</strong>? This cannot be undone.</p>
          <ErrBanner msg={actionError} />
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setModal(null)} className={BTN_GHOST}>Cancel</button>
            <button onClick={handleDelete} disabled={saving} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">{saving ? "Deleting…" : "Delete"}</button>
          </div>
        </Modal>
      )}

      <AuditHistoryModal entityType="Employee" entityId={historyId} onClose={() => setHistoryId(null)} />
    </>
  );
}

// ─── TAB 2: Workforce ─────────────────────────────────────────────────────────
function WorkforceTab({ orgId, orgs }) {
  const [plan, setPlan] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [workloads, setWorkloads] = useState({});
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingEmps, setLoadingEmps] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState([]);
  const [deptModal, setDeptModal] = useState(null);
  const [deptDraft, setDeptDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [deptError, setDeptError] = useState("");

  const loadData = useCallback(async () => {
    setLoadingEmps(true);
    try {
      const [empData, deptData] = await Promise.all([getEmployees(), getDepartments()]);
      const emps = empData.filter(e => !orgId || e.organizationId === orgId);
      setEmployees(emps);
      setDepartments(deptData.filter(d => !orgId || d.organizationId === orgId));
    } catch (e) { setError(e.message); }
    finally { setLoadingEmps(false); }
  }, [orgId]);

  const loadPlan = useCallback(async () => {
    if (!orgId) return;
    setLoadingPlan(true);
    try { setPlan(await getWorkforcePlan(orgId)); }
    catch (e) { setError(e.message); }
    finally { setLoadingPlan(false); }
  }, [orgId]);

  useEffect(() => { loadData(); loadPlan(); }, [loadData, loadPlan]);

  const loadWorkload = async empId => {
    try {
      const w = await getEmployeeWorkload(empId);
      setWorkloads(p => ({ ...p, [empId]: w }));
    } catch {}
  };

  const handleSaveDept = async () => {
    if (!deptDraft.name?.trim()) { setDeptError("Name is required."); return; }
    if (!deptDraft.organizationId) { setDeptError("Organization is required."); return; }
    setSaving(true); setDeptError("");
    try {
      if (deptModal === "create") await createDepartment(deptDraft);
      else await updateDepartment(deptDraft.id, deptDraft);
      await loadData(); await loadPlan(); setDeptModal(null);
    } catch (e) { setDeptError(e.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  const statusDot = { OK: "bg-green-500", WARNING: "bg-amber-500", CRITICAL: "bg-red-500" };

  return (
    <div className="space-y-6">
      {error && <ErrBanner msg={error} />}

      {/* Plan KPIs */}
      {plan && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Total Employees" value={plan.totalEmployees} icon={Users} colorClass="bg-blue-100 dark:bg-blue-900/30 text-blue-500" />
            <KpiCard label="Present Today" value={plan.presentToday} icon={UserCheck} colorClass="bg-green-100 dark:bg-green-900/30 text-green-500" />
            <KpiCard label="On Leave" value={plan.onLeave} icon={Clock} colorClass="bg-amber-100 dark:bg-amber-900/30 text-amber-500" />
            <KpiCard label="Overloaded" value={plan.overloaded} icon={AlertTriangle} colorClass="bg-red-100 dark:bg-red-900/30 text-red-500" />
          </div>

          {plan.aiRecommendation && (
            <div className="flex gap-3 p-4 rounded-2xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-700/40">
              <Star size={17} className="text-brand-500 shrink-0 mt-0.5" />
              <p className="text-sm text-brand-800 dark:text-brand-200">{plan.aiRecommendation}</p>
            </div>
          )}

          {plan.departmentCapacities?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Department Capacity</h3>
              <div className="space-y-2">
                {plan.departmentCapacities.map(dept => (
                  <div key={dept.departmentId} className={`${CARD} flex items-center justify-between gap-4 flex-wrap`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${statusDot[dept.status] || "bg-slate-400"}`} />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{dept.departmentName}</p>
                        <p className="text-xs text-slate-400">{dept.availableEmployees} of {dept.totalEmployees} available</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs flex-wrap">
                      <span className="text-amber-600">{dept.onLeaveCount} on leave</span>
                      <span className="text-red-500">{dept.overloadedCount} overloaded</span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${dept.status === "OK" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : dept.status === "WARNING" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>{dept.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      {loadingPlan && !plan && <p className="text-slate-400 text-sm text-center py-6">Loading workforce plan…</p>}
      {!orgId && <p className="text-slate-400 text-sm text-center py-6">Select an organization to view the workforce plan.</p>}

      {/* Employee Workloads */}
      {employees.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Employee Workloads</h3>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.06]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-white/[0.03]">
                <tr>{["Employee", "Department", "Active Ops", "Est. Hours", "Workload"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {employees.map(emp => {
                  const w = workloads[emp.id];
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{emp.fullName}</td>
                      <td className="px-4 py-3 text-slate-500">{emp.departmentName || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{w ? w.operationsAssigned : "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{w ? `${w.estimatedRemainingHours}h` : "—"}</td>
                      <td className="px-4 py-3">
                        {w ? <WorkloadBadge level={w.warningLevel} /> : (
                          <button onClick={() => loadWorkload(emp.id)} className="text-xs text-brand-600 hover:underline">Load</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Departments management */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Departments</h3>
          <button onClick={() => { setDeptDraft({ organizationId: orgId || "" }); setDeptError(""); setDeptModal("create"); }} className={BTN_PRIMARY}><Plus size={14} />Add</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {departments.map(dept => (
            <div key={dept.id} className={`${CARD} flex items-start justify-between gap-3`}>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{dept.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{dept.description || "—"}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => { setDeptDraft(dept); setDeptError(""); setDeptModal("edit"); }} className={BTN_GHOST}><Pencil size={13} /></button>
                <button onClick={async () => { await deleteDepartment(dept.id); loadData(); loadPlan(); }} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {deptModal && (
        <Modal title={deptModal === "create" ? "Add Department" : "Edit Department"} onClose={() => setDeptModal(null)}>
          <div className="space-y-4">
            <ErrBanner msg={deptError} />
            <Field label="Name *"><input className={INPUT} value={deptDraft.name || ""} onChange={e => setDeptDraft(p => ({ ...p, name: e.target.value }))} /></Field>
            <Field label="Description"><textarea className={`${INPUT} h-20 resize-none`} value={deptDraft.description || ""} onChange={e => setDeptDraft(p => ({ ...p, description: e.target.value }))} /></Field>
            <Field label="Organization *">
              <select className={SELECT} value={deptDraft.organizationId || ""} onChange={e => setDeptDraft(p => ({ ...p, organizationId: e.target.value }))}>
                <option value="">Select organization</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setDeptModal(null)} className={BTN_GHOST}>Cancel</button>
              <button onClick={handleSaveDept} disabled={saving} className={BTN_PRIMARY}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── TAB 3: Attendance ────────────────────────────────────────────────────────
function AttendanceTab({ orgId }) {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
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
      const [recs, emps] = await Promise.all([getAttendance(), getEmployees()]);
      setRecords(recs);
      setEmployees(emps.filter(e => !orgId || e.organizationId === orgId));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toDateString();
  const filtered = records.filter(r => {
    if (orgId && r.organizationId !== orgId) return false;
    return !search || r.employeeName?.toLowerCase().includes(search.toLowerCase());
  });
  const presentNow = filtered.filter(r => r.status === "PRESENT" && new Date(r.checkIn).toDateString() === today).length;
  const completedToday = filtered.filter(r => r.status === "COMPLETED" && new Date(r.checkIn).toDateString() === today).length;

  const fmt = dt => dt ? new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
  const fmtDur = m => !m ? "—" : m >= 60 ? `${Math.floor(m / 60)}h ${Math.round(m % 60)}m` : `${Math.round(m)}m`;

  const handleCheckIn = async () => {
    if (!checkInForm.employeeId) { setActionError("Select an employee."); return; }
    setSaving(true); setActionError("");
    try {
      const emp = employees.find(e => e.id === checkInForm.employeeId);
      await checkIn({ ...checkInForm, organizationId: emp?.organizationId || orgId });
      setShowCheckIn(false); setCheckInForm({ employeeId: "", notes: "" });
      await load();
    } catch (e) { setActionError(e.message || "Check-in failed."); }
    finally { setSaving(false); }
  };

  const handleCheckOut = async empId => {
    try { await checkOut(empId); await load(); }
    catch (e) { setActionError(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="grid grid-cols-3 gap-3 flex-1">
          <KpiCard label="Present Now" value={presentNow} icon={UserCheck} colorClass="bg-green-100 dark:bg-green-900/30 text-green-500" />
          <KpiCard label="Completed Today" value={completedToday} icon={CheckCircle} colorClass="bg-blue-100 dark:bg-blue-900/30 text-blue-500" />
          <KpiCard label="Total Records" value={filtered.length} icon={ClipboardCheck} colorClass="bg-slate-100 dark:bg-white/[0.05] text-slate-500" />
        </div>
      </div>

      <ErrBanner msg={error} />
      <ErrBanner msg={actionError} />

      <div className="flex items-center gap-3 flex-wrap">
        <input className={`${INPUT} max-w-xs`} placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} />
        {role !== "EMPLOYEE" && (
          <button onClick={() => { setShowCheckIn(true); setActionError(""); }} className={BTN_PRIMARY}><LogIn size={14} />Check In</button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.06]">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-white/[0.03]">
            <tr>{["Employee", "Date", "Check In", "Check Out", "Work Duration", "Overtime", "Status", ""].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center"><div className="w-7 h-7 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No attendance records found.</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.employeeName}</td>
                <td className="px-4 py-3 text-slate-500">{r.checkIn ? new Date(r.checkIn).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3 text-slate-600">{fmt(r.checkIn)}</td>
                <td className="px-4 py-3 text-slate-600">{fmt(r.checkOut)}</td>
                <td className="px-4 py-3 text-slate-600">{fmtDur(r.workDurationMinutes)}</td>
                <td className="px-4 py-3 text-amber-600">{r.overtimeDurationMinutes > 0 ? fmtDur(r.overtimeDurationMinutes) : "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.status === "PRESENT" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : r.status === "COMPLETED" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-slate-100 text-slate-500"}`}>{r.status}</span>
                </td>
                <td className="px-4 py-3">
                  {r.status === "PRESENT" && role !== "EMPLOYEE" && (
                    <button onClick={() => handleCheckOut(r.employeeId)} className="flex items-center gap-1 text-xs text-brand-600 hover:underline"><LogOut size={13} />Check Out</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCheckIn && (
        <Modal title="Check In Employee" onClose={() => setShowCheckIn(false)}>
          <div className="space-y-4">
            <ErrBanner msg={actionError} />
            <Field label="Employee *">
              <select className={SELECT} value={checkInForm.employeeId} onChange={e => setCheckInForm(p => ({ ...p, employeeId: e.target.value }))}>
                <option value="">Select employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
            </Field>
            <Field label="Notes"><input className={INPUT} value={checkInForm.notes} onChange={e => setCheckInForm(p => ({ ...p, notes: e.target.value }))} /></Field>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowCheckIn(false)} className={BTN_GHOST}>Cancel</button>
              <button onClick={handleCheckIn} disabled={saving} className={BTN_PRIMARY}><LogIn size={14} />{saving ? "Checking in…" : "Check In"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── TAB 4: Leave Management ──────────────────────────────────────────────────
function LeavesTab({ orgId }) {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
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
      const [leavData, empData] = await Promise.all([getLeaves(), getEmployees()]);
      setLeaves(leavData);
      setEmployees(empData.filter(e => !orgId || e.organizationId === orgId));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const filtered = leaves.filter(l => {
    if (orgId && l.organizationId !== orgId) return false;
    if (statusFilter !== "ALL" && l.status !== statusFilter) return false;
    return !search || l.employeeName?.toLowerCase().includes(search.toLowerCase());
  });

  const pending = leaves.filter(l => l.status === "PENDING").length;
  const approved = leaves.filter(l => l.status === "APPROVED").length;
  const daysBetween = (s, e) => !s || !e ? 0 : Math.round((new Date(e) - new Date(s)) / 86400000) + 1;

  const handleCreate = async () => {
    if (!draft.employeeId) { setActionError("Select an employee."); return; }
    if (!draft.type || !draft.startDate || !draft.endDate) { setActionError("Fill all required fields."); return; }
    setSaving(true); setActionError("");
    try {
      const emp = employees.find(e => e.id === draft.employeeId);
      await createLeaveRequest({ ...draft, organizationId: emp?.organizationId || orgId });
      setShowCreate(false); setDraft({});
      await load();
    } catch (e) { setActionError(e.message || "Failed to submit."); }
    finally { setSaving(false); }
  };

  const handleApprove = async id => {
    try { await approveLeave(id); await load(); }
    catch (e) { setActionError(e.message); }
  };

  const handleReject = async () => {
    try { await rejectLeave(rejectModal, rejectReason); setRejectModal(null); setRejectReason(""); await load(); }
    catch (e) { setActionError(e.message); }
  };

  const typeColor = { ANNUAL: "bg-blue-100 text-blue-700", SICK: "bg-red-100 text-red-700", EMERGENCY: "bg-orange-100 text-orange-700", UNPAID: "bg-slate-100 text-slate-600" };
  const statusColor = { PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Pending Requests" value={pending} icon={Clock} colorClass="bg-amber-100 dark:bg-amber-900/30 text-amber-500" />
        <KpiCard label="Approved" value={approved} icon={CheckCircle} colorClass="bg-green-100 dark:bg-green-900/30 text-green-500" />
        <KpiCard label="Total Requests" value={leaves.length} icon={CalendarDays} colorClass="bg-blue-100 dark:bg-blue-900/30 text-blue-500" />
      </div>

      <ErrBanner msg={error} />
      <ErrBanner msg={actionError} />

      <div className="flex items-center gap-3 flex-wrap">
        <input className={`${INPUT} max-w-xs`} placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className={`${SELECT} w-40`} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <button onClick={() => { setDraft({}); setActionError(""); setShowCreate(true); }} className={BTN_PRIMARY}><Plus size={14} />New Request</button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.06]">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-white/[0.03]">
            <tr>{["Employee", "Type", "Start", "End", "Days", "Reason", "Status", ""].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center"><div className="w-7 h-7 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No leave requests found.</td></tr>
            ) : filtered.map(l => (
              <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{l.employeeName}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor[l.type] || ""}`}>{l.type}</span></td>
                <td className="px-4 py-3 text-slate-500">{l.startDate}</td>
                <td className="px-4 py-3 text-slate-500">{l.endDate}</td>
                <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{daysBetween(l.startDate, l.endDate)}d</td>
                <td className="px-4 py-3 text-slate-400 max-w-[140px] truncate">{l.reason || "—"}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[l.status] || ""}`}>{l.status}</span></td>
                <td className="px-4 py-3">
                  {l.status === "PENDING" && role !== "EMPLOYEE" && (
                    <div className="flex gap-1">
                      <button onClick={() => handleApprove(l.id)} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"><CheckCircle size={14} /></button>
                      <button onClick={() => { setRejectModal(l.id); setRejectReason(""); }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><XCircle size={14} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title="New Leave Request" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <ErrBanner msg={actionError} />
            <Field label="Employee *">
              <select className={SELECT} value={draft.employeeId || ""} onChange={e => setDraft(p => ({ ...p, employeeId: e.target.value }))}>
                <option value="">Select employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
            </Field>
            <Field label="Leave Type *">
              <select className={SELECT} value={draft.type || ""} onChange={e => setDraft(p => ({ ...p, type: e.target.value }))}>
                <option value="">Select type</option>
                {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Date *"><input className={INPUT} type="date" value={draft.startDate || ""} onChange={e => setDraft(p => ({ ...p, startDate: e.target.value }))} /></Field>
              <Field label="End Date *"><input className={INPUT} type="date" value={draft.endDate || ""} onChange={e => setDraft(p => ({ ...p, endDate: e.target.value }))} /></Field>
            </div>
            <Field label="Reason"><textarea className={`${INPUT} h-20 resize-none`} value={draft.reason || ""} onChange={e => setDraft(p => ({ ...p, reason: e.target.value }))} /></Field>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className={BTN_GHOST}>Cancel</button>
              <button onClick={handleCreate} disabled={saving} className={BTN_PRIMARY}>{saving ? "Submitting…" : "Submit Request"}</button>
            </div>
          </div>
        </Modal>
      )}

      {rejectModal && (
        <Modal title="Reject Leave" onClose={() => setRejectModal(null)}>
          <div className="space-y-4">
            <Field label="Reason (optional)"><textarea className={`${INPUT} h-20 resize-none`} value={rejectReason} onChange={e => setRejectReason(e.target.value)} /></Field>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRejectModal(null)} className={BTN_GHOST}>Cancel</button>
              <button onClick={handleReject} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Reject</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── TAB 5: Performance ───────────────────────────────────────────────────────
function PerformanceTab({ orgId }) {
  const [employees, setEmployees] = useState([]);
  const [performances, setPerformances] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingPerf, setLoadingPerf] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getEmployees()
      .then(data => { setEmployees(data.filter(e => !orgId || e.organizationId === orgId)); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [orgId]);

  const loadAll = async () => {
    setLoadingPerf(true);
    const results = {};
    await Promise.allSettled(employees.map(async emp => {
      try { results[emp.id] = await getEmployeePerformance(emp.id); } catch {}
    }));
    setPerformances(results);
    setLoadingPerf(false);
  };

  const levelColor = { EXCELLENT: "text-green-600 dark:text-green-400", GOOD: "text-blue-600 dark:text-blue-400", AVERAGE: "text-amber-600 dark:text-amber-400", POOR: "text-red-500" };

  const sorted = employees
    .map(e => ({ ...e, perf: performances[e.id] }))
    .sort((a, b) => (b.perf?.overallScore || 0) - (a.perf?.overallScore || 0));

  const topPerformer = sorted.find(e => e.perf);
  const avgScore = sorted.filter(e => e.perf).reduce((sum, e) => sum + (e.perf?.overallScore || 0), 0) / (sorted.filter(e => e.perf).length || 1);

  return (
    <div className="space-y-5">
      <ErrBanner msg={error} />

      {Object.keys(performances).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <KpiCard label="Top Performer" value={topPerformer?.fullName?.split(" ")[0] || "—"} icon={Award} colorClass="bg-amber-100 dark:bg-amber-900/30 text-amber-500" />
          <KpiCard label="Avg Score" value={`${Math.round(avgScore)}/100`} icon={TrendingUp} colorClass="bg-blue-100 dark:bg-blue-900/30 text-blue-500" />
          <KpiCard label="Scored Employees" value={Object.keys(performances).length} icon={Users} colorClass="bg-green-100 dark:bg-green-900/30 text-green-500" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{employees.length} employees{orgId ? " in this organization" : ""}</p>
        <button onClick={loadAll} disabled={loadingPerf || loading || employees.length === 0} className={BTN_PRIMARY}>
          {loadingPerf ? "Loading…" : "Load All Scores"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.06]">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-white/[0.03]">
            <tr>{["Employee", "Department", "Ops Done", "Productivity", "Attendance", "Overall Score", "Level"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center"><div className="w-7 h-7 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" /></td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No employees to show.</td></tr>
            ) : sorted.map(emp => {
              const p = emp.perf;
              return (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold text-xs flex-none">
                        {emp.fullName?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">{emp.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{emp.departmentName || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{p ? `${p.operationsCompleted}/${p.operationsAssigned}` : "—"}</td>
                  <td className="px-4 py-3">
                    {p ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[80px] h-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${p.productivityScore}%` }} />
                        </div>
                        <span className="text-xs text-slate-600">{p.productivityScore}%</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">{p ? `${p.attendanceScore}%` : "—"}</td>
                  <td className="px-4 py-3">
                    {p ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[80px] h-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${p.overallScore >= 85 ? "bg-green-500" : p.overallScore >= 65 ? "bg-blue-500" : p.overallScore >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${p.overallScore}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{p.overallScore}</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {p ? <span className={`text-xs font-bold ${levelColor[p.performanceLevel]}`}>{p.performanceLevel}</span> : (
                      <button onClick={async () => {
                        try {
                          const perf = await getEmployeePerformance(emp.id);
                          setPerformances(prev => ({ ...prev, [emp.id]: perf }));
                        } catch {}
                      }} className="text-xs text-brand-600 hover:underline">Load</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page Root ────────────────────────────────────────────────────────────────
const TABS = [
  { key: "employees",  label: "Employees",        icon: Users },
  { key: "workforce",  label: "Workforce",         icon: BarChart2 },
  { key: "attendance", label: "Attendance",        icon: ClipboardCheck },
  { key: "leaves",     label: "Leave Management",  icon: CalendarDays },
  { key: "performance",label: "Performance",       icon: TrendingUp },
];

export default function EmployeesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "employees";
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(() => localStorage.getItem("orgId") || "");

  useEffect(() => { loadOrgs().then(setOrgs).catch(() => {}); }, []);

  const setTab = key => {
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set("tab", key); return n; }, { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Workforce</p>
            <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Employees</h1>
            <p className="mt-1 text-sm text-slate-500">Manage employees, attendance, leaves and performance</p>
          </div>
          <OrgSelector orgs={orgs} selectedOrgId={selectedOrgId} onSelect={setSelectedOrgId} />
        </div>

        {/* Tabs — horizontal scroll on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-0.5">
          <div className="flex gap-1 min-w-max p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.03] w-fit">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  activeTab === key
                    ? "bg-white dark:bg-[#1E293B] text-brand-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content — each mounts fresh when active */}
        {activeTab === "employees"   && <EmployeesTab   orgId={selectedOrgId} orgs={orgs} />}
        {activeTab === "workforce"   && <WorkforceTab   orgId={selectedOrgId} orgs={orgs} />}
        {activeTab === "attendance"  && <AttendanceTab  orgId={selectedOrgId} />}
        {activeTab === "leaves"      && <LeavesTab      orgId={selectedOrgId} />}
        {activeTab === "performance" && <PerformanceTab orgId={selectedOrgId} />}
      </div>
    </DashboardLayout>
  );
}
