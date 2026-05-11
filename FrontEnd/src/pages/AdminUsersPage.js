import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import { adminCreateUser, adminDeleteUser, adminGetAllUsers, adminUpdateUser, getMainOrganizations, getSubOrganizations } from "../services/authService";

const ROLES = ["ADMIN", "SUBADMIN", "EMPLOYEE", "CLIENT"];

const ROLE_STYLE = {
  ADMIN: "status-red",
  SUBADMIN: "status-purple",
  EMPLOYEE: "status-sky",
  CLIENT: "status-emerald",
};

const INPUT = "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const SELECT = "h-11 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 pl-4 pr-10 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 cursor-pointer bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzY0NzQ4YiIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_0.75rem_center] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzk0YTNiOCIvPjwvc3ZnPg==')] dark:bg-[right_0.75rem_center]";

const emptyDraft = { name: "", email: "", password: "", role: "EMPLOYEE", organizationId: "", assignedOrganizationIds: [] };

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [availableOrgs, setAvailableOrgs] = useState([]);

  useEffect(() => {
    getMainOrganizations()
      .then((main) => getSubOrganizations().then((sub) => [...(Array.isArray(main) ? main : []), ...(Array.isArray(sub) ? sub : [])]))
      .then(setAvailableOrgs)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await adminGetAllUsers();
        if (mounted) setUsers(data);
      } catch (e) {
        if (mounted) setError(e.message || "Failed to load users.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || [u.name, u.email, u.role].some((f) => f?.toLowerCase().includes(q));
  });

  const openCreate = () => { setDraft(emptyDraft); setActionError(""); setModal("create"); };
  const openEdit = (user) => {
    setEditingId(user.id);
    setDraft({ name: user.name || "", email: user.email || "", password: "", role: user.role || "EMPLOYEE", organizationId: user.organizationId || "", assignedOrganizationIds: user.assignedOrganizationIds || [] });
    setActionError("");
    setModal("edit");
  };

  const handleCreate = async () => {
    setSaving(true); setActionError("");
    try {
      if (!draft.name.trim()) { setActionError("Name is required."); setSaving(false); return; }
      if (!draft.email.trim()) { setActionError("Email is required."); setSaving(false); return; }
      if (!draft.password || draft.password.length < 6) { setActionError("Password must be at least 6 characters."); setSaving(false); return; }
      const payload = { ...draft };
      if (!payload.organizationId) delete payload.organizationId;
      if (!payload.assignedOrganizationIds?.length) delete payload.assignedOrganizationIds;
      const res = await adminCreateUser(payload);
      const item = res?.data ?? res;
      setUsers((prev) => [item, ...prev]);
      setModal(null);
    } catch (e) { setActionError(e.message || "Failed to create user."); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    setSaving(true); setActionError("");
    try {
      const payload = { name: draft.name, email: draft.email, role: draft.role };
      if (draft.organizationId) payload.organizationId = draft.organizationId;
      if (draft.assignedOrganizationIds?.length > 0) payload.assignedOrganizationIds = draft.assignedOrganizationIds;
      const res = await adminUpdateUser(editingId, payload);
      const item = res?.data ?? res;
      setUsers((prev) => prev.map((u) => u.id === editingId ? { ...u, ...item } : u));
      setModal(null);
    } catch (e) { setActionError(e.message || "Failed to update user."); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true); setActionError("");
    try {
      await adminDeleteUser(pendingDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== pendingDelete.id));
      setModal(null); setPendingDelete(null);
    } catch (e) { setActionError(e.message || "Failed to delete user."); }
    finally { setSaving(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">{t("adminUsers.title", "Administration")}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{t("adminUsers.userManagement", "User Management")}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("adminUsers.subtitle", "Manage platform accounts and access roles.")}</p>
          </div>
          <button type="button" onClick={openCreate} className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t("adminUsers.addUser", "Add User")}
          </button>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative max-w-xs flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/50 pl-9 pr-4 text-sm text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10" placeholder={t("adminUsers.searchPlaceholder", "Search users...")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {ROLES.map((r) => (
              <span key={r} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${ROLE_STYLE[r]}`}>
                <span>{users.filter((u) => u.role === r).length}</span>
                <span>{r}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="glass-card overflow-hidden border-slate-200">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
               <p className="text-sm text-slate-500">{t("adminUsers.loading", "Loading users...")}</p>
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-rose-600">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-slate-500">{search ? "No results." : "No users found."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.18em] text-slate-400 border-b border-slate-100 dark:border-white/[0.06]">
                    <th className="px-6 py-4 font-bold">User</th>
                    <th className="px-6 py-4 font-bold">Email</th>
                    <th className="px-6 py-4 font-bold">Role</th>
                    <th className="px-6 py-4 font-bold">Created</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                  {filtered.map((user) => (
                    <tr key={user.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 flex-none rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
                            {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
                          </div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{user.name || "—"}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${ROLE_STYLE[user.role] || "status-slate"}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={() => openEdit(user)} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-all bg-white dark:bg-slate-700">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button type="button" onClick={() => { setPendingDelete(user); setActionError(""); setModal("delete"); }} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all bg-white dark:bg-slate-700">
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

      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 p-7 shadow-2xl ring-1 ring-slate-900/10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-5">{modal === "create" ? "Add User" : "Edit User"}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Full Name</label>
                <input className={INPUT} placeholder="Jane Dupont" value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Email</label>
                <input type="email" className={INPUT} placeholder="user@company.com" value={draft.email} onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))} />
              </div>
              {modal === "create" && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Password</label>
                  <input type="password" className={INPUT} placeholder="Min. 8 chars with upper, lower, digit, symbol" value={draft.password} onChange={(e) => setDraft((p) => ({ ...p, password: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Role</label>
                <select className={SELECT} value={draft.role} onChange={(e) => setDraft((p) => ({ ...p, role: e.target.value, organizationId: "", assignedOrganizationIds: [] }))}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {(draft.role === "EMPLOYEE" || draft.role === "SUBADMIN") && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    Organization {draft.role === "EMPLOYEE" ? "(required)" : "(primary)"}
                  </label>
                  <select className={SELECT} value={draft.organizationId} onChange={(e) => setDraft((p) => ({ ...p, organizationId: e.target.value }))}>
                    <option value="">— Select organization —</option>
                    {availableOrgs.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} {org.type === "MAIN" ? "(Main)" : "(Sub)"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {draft.role === "SUBADMIN" && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    Additional Organizations
                  </label>
                  <div className="flex gap-2">
                    <select
                      className={SELECT}
                      value=""
                      onChange={(e) => {
                        const orgId = e.target.value;
                        if (orgId && !draft.assignedOrganizationIds.includes(orgId) && orgId !== draft.organizationId) {
                          setDraft((p) => ({ ...p, assignedOrganizationIds: [...p.assignedOrganizationIds, orgId] }));
                        }
                      }}
                    >
                      <option value="">+ Add organization</option>
                      {availableOrgs
                        .filter((org) => org.id !== draft.organizationId && !draft.assignedOrganizationIds.includes(org.id))
                        .map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name} {org.type === "MAIN" ? "(Main)" : "(Sub)"}
                          </option>
                        ))}
                    </select>
                  </div>
                  {draft.assignedOrganizationIds.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {draft.assignedOrganizationIds.map((id) => {
                        const org = availableOrgs.find((o) => o.id === id);
                        if (!org) return null;
                        return (
                          <div key={id} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-700/50 px-3 py-2">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {org.name} <span className="text-[10px] uppercase text-slate-400">{org.type === "MAIN" ? "Main" : "Sub"}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setDraft((p) => ({ ...p, assignedOrganizationIds: p.assignedOrganizationIds.filter((x) => x !== id) }))}
                              className="text-slate-400 hover:text-rose-500 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            {actionError && <p className="mt-4 text-sm text-rose-600">{actionError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary py-2 px-5 text-sm">Cancel</button>
              <button type="button" onClick={modal === "create" ? handleCreate : handleEdit} disabled={saving} className="btn-primary py-2 px-5 text-sm">
                {saving ? "Saving..." : modal === "create" ? "Create User" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "delete" && pendingDelete && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 p-7 shadow-2xl ring-1 ring-slate-900/10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Delete User</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Permanently delete <span className="font-bold">{pendingDelete.name || pendingDelete.email}</span>?</p>
            {actionError && <p className="mt-3 text-sm text-rose-600">{actionError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary py-2 px-5 text-sm">Cancel</button>
              <button type="button" onClick={handleDelete} disabled={saving} className="py-2 px-5 text-sm font-semibold rounded-full bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 transition-colors">
                {saving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
