import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import {
  createSubOrganization,
  createMainOrganization,
  deleteOrganization,
  getMainOrganizations,
  getMyOrganizations,
  getSubOrganizations,
  updateMainOrganization,
  updateSubOrganization,
} from "../services/authService";

const INPUT  = "h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-all focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const SELECT = `${INPUT} cursor-pointer`;

export default function OrganizationsPage() {
  // ── Role (inside component so it's always fresh) ────────────────────────
  const currentRole = (localStorage.getItem("userRole") || "").toUpperCase();
  const isAdmin    = currentRole === "ADMIN";
  const isSubAdmin = currentRole === "SUBADMIN";

  // ── State ────────────────────────────────────────────────────────────────
  const [mainOrgs,  setMainOrgs]  = useState([]);
  const [subOrgs,   setSubOrgs]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [filter,    setFilter]    = useState("ALL");
  const [modal,     setModal]     = useState(null);
  const [draft,     setDraft]     = useState({ name: "", parentOrganizationId: "" });
  const [editingOrg, setEditingOrg] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [actionError, setActionError] = useState("");
  const [saving,    setSaving]    = useState(false);

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      if (isAdmin) {
        const [mainData, subData] = await Promise.all([
          getMainOrganizations(),
          getSubOrganizations(),
        ]);
        setMainOrgs(Array.isArray(mainData) ? mainData : []);
        setSubOrgs(Array.isArray(subData)  ? subData  : []);
      } else {
        // Subadmin: load main orgs (for parent picker) + their own sub orgs
        const [mainData, myData] = await Promise.all([
          getMainOrganizations(),
          getMyOrganizations(),
        ]);
        setMainOrgs(Array.isArray(mainData) ? mainData : []);
        // myOrgs can include both main and sub — filter to sub only for display
        const mySubOrgs = (Array.isArray(myData) ? myData : []).filter(
          (o) => (o.type || "").toUpperCase() !== "MAIN"
        );
        setSubOrgs(mySubOrgs);
      }
    } catch (e) {
      setError(e.message || "Failed to load organizations.");
    } finally {
      setLoading(false);
    }
  }

  // ── CREATE ───────────────────────────────────────────────────────────────
  const handleCreateMain = async () => {
    if (!draft.name.trim()) { setActionError("Name is required."); return; }
    setSaving(true); setActionError("");
    try {
      const res  = await createMainOrganization({ name: draft.name.trim(), type: "MAIN" });
      const item = res?.data ?? res;
      setMainOrgs((p) => [item, ...p]);
      setModal(null);
    } catch (e) { setActionError(e.message || "Failed to create organization."); }
    finally { setSaving(false); }
  };

  const handleCreateSub = async () => {
    if (!draft.name.trim()) { setActionError("Name is required."); return; }
    if (!draft.parentOrganizationId) { setActionError("Please select a parent organization."); return; }
    setSaving(true); setActionError("");
    try {
      const res  = await createSubOrganization({
        name: draft.name.trim(),
        parentOrganizationId: draft.parentOrganizationId,
        type: "SUB",
      });
      const item = res?.data ?? res;
      setSubOrgs((p) => [item, ...p]);
      setModal(null);
    } catch (e) { setActionError(e.message || "Failed to create sub-organization."); }
    finally { setSaving(false); }
  };

  // ── EDIT ─────────────────────────────────────────────────────────────────
  const openEdit = (org) => {
    setEditingOrg(org);
    setDraft({ name: org.name || "", parentOrganizationId: org.parentOrganizationId || "" });
    setActionError("");
    setModal("edit");
  };

  const handleEdit = async () => {
    if (!draft.name.trim()) { setActionError("Name is required."); return; }
    setSaving(true); setActionError("");
    const isMainType = (editingOrg?.type || "").toUpperCase() === "MAIN";
    try {
      const payload = { id: editingOrg.id, name: draft.name.trim() };
      if (!isMainType) payload.parentOrganizationId = draft.parentOrganizationId || undefined;
      const res  = isMainType ? await updateMainOrganization(payload) : await updateSubOrganization(payload);
      const item = res?.data ?? res;
      if (isMainType) {
        setMainOrgs((p) => p.map((o) => o.id === editingOrg.id ? { ...o, ...item } : o));
      } else {
        setSubOrgs((p) => p.map((o) => o.id === editingOrg.id ? { ...o, ...item } : o));
      }
      setModal(null);
    } catch (e) { setActionError(e.message || "Failed to update organization."); }
    finally { setSaving(false); }
  };

  // ── DELETE ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setSaving(true); setActionError("");
    try {
      await deleteOrganization(pendingDelete.id);
      setMainOrgs((p) => p.filter((o) => o.id !== pendingDelete.id));
      setSubOrgs((p)  => p.filter((o) => o.id !== pendingDelete.id));
      setModal(null); setPendingDelete(null);
    } catch (e) { setActionError(e.message || "Failed to delete organization."); }
    finally { setSaving(false); }
  };

  const openModal = (type) => {
    setDraft({ name: "", parentOrganizationId: "" });
    setActionError("");
    setModal(type);
  };

  // ── Derived display lists ────────────────────────────────────────────────
  // Admin sees all main + all sub; subadmin sees all main (read-only) + their subs
  const displayedMain = mainOrgs;
  const displayedSub  = subOrgs;
  const totalCount    = displayedMain.length + displayedSub.length;

  // ── OrgCard (defined outside component so it won't remount on re-render) ─
  const subsCountOf = (orgId) => displayedSub.filter((s) => s.parentOrganizationId === orgId).length;
  const parentNameOf = (parentId) => mainOrgs.find((m) => m.id === parentId)?.name;

  return (
    <DashboardLayout>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Hierarchy</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Organizations</h1>
            <p className="mt-1 text-sm text-slate-500">
              {isAdmin
                ? "Manage your full organizational structure."
                : "Your sub-organizations and the main organizations they belong to."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button type="button" onClick={() => openModal("createMain")} className="btn-secondary py-2 px-5 text-sm">
                + Main Org
              </button>
            )}
            {(isAdmin || isSubAdmin) && (
              <button type="button" onClick={() => openModal("createSub")} className="btn-primary py-2 px-5 text-sm">
                + Sub Org
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
          {[
            { key: "ALL",  label: "All",  count: totalCount },
            { key: "MAIN", label: "Main", count: displayedMain.length },
            { key: "SUB",  label: "Sub",  count: displayedSub.length },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filter === tab.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                filter === tab.key ? "bg-brand-100 text-brand-700" : "bg-slate-200 text-slate-500"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Loading organizations…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
        ) : totalCount === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-slate-500">No organizations found.</p>
          </div>
        ) : (
          <>
            {(filter === "ALL" || filter === "MAIN") && displayedMain.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Main Organizations</h2>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{displayedMain.length}</span>
                  {isSubAdmin && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">View only</span>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {displayedMain.map((org) => (
                    <OrgCard
                      key={org.id}
                      org={org}
                      isMainType={true}
                      subsCount={subsCountOf(org.id)}
                      parentName={null}
                      canEdit={isAdmin}
                      canDelete={isAdmin}
                      onEdit={openEdit}
                      onDelete={(o) => { setPendingDelete(o); setActionError(""); setModal("delete"); }}
                    />
                  ))}
                </div>
              </section>
            )}

            {(filter === "ALL" || filter === "SUB") && displayedSub.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Sub-Organizations</h2>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{displayedSub.length}</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {displayedSub.map((org) => (
                    <OrgCard
                      key={org.id}
                      org={org}
                      isMainType={false}
                      subsCount={0}
                      parentName={parentNameOf(org.parentOrganizationId)}
                      canEdit={isAdmin || isSubAdmin}
                      canDelete={isAdmin || isSubAdmin}
                      onEdit={openEdit}
                      onDelete={(o) => { setPendingDelete(o); setActionError(""); setModal("delete"); }}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* ── CREATE MAIN MODAL ─────────────────────────────────────────────── */}
      {modal === "createMain" && (
        <ModalShell title="Create Main Organization" onClose={() => setModal(null)}>
          <Field label="Organization Name">
            <input className={INPUT} placeholder="e.g. Atelier IKS Production" value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
          </Field>
          {actionError && <p className="text-sm text-rose-600">{actionError}</p>}
          <ModalActions onCancel={() => setModal(null)} onConfirm={handleCreateMain} saving={saving} confirmLabel="Create" />
        </ModalShell>
      )}

      {/* ── CREATE SUB MODAL ──────────────────────────────────────────────── */}
      {modal === "createSub" && (
        <ModalShell title="Create Sub-Organization" onClose={() => setModal(null)}>
          <Field label="Organization Name">
            <input className={INPUT} placeholder="e.g. Design Studio A" value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
          </Field>
          <Field label="Parent Organization (required)">
            <select className={SELECT} value={draft.parentOrganizationId}
              onChange={(e) => setDraft((p) => ({ ...p, parentOrganizationId: e.target.value }))}>
              <option value="">— Select a main organization —</option>
              {mainOrgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {mainOrgs.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No main organizations available. Create one first.</p>
            )}
          </Field>
          {actionError && <p className="text-sm text-rose-600">{actionError}</p>}
          <ModalActions onCancel={() => setModal(null)} onConfirm={handleCreateSub} saving={saving} confirmLabel="Create" />
        </ModalShell>
      )}

      {/* ── EDIT MODAL ────────────────────────────────────────────────────── */}
      {modal === "edit" && editingOrg && (
        <ModalShell
          title="Edit Organization"
          subtitle={(editingOrg.type || "").toUpperCase() === "MAIN" ? "Main organization" : "Sub-organization"}
          onClose={() => setModal(null)}
        >
          <Field label="Name">
            <input className={INPUT} value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
          </Field>
          {(editingOrg.type || "").toUpperCase() !== "MAIN" && mainOrgs.length > 0 && (
            <Field label="Parent Organization">
              <select className={SELECT} value={draft.parentOrganizationId}
                onChange={(e) => setDraft((p) => ({ ...p, parentOrganizationId: e.target.value }))}>
                <option value="">— None —</option>
                {mainOrgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
          )}
          {actionError && <p className="text-sm text-rose-600">{actionError}</p>}
          <ModalActions onCancel={() => setModal(null)} onConfirm={handleEdit} saving={saving} confirmLabel="Save Changes" />
        </ModalShell>
      )}

      {/* ── DELETE MODAL ──────────────────────────────────────────────────── */}
      {modal === "delete" && pendingDelete && (
        <ModalShell title="Delete Organization" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600">
            Delete <span className="font-bold text-slate-900">{pendingDelete.name}</span>? All linked data may be affected. This cannot be undone.
          </p>
          {actionError && <p className="text-sm text-rose-600">{actionError}</p>}
          <ModalActions
            onCancel={() => setModal(null)}
            onConfirm={handleDelete}
            saving={saving}
            confirmLabel="Delete"
            confirmClass="bg-rose-600 hover:bg-rose-700"
          />
        </ModalShell>
      )}
    </DashboardLayout>
  );
}

// ─── Pure presentational sub-components (defined outside to avoid remounting) ──

function OrgCard({ org, isMainType, subsCount, parentName, canEdit, canDelete, onEdit, onDelete }) {
  return (
    <article className="group rounded-2xl bg-white p-5 ring-1 ring-slate-900/8 transition-all hover:-translate-y-0.5 hover:shadow-soft-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-11 w-11 flex-none rounded-xl flex items-center justify-center shadow-sm ${
            isMainType ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
          }`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{org.name}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
              {isMainType
                ? `${subsCount} sub-org${subsCount !== 1 ? "s" : ""}`
                : parentName ? `Under ${parentName}` : "Sub-organization"}
            </p>
          </div>
        </div>

        {(canEdit || canDelete) && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {canEdit && (
              <button type="button" onClick={() => onEdit(org)} title="Edit"
                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {canDelete && (
              <button type="button" onClick={() => onDelete(org)} title="Delete"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
          isMainType ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"
        }`}>
          {isMainType ? "Main" : "Sub"}
        </span>
        <span className="text-[10px] font-mono text-slate-300 truncate max-w-[100px]">{org.id?.slice(-8)}</span>
      </div>
    </article>
  );
}

function ModalShell({ title, subtitle, children }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/40 px-4 animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl ring-1 ring-slate-900/10">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5 mb-4">{subtitle}</p>}
        <div className="mt-5 space-y-4">{children}</div>
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

function ModalActions({ onCancel, onConfirm, saving, confirmLabel, confirmClass = "bg-brand-600 hover:bg-brand-700" }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={onCancel} className="btn-secondary py-2 px-5 text-sm">Cancel</button>
      <button type="button" onClick={onConfirm} disabled={saving}
        className={`py-2 px-5 text-sm font-semibold rounded-full text-white transition-colors disabled:opacity-60 ${confirmClass}`}>
        {saving ? "Saving…" : confirmLabel}
      </button>
    </div>
  );
}
