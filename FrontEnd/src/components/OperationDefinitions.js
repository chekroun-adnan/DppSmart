import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import OrgSelector from "../components/OrgSelector";
import {
  getOperations,
  getOperationsByOrg,
  createOperation,
  updateOperation,
  deactivateOperation,
  activateOperation,
  deleteOperation,
} from "../services/operationsApi";
import { getMyOrganizations, getMainOrganizations, getSubOrganizations } from "../services/authService";

const loadOrgs = () => {
  const r = (localStorage.getItem("userRole") || "").toUpperCase();
  return r === "ADMIN"
    ? Promise.all([getMainOrganizations(), getSubOrganizations()]).then(([m, s]) => [...m, ...s])
    : getMyOrganizations();
};

const EMPTY_DRAFT = {
  name: "",
  description: "",
  estimatedDuration: "",
  durationUnit: "MINUTES",
  organizationId: "",
};

const OPERATION_NAMES = [
  "Fabric Preparation",
  "Cutting",
  "Screen Printing",
  "Embroidery",
  "Sewing",
  "Quality Control",
  "Ironing",
  "Packaging",
  "Finished Stock",
  "Delivery",
];

const OPERATION_KEYS = {
  "Fabric Preparation": "operations.fabricPreparation",
  "Cutting": "operations.cutting",
  "Screen Printing": "operations.screenPrinting",
  "Embroidery": "operations.embroidery",
  "Sewing": "operations.sewing",
  "Quality Control": "operations.qualityControl",
  "Ironing": "operations.ironing",
  "Packaging": "operations.packaging",
  "Finished Stock": "operations.finishedStock",
  "Delivery": "operations.delivery",
};

const DURATION_UNITS = ["MINUTES", "HOURS", "DAYS"];

const INPUT =
  "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const SELECT =
  "h-11 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 pl-4 pr-10 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 cursor-pointer bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzY0NzQ4YiIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_0.75rem_center] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzk0YTNiOCIvPjwvc3ZnPg==')] dark:bg-[right_0.75rem_center]";
const TEXTAREA =
  "h-24 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 resize-none";

function FieldGroup({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function DurationBadge({ unit }) {
  const colors = {
    MINUTES: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
    HOURS: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
    DAYS: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[unit] || "bg-slate-100 text-slate-600"}`}>
      {unit}
    </span>
  );
}

function ActiveBadge({ active }) {
  return active
    ? <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">Active</span>
    : <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">Inactive</span>;
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/[0.06] last:border-0">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 text-right max-w-[60%] break-words">{value || "—"}</span>
    </div>
  );
}

export default function OperationDefinitions() {
  const { t } = useTranslation();
  const role = (localStorage.getItem("userRole") || "").toUpperCase();
  const [operations, setOperations] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [modal, setModal] = useState(null);
  const [editingId, setEditingId] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState(() => localStorage.getItem("orgId") || "");
  const [viewingOp, setViewingOp] = useState(null);

  const canManage = role === "ADMIN" || role === "SUBADMIN";

  useEffect(() => {
    let mounted = true;
    loadOrgs().then((orgData) => { if (mounted) setOrgs(orgData); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    async function load() {
      try {
        const orgIdToUse = selectedOrgId || localStorage.getItem("orgId");
        const data = orgIdToUse ? await getOperationsByOrg(orgIdToUse) : await getOperations();
        if (mounted) setOperations(data);
      } catch (e) {
        if (mounted) setError(e.message || "Failed to load operations.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [selectedOrgId]);

  const orgName = (id) => orgs.find((o) => o.id === id)?.name || id || "—";

  const filtered = operations.filter((op) => {
    const q = search.toLowerCase();
    return !q || [op.name, op.description].some((f) => f?.toLowerCase().includes(q));
  });

  const openCreate = () => {
    setDraft({ ...EMPTY_DRAFT, organizationId: selectedOrgId || localStorage.getItem("orgId") || "" });
    setActionError("");
    setModal("create");
  };

  const openEdit = (op) => {
    setEditingId(op.id);
    setDraft({
      name: op.name || "",
      description: op.description || "",
      estimatedDuration: op.estimatedDuration ?? "",
      durationUnit: op.durationUnit || "MINUTES",
      organizationId: op.organizationId || "",
    });
    setActionError("");
    setModal("edit");
  };

  const openView = (op) => setViewingOp(op);

  const validateDraft = () => {
    if (!draft.name?.trim()) return "Operation name is required.";
    if (!draft.organizationId) return "Organization is required.";
    if (draft.estimatedDuration !== "" && (Number(draft.estimatedDuration) < 0 || isNaN(Number(draft.estimatedDuration))))
      return "Estimated duration must be a positive number.";
    return null;
  };

  const buildPayload = () => ({
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    estimatedDuration: draft.estimatedDuration !== "" ? Number(draft.estimatedDuration) : undefined,
    durationUnit: draft.durationUnit || undefined,
    organizationId: draft.organizationId,
  });

  const handleCreate = async () => {
    const err = validateDraft();
    if (err) { setActionError(err); return; }
    setSaving(true); setActionError("");
    try {
      const res = await createOperation(buildPayload());
      const item = res?.data ?? res;
      setOperations((prev) => [item, ...prev]);
      setModal(null);
    } catch (e) { setActionError(e.message || "Failed to create operation."); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    const err = validateDraft();
    if (err) { setActionError(err); return; }
    setSaving(true); setActionError("");
    try {
      const res = await updateOperation(editingId, buildPayload());
      const item = res?.data ?? res;
      setOperations((prev) => prev.map((op) => (op.id === editingId ? { ...op, ...item } : op)));
      setModal(null);
    } catch (e) { setActionError(e.message || "Failed to update operation."); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (op) => {
    setSaving(true);
    try {
      const res = op.active ? await deactivateOperation(op.id) : await activateOperation(op.id);
      const item = res?.data ?? res;
      setOperations((prev) => prev.map((o) => (o.id === op.id ? { ...o, ...item } : o)));
      if (viewingOp?.id === op.id) setViewingOp((prev) => prev ? { ...prev, ...item } : prev);
    } catch (e) { setActionError(e.message || "Failed to toggle status."); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true); setActionError("");
    try {
      await deleteOperation(pendingDelete.id);
      setOperations((prev) => prev.filter((o) => o.id !== pendingDelete.id));
      setModal(null); setPendingDelete(null);
    } catch (e) { setActionError(e.message || "Failed to delete operation."); }
    finally { setSaving(false); }
  };

  const FormFields = (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldGroup label="Operation Name *">
          <select className={SELECT} value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}>
            <option value="">— Select operation —</option>
            {OPERATION_NAMES.map((n) => <option key={n} value={n}>{t(OPERATION_KEYS[n])}</option>)}
          </select>
        </FieldGroup>
        <FieldGroup label="Organization *">
          <select className={SELECT} value={draft.organizationId} onChange={(e) => setDraft((p) => ({ ...p, organizationId: e.target.value }))}>
            <option value="">— Select —</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </FieldGroup>
      </div>

      <FieldGroup label="Description">
        <textarea className={TEXTAREA} placeholder="Describe the operation..." value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} />
      </FieldGroup>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldGroup label="Estimated Duration">
          <input type="number" min="0" step="0.1" className={INPUT} placeholder="e.g. 30" value={draft.estimatedDuration} onChange={(e) => setDraft((p) => ({ ...p, estimatedDuration: e.target.value }))} />
        </FieldGroup>
        <FieldGroup label="Duration Unit">
          <select className={SELECT} value={draft.durationUnit} onChange={(e) => setDraft((p) => ({ ...p, durationUnit: e.target.value }))}>
            {DURATION_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </FieldGroup>
      </div>


    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Operation Definitions</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Define reusable production operations used in technical sheets.</p>
        </div>
        {canManage && (
          <button type="button" onClick={openCreate} className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Operation
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <OrgSelector value={selectedOrgId} onChange={setSelectedOrgId} />
        <div className="relative max-w-sm flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/50 pl-9 pr-4 text-sm text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10" placeholder="Search operations..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="glass-card overflow-hidden border-slate-200">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Loading operations...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-slate-500">{search ? "No results match your search." : "No operations defined yet."}</p>
            {!search && canManage && <button type="button" onClick={openCreate} className="btn-primary mt-4 text-sm">Add first operation</button>}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.18em] text-slate-400 border-b border-slate-100 dark:border-white/[0.06]">
                    <th className="px-6 py-4 font-bold">Name</th>
                    <th className="px-6 py-4 font-bold">Duration</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                  {filtered.map((op) => (
                    <tr key={op.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer" onClick={() => openView(op)}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{OPERATION_KEYS[op.name] ? t(OPERATION_KEYS[op.name]) : (op.name || "—")}</p>
                          {op.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{op.description}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{op.estimatedDuration != null ? op.estimatedDuration : "—"}</span>
                          {op.durationUnit && <DurationBadge unit={op.durationUnit} />}
                        </div>
                      </td>
                      <td className="px-6 py-4"><ActiveBadge active={op.active} /></td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          {canManage && (
                            <>
                              <button type="button" onClick={() => handleToggleActive(op)} disabled={saving} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-amber-600 hover:border-amber-200 transition-all bg-white dark:bg-slate-700" title={op.active ? "Deactivate" : "Activate"}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                              </button>
                              <button type="button" onClick={() => openEdit(op)} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-all bg-white dark:bg-slate-700" title="Edit">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button type="button" onClick={() => { setPendingDelete(op); setActionError(""); setModal("delete"); }} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all bg-white dark:bg-slate-700" title="Delete">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-100 dark:divide-white/[0.05]">
              {filtered.map((op) => (
                <div key={op.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer" onClick={() => openView(op)}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{OPERATION_KEYS[op.name] ? t(OPERATION_KEYS[op.name]) : op.name}</p>
                      {op.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{op.description}</p>}
                    </div>
                    <ActiveBadge active={op.active} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {op.estimatedDuration != null && <span>{op.estimatedDuration} {op.durationUnit || ""}</span>}
                  </div>
                  {canManage && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                      <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(op); }} className="text-xs font-semibold text-brand-600 hover:text-brand-700">Edit</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleToggleActive(op); }} disabled={saving} className="text-xs font-semibold text-amber-600 hover:text-amber-700">{op.active ? "Deactivate" : "Activate"}</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setPendingDelete(op); setActionError(""); setModal("delete"); }} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4 py-6 animate-fade-in" onClick={() => setModal(null)}>
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-slate-900/10 max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-7 pt-7 pb-4 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{modal === "create" ? "Add Operation" : "Edit Operation"}</h2>
            </div>
            <div className="overflow-y-auto flex-1 px-7 py-5 space-y-4">{FormFields}</div>
            {actionError && <p className="px-7 text-sm text-rose-600">{actionError}</p>}
            <div className="px-7 py-5 border-t border-slate-100 dark:border-white/[0.06] flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary py-2 px-5 text-sm">Cancel</button>
              <button type="button" onClick={modal === "create" ? handleCreate : handleEdit} disabled={saving} className="btn-primary py-2 px-5 text-sm">
                {saving ? "Saving..." : modal === "create" ? "Create" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "delete" && pendingDelete && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 p-7 shadow-2xl ring-1 ring-slate-900/10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Delete Operation</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Delete "{pendingDelete.name}"? This cannot be undone.
            </p>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Tip: Operations referenced in technical sheets cannot be deleted. Deactivate them instead.
            </p>
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

      {viewingOp && (
        <div className="fixed inset-0 z-[80] flex justify-end bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] animate-fade-in" onClick={() => setViewingOp(null)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-white/[0.06] px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{OPERATION_KEYS[viewingOp.name] ? t(OPERATION_KEYS[viewingOp.name]) : viewingOp.name}</h2>
              <button type="button" onClick={() => setViewingOp(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ActiveBadge active={viewingOp.active} />
                {viewingOp.durationUnit && <DurationBadge unit={viewingOp.durationUnit} />}
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 space-y-1">
                <DetailRow label="Name" value={OPERATION_KEYS[viewingOp.name] ? t(OPERATION_KEYS[viewingOp.name]) : viewingOp.name} />
                <DetailRow label="Description" value={viewingOp.description} />
                <DetailRow label="Organization" value={orgName(viewingOp.organizationId)} />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Audit</p>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 space-y-1">
                  <DetailRow label="Created by" value={viewingOp.createdBy} />
                  <DetailRow label="Updated by" value={viewingOp.updatedBy} />
                  <DetailRow label="Created at" value={viewingOp.createdAt ? new Date(viewingOp.createdAt).toLocaleString() : "—"} />
                  <DetailRow label="Updated at" value={viewingOp.updatedAt ? new Date(viewingOp.updatedAt).toLocaleString() : "—"} />
                </div>
              </div>

              {canManage && (
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setViewingOp(null); openEdit(viewingOp); }} className="btn-primary flex-1 py-2.5 text-sm">Edit</button>
                  <button type="button" onClick={() => handleToggleActive(viewingOp)} disabled={saving} className={`flex-1 py-2.5 text-sm font-semibold rounded-full border-2 transition-all ${viewingOp.active ? "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"}`}>
                    {viewingOp.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
