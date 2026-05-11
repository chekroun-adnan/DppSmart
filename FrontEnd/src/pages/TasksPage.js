import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import OrgSelector from "../components/OrgSelector";
import {
  createTask,
  deleteTask,
  getEmployees,
  getMyOrganizations,
  getTasks,
  updateTask,
  updateTaskStatus,
} from "../services/authService";
import AuditHistoryModal from "../components/AuditHistoryModal";

const STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const STATUS_STYLE = {
  TODO: { bg: "status-slate", dot: "bg-slate-400", label: "To Do" },
  IN_PROGRESS: { bg: "status-blue", dot: "bg-blue-500 animate-pulse", label: "In Progress" },
  REVIEW: { bg: "status-amber", dot: "bg-amber-500", label: "Review" },
  DONE: { bg: "status-emerald", dot: "bg-emerald-500", label: "Done" },
  CANCELLED: { bg: "status-red", dot: "bg-red-400", label: "Cancelled" },
};

const PRIORITY_STYLE = {
  LOW: "status-slate",
  MEDIUM: "status-sky",
  HIGH: "status-orange",
  URGENT: "status-red",
};

const INPUT = "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const SELECT = "h-11 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 pl-4 pr-10 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 cursor-pointer bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzY0NzQ4YiIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_0.75rem_center] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzk0YTNiOCIvPjwvc3ZnPg==')] dark:bg-[right_0.75rem_center]";
const TEXTAREA = "w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-800/80 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 resize-none";

function FieldGroup({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ProgressBar({ value = 0, onChange, readOnly, t }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t ? t("tasks.progress", "Progress") : "Progress"}</span>
        <span className="text-sm font-bold text-slate-700">{value}%</span>
      </div>
      <div className="relative h-2.5 w-full rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${value >= 100 ? "bg-emerald-500" : value >= 60 ? "bg-brand-500" : value >= 30 ? "bg-amber-500" : "bg-slate-300"}`}
          style={{ width: `${value}%` }}
        />
      </div>
      {!readOnly && (
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-brand-600 cursor-pointer"
        />
      )}
    </div>
  );
}

const emptyDraft = {
  title: "",
  description: "",
  organizationId: "",
  assignedEmployeeIds: [],
  status: "TODO",
  priority: "MEDIUM",
  progress: 0,
  dueDate: "",
};

export default function TasksPage() {
  const { t } = useTranslation();
  const role = (localStorage.getItem("userRole") || "").toUpperCase();
  const canManage = role === "ADMIN" || role === "SUBADMIN";
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState(() => localStorage.getItem("orgId") || "");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // "create" | "edit" | "detail" | "delete"
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState("");
  const [detailTask, setDetailTask] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [historyId, setHistoryId] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [tasksData, empData, orgData] = await Promise.all([getTasks(), getEmployees(), getMyOrganizations()]);
        if (mounted) { setTasks(Array.isArray(tasksData) ? tasksData : []); setEmployees(empData); setOrgs(orgData); }
      } catch (e) {
        if (mounted) setError(e.message || "Failed to load tasks.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const empName = (id) => employees.find((e) => e.id === id)?.fullName || id; // eslint-disable-line no-unused-vars
  const orgName = (id) => orgs.find((o) => o.id === id)?.name || id;

  const visible = tasks.filter((t) => {
    const matchOrg = !selectedOrgId || t.organizationId === selectedOrgId;
    const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
    return matchOrg && matchStatus && matchSearch;
  });

  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: tasks.filter((t) => t.status === s).length }), {});

  // ── CREATE ───────────────────────────────────────────────────────────────────
  const openCreate = () => { setDraft(emptyDraft); setActionError(""); setModal("create"); };

  const validateDraft = () => {
    if (!draft.title?.trim()) return t("tasks.titleRequired", "Title is required.");
    if (!draft.organizationId) return t("tasks.selectOrg", "Please select an organization.");
    return null;
  };

  const handleCreate = async () => {
    const err = validateDraft();
    if (err) { setActionError(err); return; }
    setSaving(true); setActionError("");
    try {
      const payload = {
        ...draft,
        progress: Number(draft.progress),
        dueDate: draft.dueDate ? draft.dueDate : undefined,
      };
      const res = await createTask(payload);
      const item = res?.data ?? res;
      setTasks((p) => [item, ...p]);
      setModal(null);
       } catch (e) { setActionError(e.message || t("tasks.createError", "Failed to create task.")); }
    finally { setSaving(false); }
  };

  // ── EDIT ─────────────────────────────────────────────────────────────────────
  const openEdit = (task) => {
    setEditingId(task.id);
    setDraft({
      title: task.title || "",
      description: task.description || "",
      organizationId: task.organizationId || "",
      assignedEmployeeIds: task.assignedEmployeeIds || [],
      status: task.status || "TODO",
      priority: task.priority || "MEDIUM",
      progress: task.progress ?? 0,
      dueDate: task.dueDate ? task.dueDate.slice(0, 16) : "",
    });
    setActionError("");
    setModal("edit");
  };

  const handleEdit = async () => {
    const err = validateDraft();
    if (err) { setActionError(err); return; }
    setSaving(true); setActionError("");
    try {
      const payload = {
        id: editingId,
        ...draft,
        progress: Number(draft.progress),
        dueDate: draft.dueDate ? draft.dueDate : undefined,
      };
      const res = await updateTask(payload);
      const item = res?.data ?? res;
      setTasks((p) => p.map((t) => t.id === editingId ? { ...t, ...item } : t));
      setModal(null);
       } catch (e) { setActionError(e.message || t("tasks.updateError", "Failed to update task.")); }
    finally { setSaving(false); }
  };

  // ── QUICK STATUS UPDATE ───────────────────────────────────────────────────────
  const handleStatusChange = async (task, newStatus) => {
    const progress = newStatus === "DONE" ? 100 : newStatus === "TODO" ? 0 : task.progress;
    try {
      const res = await updateTaskStatus(task.id, { status: newStatus, progress });
      const item = res?.data ?? res;
      setTasks((p) => p.map((t) => t.id === task.id ? { ...t, ...item, status: newStatus, progress } : t));
      if (detailTask?.id === task.id) setDetailTask((d) => ({ ...d, status: newStatus, progress }));
     } catch (e) { alert(e.message || t("tasks.statusUpdateError", "Failed to update status.")); }
  };

  const handleProgressChange = async (task, newProgress) => {
    try {
      const res = await updateTaskStatus(task.id, { status: task.status, progress: newProgress });
      const item = res?.data ?? res;
      setTasks((p) => p.map((t) => t.id === task.id ? { ...t, ...item } : t));
      if (detailTask?.id === task.id) setDetailTask((d) => ({ ...d, progress: newProgress }));
    } catch (e) { /* silent */ }
  };

  // ── DELETE ────────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setSaving(true); setActionError("");
    try {
      await deleteTask(pendingDelete.id);
      setTasks((p) => p.filter((t) => t.id !== pendingDelete.id));
      setModal(null); setPendingDelete(null);
       } catch (e) { setActionError(e.message || t("tasks.deleteError", "Failed to delete task.")); }
    finally { setSaving(false); }
  };

  const FormBody = (
    <div className="space-y-4">
      <FieldGroup label={t("tasks.titleLabel", "Title")}>
        <input className={INPUT} placeholder={t("tasks.titlePlaceholder", "e.g. Review DPP compliance")} value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} />
      </FieldGroup>

      <FieldGroup label={t("tasks.descriptionLabel", "Description")}>
        <textarea className={TEXTAREA} rows={3} placeholder={t("tasks.descriptionPlaceholder", "Optional details...")} value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} />
      </FieldGroup>

      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label={t("tasks.statusLabel", "Status")}>
          <select className={SELECT} value={draft.status} onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value }))}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_STYLE[s]?.label || s}</option>)}
          </select>
        </FieldGroup>
        <FieldGroup label={t("tasks.priorityLabel", "Priority")}>
          <select className={SELECT} value={draft.priority} onChange={(e) => setDraft((p) => ({ ...p, priority: e.target.value }))}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </FieldGroup>
      </div>

      <FieldGroup label={t("tasks.dueDateLabel", "Due Date")}>
        <input type="datetime-local" className={INPUT} value={draft.dueDate} onChange={(e) => setDraft((p) => ({ ...p, dueDate: e.target.value }))} />
      </FieldGroup>

      <ProgressBar value={draft.progress} onChange={(v) => setDraft((p) => ({ ...p, progress: v }))} t={t} />

      <FieldGroup label={t("tasks.organizationLabel", "Organization")}>
        <select className={SELECT} value={draft.organizationId} onChange={(e) => setDraft((p) => ({ ...p, organizationId: e.target.value }))}>
          <option value="">{t("tasks.selectOrgPlaceholder", "Select an organization...")}</option>
          {orgs.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
        </select>
      </FieldGroup>

      {employees.length > 0 && (
      <FieldGroup label={t("tasks.assignEmployees", "Assign Employees")}>
        <select
          multiple
          className={`${SELECT} h-44`}
          value={draft.assignedEmployeeIds}
          onChange={(e) => setDraft((p) => ({ ...p, assignedEmployeeIds: Array.from(e.target.selectedOptions, (opt) => opt.value) }))}
        >
          {employees
            .filter((e) => !draft.organizationId || !e.organizationId || e.organizationId === draft.organizationId)
            .map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.fullName}{emp.role ? ` (${emp.role})` : ""}</option>
            ))}
        </select>
        {draft.organizationId && employees.filter((e) => !e.organizationId || e.organizationId === draft.organizationId).length === 0 && (
          <p className="text-xs text-slate-400 mt-1">{t("tasks.noEmployees", "No employees in this organization.")}</p>
        )}
        {employees.length > 0 && (
          <p className="text-[10px] text-slate-400 mt-1">{t("tasks.multiSelectHint", "Hold Ctrl/Cmd to select multiple employees.")}</p>
        )}
      </FieldGroup>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">{t("tasks.title", "Workforce")}</p>
                <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{t("tasks.tasks", "Tasks")}</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("tasks.subtitle", "Create tasks, assign to employees, and track their progress.")}</p>
          </div>
          {canManage && (
            <button type="button" onClick={openCreate} className="btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t("tasks.newTask", "New Task")}
            </button>
          )}
        </div>

        {/* KPI strips */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { key: "ALL", label: t("tasks.allTasks", "All Tasks"), value: tasks.length },
            ...STATUSES.map((s) => ({ key: s, label: STATUS_STYLE[s]?.label || s, value: counts[s] || 0 })),
          ].map(({ key, label, value }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 ${
                statusFilter === key ? "bg-brand-600 shadow-lg" : "glass-card hover:shadow-soft-xl"
              }`}
            >
              <p className={`text-2xl font-extrabold ${statusFilter === key ? "text-white" : "text-slate-900 dark:text-slate-100"}`}>{value}</p>
              <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${statusFilter === key ? "text-brand-200" : "text-slate-400"}`}>{label}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <OrgSelector value={selectedOrgId} onChange={setSelectedOrgId} className="flex-1" />
          <div className="relative max-w-xs w-full">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/50 pl-9 pr-4 text-sm text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10" placeholder={t("tasks.searchPlaceholder", "Search tasks...")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        {/* Task grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">{t("tasks.loading", "Loading tasks...")}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="mx-auto w-10 h-10 text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            <p className="text-sm font-semibold text-slate-500">{search || selectedOrgId ? t("tasks.noMatch", "No tasks match your filters.") : canManage ? t("tasks.noTasks", "No tasks yet — create one above.") : t("tasks.noAssignedTasks", "No tasks assigned to you yet.")}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((task) => {
              const st = STATUS_STYLE[task.status] || STATUS_STYLE.TODO;
              const pri = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.MEDIUM;
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE" && task.status !== "CANCELLED";
              return (
                <article
                  key={task.id}
                  className="group glass-card p-5 cursor-pointer hover:-translate-y-0.5 hover:shadow-soft-xl transition-all"
                  onClick={() => { setDetailTask(task); setModal("detail"); }}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${st.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${pri}`}>
                        {task.priority}
                      </span>
                    </div>
                    {canManage && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => openEdit(task)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      {role === "ADMIN" && (
                        <button type="button" onClick={() => setHistoryId(task.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all" title="View History">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                      )}
                      <button type="button" onClick={() => { setPendingDelete(task); setActionError(""); setModal("delete"); }} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                    )}
                  </div>

                  {/* Title */}
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug mb-1">{task.title}</p>
                  {task.description && <p className="text-xs text-slate-400 line-clamp-2 mb-3">{task.description}</p>}

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-400 font-semibold">{t("tasks.progress", "Progress")}</span>
                      <span className="text-[10px] font-bold text-slate-600">{task.progress ?? 0}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                      <div className={`h-full rounded-full transition-all ${(task.progress ?? 0) >= 100 ? "bg-emerald-500" : (task.progress ?? 0) >= 60 ? "bg-brand-500" : (task.progress ?? 0) >= 30 ? "bg-amber-500" : "bg-slate-300"}`}
                        style={{ width: `${task.progress ?? 0}%` }} />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                    <div className="flex -space-x-1.5">
                      {(task.assignedEmployeeIds || []).slice(0, 4).map((empId) => {
                        const emp = employees.find((e) => e.id === empId);
                        return (
                          <div key={empId} className="h-6 w-6 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center ring-2 ring-white" title={emp?.fullName || empId}>
                            {emp?.fullName?.[0]?.toUpperCase() || "?"}
                          </div>
                        );
                      })}
                      {(task.assignedEmployeeIds?.length || 0) > 4 && (
                        <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                          +{task.assignedEmployeeIds.length - 4}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isOverdue && (
                        <span className="text-[10px] font-bold text-rose-500">{t("tasks.overdue", "Overdue")}</span>
                      )}
                      {task.dueDate && (
                        <span className="text-[10px] text-slate-400">
                          {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT MODAL ─────────────────────────────────────────────── */}
      {canManage && (modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4 py-6 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-slate-900/10 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-7 pt-7 pb-4 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{modal === "create" ? t("tasks.newTask", "New Task") : t("tasks.editTask", "Edit Task")}</h2>
            </div>
            <div className="overflow-y-auto flex-1 px-7 py-5">{FormBody}</div>
            {actionError && <p className="px-7 text-sm text-rose-600">{actionError}</p>}
            <div className="px-7 py-5 border-t border-slate-100 dark:border-white/[0.06] flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary py-2 px-5 text-sm">{t("tasks.cancel", "Cancel")}</button>
              <button type="button" onClick={modal === "create" ? handleCreate : handleEdit} disabled={saving} className="btn-primary py-2 px-5 text-sm">
                {saving ? t("tasks.saving", "Saving...") : modal === "create" ? t("tasks.createTask", "Create Task") : t("tasks.saveChanges", "Save Changes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ────────────────────────────────────────────────────── */}
      {modal === "detail" && detailTask && (() => {
        const st = STATUS_STYLE[detailTask.status] || STATUS_STYLE.TODO;
        const pri = PRIORITY_STYLE[detailTask.priority] || PRIORITY_STYLE.MEDIUM;
        const isOverdue = detailTask.dueDate && new Date(detailTask.dueDate) < new Date() && detailTask.status !== "DONE" && detailTask.status !== "CANCELLED";
        const assignedEmps = (detailTask.assignedEmployeeIds || []).map((id) => employees.find((e) => e.id === id)).filter(Boolean);
        return (
          <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4 py-6 animate-fade-in" onClick={() => setModal(null)}>
            <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-slate-900/10 max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-7 pt-7 pb-6 shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${st.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                      </span>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${pri}`}>{detailTask.priority}</span>
                      {isOverdue && <span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold bg-rose-100 text-rose-600">{t("tasks.overdue", "Overdue")}</span>}
                    </div>
                    <h2 className="text-xl font-extrabold text-white leading-snug">{detailTask.title}</h2>
                    <p className="mt-1 text-xs text-slate-400">{orgName(detailTask.organizationId)}</p>
                  </div>
                  <button type="button" onClick={() => setModal(null)} className="text-white/50 hover:text-white p-1 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 p-7 space-y-5">
                    {detailTask.description && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{t("tasks.description", "Description")}</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{detailTask.description}</p>
                      </div>
                    )}

                {/* Live progress */}
                <ProgressBar
                  value={detailTask.progress ?? 0}
                  onChange={(v) => handleProgressChange(detailTask, v)}
                  t={t}
                />

                {/* Status quick-change */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{t("tasks.updateStatus", "Update Status")}</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((s) => {
                      const sst = STATUS_STYLE[s];
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleStatusChange(detailTask, s)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-all ${
                            detailTask.status === s ? `${sst.bg} ring-2 ring-offset-1 ring-current` : "border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:border-slate-300 bg-white dark:bg-slate-700"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${sst.dot}`} />{sst.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Assigned employees */}
                    {assignedEmps.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{t("tasks.assignedTo", "Assigned To")}</p>
                    <div className="space-y-2">
                      {assignedEmps.map((emp) => (
                        <div key={emp.id} className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-white/[0.06] px-3 py-2.5">
                          <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {emp.fullName?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{emp.fullName}</p>
                            <p className="text-[10px] text-slate-400">{emp.role || emp.department}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3">
                       {detailTask.dueDate && (
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-white/[0.06] px-3 py-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("tasks.dueDate", "Due Date")}</p>
                      <p className={`text-sm font-semibold mt-0.5 ${isOverdue ? "text-rose-600" : "text-slate-900 dark:text-slate-100"}`}>
                        {new Date(detailTask.dueDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                  )}
                   <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-white/[0.06] px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("tasks.createdBy", "Created By")}</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5 truncate">{detailTask.createdBy || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="px-7 py-4 border-t border-slate-100 dark:border-white/[0.06] flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => { setModal(null); openEdit(detailTask); }} className="btn-secondary py-2 px-5 text-sm">{t("tasks.edit", "Edit")}</button>
                <button type="button" onClick={() => setModal(null)} className="btn-primary py-2 px-5 text-sm">{t("tasks.close", "Close")}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── DELETE MODAL ────────────────────────────────────────────────────── */}
      {canManage && modal === "delete" && pendingDelete && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 p-7 shadow-2xl ring-1 ring-slate-900/10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t("tasks.deleteTask", "Delete Task")}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t("tasks.deleteConfirm", `Delete "${pendingDelete.title}"? This cannot be undone.`)}</p>
            {actionError && <p className="mt-3 text-sm text-rose-600">{actionError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary py-2 px-5 text-sm">{t("tasks.cancel", "Cancel")}</button>
              <button type="button" onClick={handleDelete} disabled={saving} className="py-2 px-5 text-sm font-semibold rounded-full bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 transition-colors">
                {saving ? t("tasks.deleting", "Deleting...") : t("tasks.delete", "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      <AuditHistoryModal entityType="Task" entityId={historyId} onClose={() => setHistoryId(null)} />
    </DashboardLayout>
  );
}
