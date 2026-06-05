import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import OrgSelector from "../components/OrgSelector";
import {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getActiveSkills, createSkill, updateSkill, deleteSkill,
  getMainOrganizations, getMyOrganizations, getSubOrganizations,
  getWorkforcePlan, getEmployeeWorkload, getEmployeePerformance,
} from "../services/authService";
import {
  Users, Building2, Wrench, BarChart2, Plus, Pencil, Trash2,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle, X,
  TrendingUp, Clock, UserCheck, Shield, Star,
} from "lucide-react";

const CARD = "bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/[0.06] p-6";
const INPUT = "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const SELECT = `${INPUT} cursor-pointer`;
const BTN_PRIMARY = "inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors";
const BTN_GHOST = "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors";

const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];
const STATUSES = ["ACTIVE", "INACTIVE", "ON_LEAVE", "SUSPENDED"];

const loadOrgs = () => {
  const r = (localStorage.getItem("userRole") || "").toUpperCase();
  return r === "ADMIN"
    ? Promise.all([getMainOrganizations(), getSubOrganizations()]).then(([m, s]) => [...m, ...s])
    : getMyOrganizations();
};

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-white/[0.08] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06]"><X size={16} /></button>
        </div>
        <div className="p-6">{children}</div>
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

function WorkloadBadge({ level }) {
  const map = {
    LOW: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    NORMAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    HIGH: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    OVERLOADED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[level] || map.NORMAL}`}>{level}</span>;
}

function StatusBadge({ status }) {
  const map = {
    ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    INACTIVE: "bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-slate-400",
    ON_LEAVE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    SUSPENDED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || map.ACTIVE}`}>{status?.replace("_", " ") || "ACTIVE"}</span>;
}

// ─── EMPLOYEES TAB ───────────────────────────────────────────────────────────

function EmployeesTab({ orgId, orgs }) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [draft, setDraft] = useState({});
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [workloads, setWorkloads] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empData, deptData, skillData] = await Promise.all([
        getEmployees(), getDepartments(), getActiveSkills()
      ]);
      setEmployees(empData);
      setDepartments(deptData.filter(d => !orgId || d.organizationId === orgId));
      setSkills(skillData);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    if (orgId && e.organizationId !== orgId) return false;
    return !q || [e.fullName, e.email, e.position, e.departmentName, e.employeeCode].some(f => f?.toLowerCase().includes(q));
  });

  const openCreate = () => {
    setDraft({ organizationId: orgId || "", role: "EMPLOYEE", status: "ACTIVE" });
    setSelectedSkills([]);
    setError("");
    setModal("create");
  };

  const openEdit = (emp) => {
    setDraft({ ...emp, password: "" });
    setSelectedSkills(emp.skills || []);
    setError("");
    setModal("edit");
  };

  const handleSave = async () => {
    if (!draft.fullName?.trim()) return setError("Full name is required.");
    if (!draft.email?.trim()) return setError("Email is required.");
    if (modal === "create" && (!draft.password || draft.password.length < 6)) return setError("Password must be at least 6 characters.");
    if (!draft.organizationId) return setError("Organization is required.");
    setSaving(true);
    setError("");
    try {
      const payload = { ...draft, skills: selectedSkills };
      if (modal === "create") { await createEmployee(payload); }
      else { await updateEmployee({ id: draft.id, ...payload }); }
      await load();
      setModal(null);
    } catch (e) { setError(e.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this employee?")) return;
    try { await deleteEmployee(id); await load(); } catch (e) { setError(e.message); }
  };

  const loadWorkload = async (empId) => {
    try {
      const w = await getEmployeeWorkload(empId);
      setWorkloads(prev => ({ ...prev, [empId]: w }));
    } catch {}
  };

  const addSkill = () => setSelectedSkills(prev => [...prev, { skillId: "", skillName: "", level: "BEGINNER" }]);
  const removeSkill = (i) => setSelectedSkills(prev => prev.filter((_, idx) => idx !== i));
  const updateSkillEntry = (i, field, value) => {
    setSelectedSkills(prev => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [field]: value };
      if (field === "skillId") {
        const found = skills.find(s => s.id === value);
        if (found) copy[i].skillName = found.name;
      }
      return copy;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <input className={`${INPUT} max-w-xs`} placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={openCreate} className={BTN_PRIMARY}><Plus size={15} />Add Employee</button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.06]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-white/[0.03]">
              <tr>
                {["Code", "Name", "Position", "Department", "Status", "Skills", "Workload", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-slate-500">{emp.employeeCode || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{emp.fullName}</div>
                    <div className="text-xs text-slate-400">{emp.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{emp.position || "—"}</td>
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
                    {workloads[emp.id] ? (
                      <WorkloadBadge level={workloads[emp.id].warningLevel} />
                    ) : (
                      <button onClick={() => loadWorkload(emp.id)} className="text-xs text-brand-600 hover:underline">Load</button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(emp)} className={BTN_GHOST}><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(emp.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No employees found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === "create" ? "Add Employee" : "Edit Employee"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name *">
                <input className={INPUT} value={draft.fullName || ""} onChange={e => setDraft(p => ({ ...p, fullName: e.target.value }))} />
              </Field>
              <Field label="Email *">
                <input className={INPUT} type="email" value={draft.email || ""} onChange={e => setDraft(p => ({ ...p, email: e.target.value }))} />
              </Field>
              {modal === "create" && (
                <Field label="Password *">
                  <input className={INPUT} type="password" value={draft.password || ""} onChange={e => setDraft(p => ({ ...p, password: e.target.value }))} />
                </Field>
              )}
              <Field label="Position">
                <input className={INPUT} value={draft.position || ""} onChange={e => setDraft(p => ({ ...p, position: e.target.value }))} />
              </Field>
              <Field label="Phone">
                <input className={INPUT} value={draft.phone || ""} onChange={e => setDraft(p => ({ ...p, phone: e.target.value }))} />
              </Field>
              <Field label="Department">
                <select className={SELECT} value={draft.departmentId || ""} onChange={e => setDraft(p => ({ ...p, departmentId: e.target.value }))}>
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Hire Date">
                <input className={INPUT} type="date" value={draft.hireDate || ""} onChange={e => setDraft(p => ({ ...p, hireDate: e.target.value }))} />
              </Field>
              <Field label="Status">
                <select className={SELECT} value={draft.status || "ACTIVE"} onChange={e => setDraft(p => ({ ...p, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
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
              <Field label="Salary">
                <input className={INPUT} type="number" value={draft.salary || ""} onChange={e => setDraft(p => ({ ...p, salary: e.target.value }))} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea className={`${INPUT} h-20 resize-none`} value={draft.notes || ""} onChange={e => setDraft(p => ({ ...p, notes: e.target.value }))} />
            </Field>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Skills</label>
                <button type="button" onClick={addSkill} className="text-xs text-brand-600 hover:underline flex items-center gap-1"><Plus size={12} />Add skill</button>
              </div>
              <div className="space-y-2">
                {selectedSkills.map((sk, i) => (
                  <div key={i} className="flex items-center gap-2">
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
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModal(null)} className={BTN_GHOST}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className={BTN_PRIMARY}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── DEPARTMENTS TAB ─────────────────────────────────────────────────────────

function DepartmentsTab({ orgId, orgs }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setDepartments(await getDepartments()); } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = departments.filter(d => !orgId || d.organizationId === orgId);

  const handleSave = async () => {
    if (!draft.name?.trim()) return setError("Name is required.");
    if (!draft.organizationId) return setError("Organization is required.");
    setSaving(true); setError("");
    try {
      if (modal === "create") await createDepartment(draft);
      else await updateDepartment(draft.id, draft);
      await load(); setModal(null);
    } catch (e) { setError(e.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deactivate this department?")) return;
    try { await deleteDepartment(id); await load(); } catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setDraft({ organizationId: orgId || "" }); setError(""); setModal("create"); }} className={BTN_PRIMARY}><Plus size={15} />Add Department</button>
      </div>
      {error && <div className="text-sm text-red-500">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="col-span-3 text-center py-10 text-slate-400">Loading…</div> : filtered.map(dept => (
          <div key={dept.id} className={`${CARD} flex flex-col gap-3`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{dept.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{dept.description || "No description"}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${dept.active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-slate-100 text-slate-500"}`}>
                {dept.active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setDraft(dept); setError(""); setModal("edit"); }} className={BTN_GHOST}><Pencil size={13} />Edit</button>
              <button onClick={() => handleDelete(dept.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 size={13} />Delete</button>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && <p className="col-span-3 text-center py-10 text-slate-400">No departments yet.</p>}
      </div>

      {modal && (
        <Modal title={modal === "create" ? "Add Department" : "Edit Department"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {error && <div className="text-sm text-red-500">{error}</div>}
            <Field label="Name *">
              <input className={INPUT} value={draft.name || ""} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} />
            </Field>
            <Field label="Description">
              <textarea className={`${INPUT} h-20 resize-none`} value={draft.description || ""} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))} />
            </Field>
            <Field label="Organization *">
              <select className={SELECT} value={draft.organizationId || ""} onChange={e => setDraft(p => ({ ...p, organizationId: e.target.value }))}>
                <option value="">Select organization</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModal(null)} className={BTN_GHOST}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className={BTN_PRIMARY}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── SKILLS TAB ──────────────────────────────────────────────────────────────

function SkillsTab() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setSkills(await getActiveSkills()); } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!draft.name?.trim()) return setError("Name is required.");
    setSaving(true); setError("");
    try {
      if (modal === "create") await createSkill(draft);
      else await updateSkill(draft.id, draft);
      await load(); setModal(null);
    } catch (e) { setError(e.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  const categories = [...new Set(skills.map(s => s.category).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setDraft({}); setError(""); setModal("create"); }} className={BTN_PRIMARY}><Plus size={15} />Add Skill</button>
      </div>
      {error && <div className="text-sm text-red-500">{error}</div>}

      {categories.length > 0 ? categories.map(cat => (
        <div key={cat}>
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">{cat}</h4>
          <div className="flex flex-wrap gap-2">
            {skills.filter(s => s.category === cat).map(skill => (
              <div key={skill.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
                <Wrench size={13} className="text-brand-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{skill.name}</span>
                <button onClick={() => { setDraft(skill); setError(""); setModal("edit"); }} className="text-slate-400 hover:text-brand-600"><Pencil size={11} /></button>
                <button onClick={async () => { await deleteSkill(skill.id); load(); }} className="text-slate-400 hover:text-red-500"><X size={11} /></button>
              </div>
            ))}
          </div>
        </div>
      )) : (
        <div className="flex flex-wrap gap-2">
          {loading ? <p className="text-slate-400">Loading…</p> : skills.map(skill => (
            <div key={skill.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
              <Wrench size={13} className="text-brand-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{skill.name}</span>
              <button onClick={() => { setDraft(skill); setError(""); setModal("edit"); }} className="text-slate-400 hover:text-brand-600"><Pencil size={11} /></button>
              <button onClick={async () => { await deleteSkill(skill.id); load(); }} className="text-slate-400 hover:text-red-500"><X size={11} /></button>
            </div>
          ))}
          {!loading && skills.length === 0 && <p className="text-slate-400">No skills defined yet.</p>}
        </div>
      )}

      {modal && (
        <Modal title={modal === "create" ? "Add Skill" : "Edit Skill"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {error && <div className="text-sm text-red-500">{error}</div>}
            <Field label="Name *">
              <input className={INPUT} value={draft.name || ""} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} />
            </Field>
            <Field label="Category">
              <input className={INPUT} value={draft.category || ""} onChange={e => setDraft(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Manufacturing, Operations" />
            </Field>
            <Field label="Description">
              <textarea className={`${INPUT} h-20 resize-none`} value={draft.description || ""} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))} />
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModal(null)} className={BTN_GHOST}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className={BTN_PRIMARY}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── WORKFORCE PLANNING TAB ──────────────────────────────────────────────────

function PlanningTab({ orgId }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    getWorkforcePlan(orgId)
      .then(setPlan)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [orgId]);

  if (!orgId) return <p className="text-slate-400 text-sm py-8 text-center">Select an organization to view the workforce plan.</p>;
  if (loading) return <p className="text-slate-400 text-sm py-8 text-center">Generating plan…</p>;
  if (error) return <p className="text-red-500 text-sm py-8 text-center">{error}</p>;
  if (!plan) return null;

  const statusColor = { OK: "bg-green-500", WARNING: "bg-amber-500", CRITICAL: "bg-red-500" };

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Employees", value: plan.totalEmployees, icon: Users, color: "text-blue-500" },
          { label: "Present Today", value: plan.presentToday, icon: UserCheck, color: "text-green-500" },
          { label: "On Leave", value: plan.onLeave, icon: Clock, color: "text-amber-500" },
          { label: "Overloaded", value: plan.overloaded, icon: AlertTriangle, color: "text-red-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={CARD}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-white/[0.05] ${color}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI recommendation */}
      {plan.aiRecommendation && (
        <div className="flex gap-3 p-4 rounded-2xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-700/40">
          <Star size={18} className="text-brand-500 shrink-0 mt-0.5" />
          <p className="text-sm text-brand-800 dark:text-brand-200">{plan.aiRecommendation}</p>
        </div>
      )}

      {/* Department capacities */}
      {plan.departmentCapacities?.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Department Capacity</h3>
          <div className="space-y-3">
            {plan.departmentCapacities.map(dept => (
              <div key={dept.departmentId} className={`${CARD} flex items-center justify-between gap-4 flex-wrap`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${statusColor[dept.status] || "bg-slate-400"}`} />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{dept.departmentName}</p>
                    <p className="text-xs text-slate-400">{dept.availableEmployees} of {dept.totalEmployees} available</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="text-amber-600">{dept.onLeaveCount} on leave</span>
                  <span className="text-red-500">{dept.overloadedCount} overloaded</span>
                  <span className="text-blue-500">{dept.activeProductions} active ops</span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${dept.status === "OK" ? "bg-green-100 text-green-700" : dept.status === "WARNING" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                    {dept.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAGE ROOT ────────────────────────────────────────────────────────────────

export default function WorkforcePage() {
  const [tab, setTab] = useState("employees");
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(() => localStorage.getItem("orgId") || "");

  useEffect(() => {
    loadOrgs().then(setOrgs).catch(() => {});
  }, []);

  const TABS = [
    { key: "employees", label: "Employees", icon: Users },
    { key: "departments", label: "Departments", icon: Building2 },
    { key: "skills", label: "Skills", icon: Wrench },
    { key: "planning", label: "Workforce Planning", icon: BarChart2 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Workforce Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Employees, departments, skills and planning</p>
          </div>
          <OrgSelector orgs={orgs} selectedOrgId={selectedOrgId} onSelect={setSelectedOrgId} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.03] w-fit">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === key
                  ? "bg-white dark:bg-[#1E293B] text-brand-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "employees" && <EmployeesTab orgId={selectedOrgId} orgs={orgs} />}
        {tab === "departments" && <DepartmentsTab orgId={selectedOrgId} orgs={orgs} />}
        {tab === "skills" && <SkillsTab />}
        {tab === "planning" && <PlanningTab orgId={selectedOrgId} />}
      </div>
    </DashboardLayout>
  );
}
