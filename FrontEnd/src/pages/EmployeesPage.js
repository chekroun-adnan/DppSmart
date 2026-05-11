import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import OrgSelector from "../components/OrgSelector";
import {
  createEmployee,
  deleteEmployee,
  getEmployees,
  getMainOrganizations,
  getMyOrganizations,
  getSubOrganizations,
  updateEmployee,
} from "../services/authService";
import AuditHistoryModal from "../components/AuditHistoryModal";

const loadOrgs = () => {
  const r = (localStorage.getItem("userRole") || "").toUpperCase();
  return r === "ADMIN"
    ? Promise.all([getMainOrganizations(), getSubOrganizations()]).then(([m, s]) => [...m, ...s])
    : getMyOrganizations();
};

const emptyDraft = { fullName: "", email: "", password: "", role: "Employee", organizationId: "" };

const INPUT = "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const SELECT = "h-11 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 pl-4 pr-10 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 cursor-pointer bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzY0NzQ4YiIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_0.75rem_center] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzk0YTNiOCIvPjwvc3ZnPg==')] dark:bg-[right_0.75rem_center]";

function FieldGroup({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function EmployeesPage() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [modal, setModal] = useState(null);
  const [editingId, setEditingId] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState(() => localStorage.getItem("orgId") || "");
  const [historyId, setHistoryId] = useState(null);
  const role = (localStorage.getItem("userRole") || "").toUpperCase();

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [empData, orgData] = await Promise.all([getEmployees(), loadOrgs()]);
        if (mounted) { setEmployees(empData); setOrgs(orgData); }
      } catch (e) {
        if (mounted) setError(e.message || t("errors.serverError", "Failed to load employees."));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const orgName = (id) => orgs.find((o) => o.id === id)?.name || id || "—";

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    const matchesOrg = !selectedOrgId || e.organizationId === selectedOrgId;
    const matchesSearch = !q || [e.fullName, e.role, e.email].some((f) => f?.toLowerCase().includes(q));
    return matchesOrg && matchesSearch;
  });

  const openCreate = () => { setDraft(emptyDraft); setActionError(""); setModal("create"); };
  const openEdit = (emp) => {
    setEditingId(emp.id);
    setDraft({ fullName: emp.fullName || "", email: emp.email || "", password: "", role: emp.role || "", organizationId: emp.organizationId || "" });
    setActionError("");
    setModal("edit");
  };

  const validateDraft = () => {
    if (!draft.fullName?.trim()) return t("employees.fullNameRequired", "Full name is required.");
    if (!draft.email?.trim()) return "Email is required.";
    if (modal === "create" && (!draft.password || draft.password.length < 6)) return "Password must be at least 6 characters.";
    if (!draft.role?.trim()) return t("employees.roleRequired", "Role is required.");
    if (!draft.organizationId) return t("common.selectOrganization");
    return null;
  };

  const buildPayload = () => ({
    fullName: draft.fullName,
    email: draft.email,
    role: draft.role,
    organizationId: draft.organizationId,
    ...(modal === "create" && draft.password ? { password: draft.password } : {}),
  });

  const handleCreate = async () => {
    const err = validateDraft();
    if (err) { setActionError(err); return; }
    setSaving(true); setActionError("");
    try {
      const res = await createEmployee(buildPayload());
      const item = res?.data ?? res;
      setEmployees((prev) => [item, ...prev]);
      setModal(null);
    } catch (e) { setActionError(e.message || t("employees.createFailed", "Failed to create employee.")); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    const err = validateDraft();
    if (err) { setActionError(err); return; }
    setSaving(true); setActionError("");
    try {
      const res = await updateEmployee({ id: editingId, ...buildPayload() });
      const item = res?.data ?? res;
      setEmployees((prev) => prev.map((e) => (e.id === editingId ? { ...e, ...item } : e)));
      setModal(null);
    } catch (e) { setActionError(e.message || t("employees.updateFailed", "Failed to update employee.")); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true); setActionError("");
    try {
      await deleteEmployee(pendingDelete.id);
      setEmployees((prev) => prev.filter((e) => e.id !== pendingDelete.id));
      setModal(null); setPendingDelete(null);
    } catch (e) { setActionError(e.message || t("employees.deleteFailed", "Failed to delete employee.")); }
    finally { setSaving(false); }
  };

  const FormContent = (
    <>
      <FieldGroup label={t("employees.fullName")}>
        <input className={INPUT} placeholder="Jane Dupont" value={draft.fullName} onChange={(e) => setDraft((p) => ({ ...p, fullName: e.target.value }))} />
      </FieldGroup>
      <FieldGroup label="Email">
        <input type="email" className={INPUT} placeholder="employee@company.com" value={draft.email} onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))} />
      </FieldGroup>
      <FieldGroup label={modal === "create" ? "Password" : "New Password (leave blank to keep current)"}>
        <input type="password" className={INPUT} placeholder={modal === "create" ? "Min. 6 characters" : "Leave blank to keep current"} value={draft.password} onChange={(e) => setDraft((p) => ({ ...p, password: e.target.value }))} />
      </FieldGroup>
      <FieldGroup label={t("employees.role")}>
        <input className={INPUT} placeholder="Production Operator" value={draft.role} onChange={(e) => setDraft((p) => ({ ...p, role: e.target.value }))} />
      </FieldGroup>
      <FieldGroup label={t("organizations.title")}>
        <select className={SELECT} value={draft.organizationId} onChange={(e) => setDraft((p) => ({ ...p, organizationId: e.target.value }))}>
          <option value="">— Select organization —</option>
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name} {org.type === "MAIN" ? "(Main)" : "(Sub)"}
            </option>
          ))}
        </select>
      </FieldGroup>
    </>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">{t("employees.workforce", "Workforce")}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{t("employees.title")}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("employees.subtitle", "Manage your workforce and performance records.")}</p>
          </div>
          <button type="button" onClick={openCreate} className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t("employees.addEmployee", "Add Employee")}
          </button>
        </div>

        <OrgSelector value={selectedOrgId} onChange={setSelectedOrgId} />

        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/50 pl-9 pr-4 text-sm text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10" placeholder={t("employees.searchPlaceholder", "Search employees...")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="glass-card overflow-hidden border-slate-200">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              <p className="text-sm text-slate-500">{t("employees.loading", "Loading employees...")}</p>
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-rose-600">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-slate-500">{search ? t("common.noData") : t("employees.noEmployeesYet", "No employees yet.")}</p>
              {!search && <button type="button" onClick={openCreate} className="btn-primary mt-4 text-sm">{t("employees.addFirst", "Add first employee")}</button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.18em] text-slate-400 border-b border-slate-100 dark:border-white/[0.06]">
                    <th className="px-6 py-4 font-bold">{t("employees.employee", "Employee")}</th>
                    <th className="px-6 py-4 font-bold">Email</th>
                    <th className="px-6 py-4 font-bold">{t("organizations.title")}</th>
                    <th className="px-6 py-4 font-bold text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                  {filtered.map((emp) => (
                    <tr key={emp.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm flex-none">
                            {emp.fullName?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{emp.fullName || "—"}</p>
                            <p className="text-xs text-slate-400">{emp.role || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{emp.email || "—"}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{orgName(emp.organizationId)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={() => openEdit(emp)} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-all bg-white dark:bg-slate-700">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          {role === "ADMIN" && (
                            <button type="button" onClick={() => setHistoryId(emp.id)} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-amber-600 hover:border-amber-200 transition-all bg-white dark:bg-slate-700" title="View History">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                          )}
                          <button type="button" onClick={() => { setPendingDelete(emp); setActionError(""); setModal("delete"); }} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all bg-white dark:bg-slate-700">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4 py-6 animate-fade-in" onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-slate-900/10 max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-7 pt-7 pb-4 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{modal === "create" ? t("employees.addEmployee", "Add Employee") : t("employees.editEmployee", "Edit Employee")}</h2>
            </div>
            <div className="overflow-y-auto flex-1 px-7 py-5 space-y-4">{FormContent}</div>
            {actionError && <p className="px-7 text-sm text-rose-600">{actionError}</p>}
            <div className="px-7 py-5 border-t border-slate-100 dark:border-white/[0.06] flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary py-2 px-5 text-sm">{t("common.cancel")}</button>
              <button type="button" onClick={modal === "create" ? handleCreate : handleEdit} disabled={saving} className="btn-primary py-2 px-5 text-sm">
                {saving ? t("common.saving", "Saving...") : modal === "create" ? t("common.create") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "delete" && pendingDelete && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 p-7 shadow-2xl ring-1 ring-slate-900/10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t("employees.deleteEmployee", "Delete Employee")}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t("employees.deleteConfirm", `Delete "${pendingDelete.fullName}"? This cannot be undone.`)}</p>
            {actionError && <p className="mt-3 text-sm text-rose-600">{actionError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary py-2 px-5 text-sm">{t("common.cancel")}</button>
              <button type="button" onClick={handleDelete} disabled={saving} className="py-2 px-5 text-sm font-semibold rounded-full bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 transition-colors">
                {saving ? t("common.deleting", "Deleting...") : t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      <AuditHistoryModal entityType="Employee" entityId={historyId} onClose={() => setHistoryId(null)} />
    </DashboardLayout>
  );
}
