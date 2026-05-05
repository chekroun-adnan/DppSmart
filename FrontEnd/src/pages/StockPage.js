import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import OrgSelector from "../components/OrgSelector";
import OrgPicker from "../components/OrgPicker";
import {
  createStock,
  deleteStock,
  getMainOrganizations,
  getMyOrganizations,
  getStocks,
  getSubOrganizations,
  updateStock,
} from "../services/authService";

const loadOrgs = () => {
  const r = (localStorage.getItem("userRole") || "").toUpperCase();
  return r === "ADMIN"
    ? Promise.all([getMainOrganizations(), getSubOrganizations()]).then(([m, s]) => [...m, ...s])
    : getMyOrganizations();
};

const UNITS = ["pcs", "kg", "m", "m²", "L", "rolls", "boxes", "units"];
const INPUT = "h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-all focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const SELECT = `${INPUT} cursor-pointer`;

function FieldGroup({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const emptyDraft = { materialName: "", quantity: "", minimumThreshold: "", unit: "pcs", organizationId: "" };

export default function StockPage() {
  const { t } = useTranslation();
  const [stocks, setStocks] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingItem, setEditingItem] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const reload = async () => {
    const [stockData, orgData] = await Promise.all([getStocks(), loadOrgs()]);
    setStocks(stockData);
    setOrgs(orgData);
  };

  useEffect(() => {
    let mounted = true;
    reload()
      .catch((e) => { if (mounted) setError(e.message || t("errors.serverError", "Failed to load stock.")); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []); // eslint-disable-line

  const orgName = (id) => orgs.find((o) => o.id === id)?.name || id;

  const filtered = stocks.filter((s) => {
    const q = search.toLowerCase();
    const matchesOrg = !selectedOrgId || s.organizationId === selectedOrgId;
    const matchesSearch = !q || s.materialName?.toLowerCase().includes(q) || orgName(s.organizationId).toLowerCase().includes(q);
    return matchesOrg && matchesSearch;
  });

  const lowStockCount = stocks.filter((s) => s.quantity != null && s.minimumThreshold != null && s.quantity <= s.minimumThreshold).length;

  const openCreate = () => { setDraft(emptyDraft); setActionError(""); setModal("create"); };
  const openEdit = (item) => {
    setEditingItem(item);
    setDraft({ materialName: item.materialName || "", quantity: item.quantity ?? "", minimumThreshold: item.minimumThreshold ?? "", unit: item.unit || "pcs", organizationId: item.organizationId || "" });
    setActionError("");
    setModal("edit");
  };

  const validateDraft = () => {
    if (!draft.materialName?.trim()) return t("stock.materialNameRequired", "Material name is required.");
    if (draft.quantity === "" || draft.quantity === null || draft.quantity === undefined) return t("stock.quantityRequired", "Quantity is required.");
    if (Number(draft.quantity) < 0) return t("stock.quantityNonNegative", "Quantity cannot be negative.");
    if (!draft.unit) return t("stock.unitRequired", "Unit is required.");
    if (!draft.organizationId) return t("common.selectOrganization");
    return null;
  };

  const handleCreate = async () => {
    const err = validateDraft();
    if (err) { setActionError(err); return; }
    setSaving(true); setActionError("");
    try {
      await createStock({ ...draft, quantity: Number(draft.quantity), minimumThreshold: Number(draft.minimumThreshold) || 0 });
      await reload();
      setModal(null);
    } catch (e) { setActionError(e.message || t("stock.createFailed", "Failed to create stock item.")); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    const err = validateDraft();
    if (err) { setActionError(err); return; }
    setSaving(true); setActionError("");
    try {
      await updateStock({ id: editingItem.id, ...draft, quantity: Number(draft.quantity), minimumThreshold: Number(draft.minimumThreshold) || 0 });
      await reload();
      setModal(null);
    } catch (e) { setActionError(e.message || t("stock.updateFailed", "Failed to update stock item.")); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true); setActionError("");
    try {
      await deleteStock(pendingDelete.id);
      await reload();
      setModal(null); setPendingDelete(null);
    } catch (e) { setActionError(e.message || t("stock.deleteFailed", "Failed to delete stock item.")); }
    finally { setSaving(false); }
  };

  const FormContent = (
    <>
      <FieldGroup label={t("stock.materialName")}>
        <input className={INPUT} placeholder={t("stock.materialPlaceholder", "Cotton fabric")} value={draft.materialName} onChange={(e) => setDraft((p) => ({ ...p, materialName: e.target.value }))} />
      </FieldGroup>
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label={t("orders.quantity")}>
          <input type="number" min={0} className={INPUT} value={draft.quantity} onChange={(e) => setDraft((p) => ({ ...p, quantity: e.target.value }))} />
        </FieldGroup>
        <FieldGroup label={t("stock.unit", "Unit")}>
          <select className={SELECT} value={draft.unit} onChange={(e) => setDraft((p) => ({ ...p, unit: e.target.value }))}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </FieldGroup>
      </div>
      <FieldGroup label={t("stock.thresholdLabel", "Minimum Threshold (alert below)")}>
        <input type="number" min={0} className={INPUT} value={draft.minimumThreshold} onChange={(e) => setDraft((p) => ({ ...p, minimumThreshold: e.target.value }))} />
      </FieldGroup>
      <FieldGroup label={t("organizations.title")}>
        <OrgPicker value={draft.organizationId} onChange={(id) => setDraft((p) => ({ ...p, organizationId: id }))} />
      </FieldGroup>
    </>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">{t("stock.inventory", "Inventory")}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{t("stock.stockManagement", "Stock Management")}</h1>
            <p className="mt-1 text-sm text-slate-500">{t("stock.subtitle", "Monitor material inventory across all your organizations.")}</p>
          </div>
          <button type="button" onClick={openCreate} className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t("stock.addStockItem", "Add Stock Item")}
          </button>
        </div>

        {lowStockCount > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <svg className="w-5 h-5 text-amber-600 flex-none mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div>
              <p className="text-sm font-bold text-amber-800">{lowStockCount} {lowStockCount > 1 ? t("stock.itemsBelow", "items below minimum threshold") : t("stock.itemBelow", "item below minimum threshold")}</p>
              <p className="text-xs text-amber-700 mt-0.5">{t("stock.replenishHint", "Replenish highlighted items to avoid production delays.")}</p>
            </div>
          </div>
        )}

        <OrgSelector value={selectedOrgId} onChange={setSelectedOrgId} />

        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10" placeholder={t("stock.searchPlaceholder", "Search materials...")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="glass-card overflow-hidden border-slate-200">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              <p className="text-sm text-slate-500">{t("stock.loading", "Loading stock...")}</p>
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-rose-600">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-slate-500">{search ? t("stock.noResults", "No results.") : t("stock.noStockYet", "No stock items yet.")}</p>
              {!search && <button type="button" onClick={openCreate} className="btn-primary mt-4 text-sm">{t("stock.addFirst", "Add first item")}</button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.18em] text-slate-400 border-b border-slate-100">
                    <th className="px-6 py-4 font-bold">{t("stock.material", "Material")}</th>
                    <th className="px-6 py-4 font-bold">{t("organizations.title")}</th>
                    <th className="px-6 py-4 font-bold">{t("orders.quantity")}</th>
                    <th className="px-6 py-4 font-bold">{t("stock.minThreshold", "Min. Threshold")}</th>
                    <th className="px-6 py-4 font-bold">{t("common.status")}</th>
                    <th className="px-6 py-4 font-bold text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item) => {
                    const isLow = item.quantity != null && item.minimumThreshold != null && item.quantity <= item.minimumThreshold;
                    return (
                      <tr key={item.id} className={`group transition-colors ${isLow ? "bg-amber-50/30 hover:bg-amber-50/60" : "hover:bg-slate-50/50"}`}>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900">{item.materialName}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{orgName(item.organizationId)}</td>
                        <td className="px-6 py-4">
                          <span className={`text-lg font-extrabold ${isLow ? "text-amber-600" : "text-slate-900"}`}>
                            {item.quantity} <span className="text-xs font-medium text-slate-400">{item.unit}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{item.minimumThreshold} {item.unit}</td>
                        <td className="px-6 py-4">
                          {isLow ? (
                            <span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase bg-amber-100 text-amber-700">{t("stock.lowStock", "Low Stock")}</span>
                          ) : (
                            <span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">{t("stock.ok", "OK")}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => openEdit(item)} className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-all bg-white">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button type="button" onClick={() => { setPendingDelete(item); setActionError(""); setModal("delete"); }} className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all bg-white">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/40 px-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl ring-1 ring-slate-900/10">
            <h2 className="text-xl font-bold text-slate-900 mb-5">{modal === "create" ? t("stock.addStockItem", "Add Stock Item") : t("stock.updateStockItem", "Update Stock Item")}</h2>
            <div className="space-y-4">{FormContent}</div>
            {actionError && <p className="mt-4 text-sm text-rose-600">{actionError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary py-2 px-5 text-sm">{t("common.cancel")}</button>
              <button type="button" onClick={modal === "create" ? handleCreate : handleEdit} disabled={saving} className="btn-primary py-2 px-5 text-sm">
                {saving ? t("common.loading", "Loading...") : modal === "create" ? t("stock.addItem", "Add Item") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "delete" && pendingDelete && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/40 px-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl ring-1 ring-slate-900/10">
            <h2 className="text-xl font-bold text-slate-900">{t("common.delete")} {t("stock.title")}</h2>
            <p className="mt-2 text-sm text-slate-600">{t("stock.deleteConfirm", "Delete")} <span className="font-bold">{pendingDelete.materialName}</span>? {t("products.deleteWarning", "This cannot be undone.")}</p>
            {actionError && <p className="mt-3 text-sm text-rose-600">{actionError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary py-2 px-5 text-sm">{t("common.cancel")}</button>
              <button type="button" onClick={handleDelete} disabled={saving} className="py-2 px-5 text-sm font-semibold rounded-full bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 transition-colors">
                {saving ? t("stock.deleting", "Deleting...") : t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
