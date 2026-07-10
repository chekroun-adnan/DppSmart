import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import OrgSelector from "../components/OrgSelector";
import {
  createMaterialStock,
  deleteMaterialStock,
  getMainOrganizations,
  getMyOrganizations,
  getMaterialStocks,
  getSubOrganizations,
  updateMaterialStock,
  adjustMaterialQuantity,
  createProductStock,
  deleteProductStock,
  getProductStocks,
  updateProductStock,
  adjustProductQuantity,
  getAvailableProducts,
  repairMaterialLinks,
} from "../services/authService";
import AuditHistoryModal from "../components/AuditHistoryModal";

const loadOrgs = () => {
  const r = (localStorage.getItem("userRole") || "").toUpperCase();
  return r === "ADMIN"
    ? Promise.all([getMainOrganizations(), getSubOrganizations()]).then(([m, s]) => [...m, ...s])
    : getMyOrganizations();
};

const MATERIAL_UNITS = ["pcs", "kg", "m", "m2", "L", "rolls", "boxes", "units"];
const PRODUCT_UNITS = ["pcs", "units", "boxes", "packs", "sets"];
const INPUT = "h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-800/80 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const SELECT = "h-11 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 pl-4 pr-10 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 cursor-pointer bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzY0NzQ4YiIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_0.75rem_center] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzk0YTNiOCIvPjwvc3ZnPg==')] dark:bg-[right_0.75rem_center]";

function FieldGroup({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function exportToCsv(data, filename) {
  if (!data || data.length === 0) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function formatCurrency(amount, currency = "MAD") {
  if (amount == null || amount === "") return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(Number(amount));
}

const emptyMaterialDraft = { name: "", referenceCode: "", quantity: "", minimumThreshold: "", unit: "pcs", unitPrice: "", costCurrency: "MAD", supplier: "", organizationId: "" };
const emptyProductDraft = { productName: "", productId: "", quantity: "", unit: "pcs", organizationId: "" };

function OrgSelect({ value, onChange, orgs }) {
  const { t } = useTranslation();
  return (
    <select className={SELECT} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t("common.selectOrganization")}</option>
      {orgs.map((org) => (
        <option key={org.id} value={org.id}>{org.name}</option>
      ))}
    </select>
  );
}

export default function StockPage() {
  const { t } = useTranslation();
  const role = (localStorage.getItem("userRole") || "").toUpperCase();
  const [activeTab, setActiveTab] = useState("materials");
  const [materialStocks, setMaterialStocks] = useState([]);
  const [productStocks, setProductStocks] = useState([]);
  const [products, setProducts] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(() => localStorage.getItem("orgId") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [draft, setDraft] = useState(emptyMaterialDraft);
  const [editingItem, setEditingItem] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [historyId, setHistoryId] = useState(null);
  const [quantityAdjust, setQuantityAdjust] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [repairingLinks, setRepairingLinks] = useState(false);
  const [repairLinksResult, setRepairLinksResult] = useState(null);

  const reload = async () => {
    const [matData, prodData, orgData, prodsData] = await Promise.all([
      getMaterialStocks(),
      getProductStocks(),
      loadOrgs(),
      getAvailableProducts(),
    ]);
    setMaterialStocks(matData);
    setProductStocks(prodData);
    setOrgs(orgData);
    setProducts(Array.isArray(prodsData) ? prodsData : []);
  };

  useEffect(() => {
    let mounted = true;
    reload()
      .catch((e) => { if (mounted) setError(e.message || t("errors.serverError", "Failed to load stock.")); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []); // eslint-disable-line

  const orgName = (id) => orgs.find((o) => o.id === id)?.name || id;

  const filteredMaterials = materialStocks.filter((s) => {
    const q = search.toLowerCase();
    const matchesOrg = !selectedOrgId || s.organizationId === selectedOrgId;
    const matchesSearch = !q || s.name?.toLowerCase().includes(q) || s.referenceCode?.toLowerCase().includes(q) || orgName(s.organizationId).toLowerCase().includes(q);
    return matchesOrg && matchesSearch;
  });

  const filteredProducts = productStocks.filter((s) => {
    const q = search.toLowerCase();
    const matchesOrg = !selectedOrgId || s.organizationId === selectedOrgId;
    const matchesSearch = !q || s.productName?.toLowerCase().includes(q) || orgName(s.organizationId).toLowerCase().includes(q);
    return matchesOrg && matchesSearch;
  });

  const lowStockCount = materialStocks.filter((s) => s.quantity != null && s.minimumThreshold != null && s.quantity <= s.minimumThreshold).length;

  const openCreate = () => {
    setDraft(activeTab === "materials" ? { ...emptyMaterialDraft } : { ...emptyProductDraft });
    setActionError("");
    setModal("create");
  };

  const openEdit = (item) => {
    setEditingItem(item);
    if (activeTab === "materials") {
      setDraft({ name: item.name || "", referenceCode: item.referenceCode || "", quantity: item.quantity ?? "", minimumThreshold: item.minimumThreshold ?? "", unit: item.unit || "pcs", unitPrice: item.unitPrice ?? "", costCurrency: item.costCurrency || "MAD", supplier: item.supplier || "", organizationId: item.organizationId || "" });
    } else {
      setDraft({ productName: item.productName || "", productId: item.productId || "", quantity: item.quantity ?? "", unit: item.unit || "pcs", organizationId: item.organizationId || "" });
    }
    setActionError("");
    setModal("edit");
  };

  const openAdjust = (item) => {
    setQuantityAdjust(item);
    setAdjustAmount("");
    setActionError("");
    setModal("adjust");
  };

  const validateMaterialDraft = () => {
    if (!draft.name?.trim()) return t("stock.nameRequired", "Material name is required.");
    if (draft.quantity === "" || draft.quantity === null || draft.quantity === undefined) return t("stock.quantityRequired", "Quantity is required.");
    if (Number(draft.quantity) < 0) return t("stock.quantityNonNegative", "Quantity cannot be negative.");
    if (!draft.unit) return t("stock.unitRequired", "Unit is required.");
    if (!draft.organizationId) return t("common.selectOrganization");
    return null;
  };

  const validateProductDraft = () => {
    if (!editingItem && !draft.productId) return t("stock.selectProductRequired", "Please select a product.");
    if (!draft.productName?.trim()) return t("stock.productNameRequired", "Product name is required.");
    if (draft.quantity === "" || draft.quantity === null || draft.quantity === undefined) return t("stock.quantityRequired", "Quantity is required.");
    if (Number(draft.quantity) < 0) return t("stock.quantityNonNegative", "Quantity cannot be negative.");
    if (!draft.unit) return t("stock.unitRequired", "Unit is required.");
    if (!draft.organizationId) return t("common.selectOrganization");
    return null;
  };

  const handleCreate = async () => {
    const err = activeTab === "materials" ? validateMaterialDraft() : validateProductDraft();
    if (err) { setActionError(err); return; }
    setSaving(true); setActionError("");
    try {
      if (activeTab === "materials") {
        await createMaterialStock({ ...draft, quantity: Number(draft.quantity), minimumThreshold: Number(draft.minimumThreshold) || 0, unitPrice: draft.unitPrice === "" ? undefined : Number(draft.unitPrice) });
      } else {
        await createProductStock({ ...draft, quantity: Number(draft.quantity) });
      }
      await reload();
      setModal(null);
    } catch (e) { setActionError(e.message || t("stock.createFailed", "Failed to create stock item.")); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    const err = activeTab === "materials" ? validateMaterialDraft() : validateProductDraft();
    if (err) { setActionError(err); return; }
    setSaving(true); setActionError("");
    try {
      if (activeTab === "materials") {
        await updateMaterialStock({ id: editingItem.id, ...draft, quantity: Number(draft.quantity), minimumThreshold: Number(draft.minimumThreshold) || 0, unitPrice: draft.unitPrice === "" ? undefined : Number(draft.unitPrice) });
      } else {
        await updateProductStock({ id: editingItem.id, ...draft, quantity: Number(draft.quantity) });
      }
      await reload();
      setModal(null);
    } catch (e) { setActionError(e.message || t("stock.updateFailed", "Failed to update stock item.")); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true); setActionError("");
    try {
      if (activeTab === "materials") {
        await deleteMaterialStock(pendingDelete.id);
      } else {
        await deleteProductStock(pendingDelete.id);
      }
      await reload();
      setModal(null); setPendingDelete(null);
    } catch (e) { setActionError(e.message || t("stock.deleteFailed", "Failed to delete stock item.")); }
    finally { setSaving(false); }
  };

  const handleAdjust = async () => {
    const amount = Number(adjustAmount);
    if (adjustAmount === "" || isNaN(amount) || amount === 0) {
      setActionError(t("stock.adjustAmountRequired", "Enter a valid amount."));
      return;
    }
    setSaving(true); setActionError("");
    try {
      if (activeTab === "materials") {
        await adjustMaterialQuantity(quantityAdjust.id, amount);
      } else {
        await adjustProductQuantity(quantityAdjust.id, amount);
      }
      await reload();
      setModal(null); setQuantityAdjust(null);
    } catch (e) { setActionError(e.message || t("stock.adjustFailed", "Failed to adjust quantity.")); }
    finally { setSaving(false); }
  };

  const tabs = [
    { key: "materials", label: t("stock.materialStockTab", "Material Stock") },
    { key: "products", label: t("stock.productStockTab", "Product Stock") },
  ];

  const MaterialFormContent = (
    <>
      <FieldGroup label={t("stock.materialName")}>
        <input className={INPUT} placeholder={t("stock.materialPlaceholder", "Cotton fabric")} value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
      </FieldGroup>
      <FieldGroup label={t("stock.referenceCode", "Reference Code")}>
        <input className={INPUT} placeholder={t("stock.referenceCodePlaceholder", "e.g. COT-001")} value={draft.referenceCode} onChange={(e) => setDraft((p) => ({ ...p, referenceCode: e.target.value }))} />
      </FieldGroup>
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label={t("orders.quantity")}>
          <input type="number" min={0} className={INPUT} value={draft.quantity} onChange={(e) => setDraft((p) => ({ ...p, quantity: e.target.value }))} />
        </FieldGroup>
        <FieldGroup label={t("stock.unit", "Unit")}>
          <select className={SELECT} value={draft.unit} onChange={(e) => setDraft((p) => ({ ...p, unit: e.target.value }))}>
            {MATERIAL_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </FieldGroup>
      </div>
      <FieldGroup label={t("stock.thresholdLabel", "Minimum Threshold (alert below)")}>
        <input type="number" min={0} className={INPUT} value={draft.minimumThreshold} onChange={(e) => setDraft((p) => ({ ...p, minimumThreshold: e.target.value }))} />
      </FieldGroup>
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="Unit Price">
          <input type="number" min={0} step="0.01" className={INPUT} value={draft.unitPrice} onChange={(e) => setDraft((p) => ({ ...p, unitPrice: e.target.value }))} />
        </FieldGroup>
        <FieldGroup label="Currency">
          <select className={SELECT} value={draft.costCurrency} onChange={(e) => setDraft((p) => ({ ...p, costCurrency: e.target.value }))}>
            <option value="MAD">MAD</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </FieldGroup>
      </div>
      <FieldGroup label="Supplier (optional)">
        <input type="text" className={INPUT} value={draft.supplier} onChange={(e) => setDraft((p) => ({ ...p, supplier: e.target.value }))} placeholder="Supplier name" />
      </FieldGroup>
      <FieldGroup label={t("organizations.title")}>
        <OrgSelect value={draft.organizationId} onChange={(id) => setDraft((p) => ({ ...p, organizationId: id }))} orgs={orgs} />
      </FieldGroup>
    </>
  );

  const ProductFormContent = (
    <>
      <FieldGroup label={t("stock.productName", "Product")}>
        {editingItem ? (
          <div className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-slate-900/40 px-4 flex items-center text-sm text-slate-600 dark:text-slate-300 select-none">
            {draft.productName || "—"}
          </div>
        ) : (
          <select
            className={SELECT}
            value={draft.productId}
            onChange={(e) => {
              const p = products.find(p => p.id === e.target.value);
              if (p) setDraft(prev => ({
                ...prev,
                productId: p.id,
                productName: p.productName || p.variantName || "",
                organizationId: p.organizationId || prev.organizationId,
              }));
              else setDraft(prev => ({ ...prev, productId: "", productName: "" }));
            }}
          >
            <option value="">{t("stock.selectProduct", "Select a product…")}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.productName || p.variantName || p.id}{p.sku ? ` — ${p.sku}` : ""}
              </option>
            ))}
          </select>
        )}
      </FieldGroup>
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label={t("orders.quantity")}>
          <input type="number" min={0} className={INPUT} value={draft.quantity} onChange={(e) => setDraft((p) => ({ ...p, quantity: e.target.value }))} />
        </FieldGroup>
        <FieldGroup label={t("stock.unit", "Unit")}>
          <select className={SELECT} value={draft.unit} onChange={(e) => setDraft((p) => ({ ...p, unit: e.target.value }))}>
            {PRODUCT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </FieldGroup>
      </div>
      <FieldGroup label={t("organizations.title")}>
        <OrgSelect value={draft.organizationId} onChange={(id) => setDraft((p) => ({ ...p, organizationId: id }))} orgs={orgs} />
      </FieldGroup>
    </>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">{t("stock.inventory", "Inventory")}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{t("stock.stockManagement", "Stock Management")}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("stock.subtitle", "Manage material and product inventory across all your organizations.")}</p>
          </div>
          <div className="flex items-center gap-3">
            {role === "ADMIN" && activeTab === "materials" && (
              <button
                type="button"
                disabled={repairingLinks}
                onClick={async () => {
                  setRepairingLinks(true);
                  setRepairLinksResult(null);
                  try {
                    const res = await repairMaterialLinks();
                    setRepairLinksResult({ ok: true, relinked: res.relinked, stillBroken: res.stillBroken });
                    await reload();
                  } catch (e) {
                    setRepairLinksResult({ ok: false, message: e.message || "Repair failed." });
                  } finally {
                    setRepairingLinks(false);
                  }
                }}
                className="flex items-center gap-2 h-11 px-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
                title="Re-link BOM material items whose stock ID is stale (after delete/reinsert)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                {repairingLinks ? "Repairing..." : "Repair Links"}
              </button>
            )}
            
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExport(v => !v)}
                className="flex items-center gap-2 h-11 px-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                {t("common.export", "Export")}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showExport && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/[0.08] shadow-xl z-50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExport(false);
                      if (activeTab === "materials") {
                        const rows = filteredMaterials.map(s => ({
                          name: s.name,
                          referenceCode: s.referenceCode,
                          quantity: s.quantity,
                          unit: s.unit,
                          minimumThreshold: s.minimumThreshold,
                          organization: s.organizationId,
                        }));
                        exportToCsv(rows, 'material-stock.csv');
                      } else {
                        const rows = filteredProducts.map(s => ({
                          productName: s.productName,
                          productId: s.productId,
                          quantity: s.quantity,
                          unit: s.unit,
                          organization: s.organizationId,
                        }));
                        exportToCsv(rows, 'product-stock.csv');
                      }
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    {t("common.exportCsv", "Export CSV")}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowExport(false); window.print(); }}
                    className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors border-t border-slate-100 dark:border-white/[0.05]"
                  >
                    {t("common.exportPdf", "Export PDF (print)")}
                  </button>
                </div>
              )}
            </div>

            <button type="button" onClick={openCreate} className="btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {t("stock.addStockItem", "Add Stock Item")}
            </button>
          </div>
        </div>

        {repairLinksResult && (
          <div className={`flex items-start gap-3 rounded-2xl border p-4 ${repairLinksResult.ok ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5" : "border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/5"}`}>
            <svg className={`w-5 h-5 flex-none mt-0.5 ${repairLinksResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {repairLinksResult.ok
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />}
            </svg>
            <div className="flex-1">
              {repairLinksResult.ok ? (
                <>
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Material links repaired</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {repairLinksResult.relinked} BOM item{repairLinksResult.relinked !== 1 ? "s" : ""} relinked.
                    {repairLinksResult.stillBroken > 0 && <span className="text-amber-700 dark:text-amber-400 ml-1">{repairLinksResult.stillBroken} item{repairLinksResult.stillBroken !== 1 ? "s" : ""} still broken — no matching stock found.</span>}
                  </p>
                </>
              ) : (
                <p className="text-sm font-bold text-rose-800 dark:text-rose-300">{repairLinksResult.message}</p>
              )}
            </div>
            <button type="button" onClick={() => setRepairLinksResult(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {activeTab === "materials" && lowStockCount > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 p-4">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-none mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">{lowStockCount} {lowStockCount > 1 ? t("stock.itemsBelow", "items below minimum threshold") : t("stock.itemBelow", "item below minimum threshold")}</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{t("stock.replenishHint", "Replenish highlighted items to avoid production delays.")}</p>
            </div>
          </div>
        )}

        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setActiveTab(tab.key); setSearch(""); }}
              className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === tab.key ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
            >
              {tab.label}
              {tab.key === "materials" && lowStockCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-amber-500 text-white">{lowStockCount}</span>
              )}
            </button>
          ))}
        </div>

        <OrgSelector value={selectedOrgId} onChange={setSelectedOrgId} />

        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/50 pl-9 pr-4 text-sm text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
            placeholder={activeTab === "materials" ? t("stock.searchMaterials", "Search materials...") : t("stock.searchProducts", "Search products...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              <p className="text-sm text-slate-500">{t("stock.loading", "Loading stock...")}</p>
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-rose-600">{error}</div>
          ) : activeTab === "materials" ? (
            filteredMaterials.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm font-semibold text-slate-500">{search ? t("stock.noResults", "No results.") : t("stock.noMaterialStockYet", "No material stock items yet.")}</p>
                {!search && <button type="button" onClick={openCreate} className="btn-primary mt-4 text-sm">{t("stock.addFirst", "Add first item")}</button>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.18em] text-slate-400 border-b border-slate-100 dark:border-white/[0.06]">
                      <th className="px-6 py-4 font-bold">{t("stock.material", "Material")}</th>
                      <th className="px-6 py-4 font-bold">{t("organizations.title")}</th>
                      <th className="px-6 py-4 font-bold">{t("orders.quantity")}</th>
                      <th className="px-6 py-4 font-bold text-right">Unit Price</th>
                      <th className="px-6 py-4 font-bold">Supplier</th>
                      <th className="px-6 py-4 font-bold">Last Updated</th>
                      <th className="px-6 py-4 font-bold">{t("stock.minThreshold", "Min. Threshold")}</th>
                      <th className="px-6 py-4 font-bold">{t("common.status")}</th>
                      <th className="px-6 py-4 font-bold text-right">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                    {filteredMaterials.map((item) => {
                      const isLow = item.quantity != null && item.minimumThreshold != null && item.quantity <= item.minimumThreshold;
                      return (
                        <tr key={item.id} className={`group transition-colors ${isLow ? "bg-amber-50/30 dark:bg-amber-500/5 hover:bg-amber-50/60 dark:hover:bg-amber-500/10" : "hover:bg-slate-50/50 dark:hover:bg-slate-700/30"}`}>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.name}</p>
                            {item.referenceCode && <p className="text-[10px] text-slate-400 mt-0.5">{item.referenceCode}</p>}
                            {role === "ADMIN" && <p className="text-[9px] font-mono text-slate-300 dark:text-slate-600 mt-0.5 select-all" title="Stock document ID">{item.id}</p>}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{orgName(item.organizationId)}</td>
                          <td className="px-6 py-4">
                            <span className={`text-lg font-extrabold ${isLow ? "text-amber-600" : "text-slate-900 dark:text-slate-100"}`}>
                              {item.quantity} <span className="text-xs font-medium text-slate-400">{item.unit}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {item.unitPrice != null ? formatCurrency(item.unitPrice, item.costCurrency || "MAD") : "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{item.supplier || "—"}</td>
                          <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                            {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{item.minimumThreshold} {item.unit}</td>
                          <td className="px-6 py-4">
                            {isLow ? (
                              <span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase status-amber">{t("stock.lowStock", "Low Stock")}</span>
                            ) : (
                              <span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase status-emerald">{t("stock.ok", "OK")}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button type="button" onClick={() => openAdjust(item)} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all bg-white dark:bg-slate-700" title={t("stock.adjustQuantity", "Adjust Quantity")}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 12V4m0 0l4 4m-4-4l-4 4" />
                                </svg>
                              </button>
                              <button type="button" onClick={() => openEdit(item)} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-all bg-white dark:bg-slate-700">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              {role === "ADMIN" && (
                                <button type="button" onClick={() => setHistoryId(item.id)} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-amber-600 hover:border-amber-200 transition-all bg-white dark:bg-slate-700" title="View History">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                              )}
                              <button type="button" onClick={() => { setPendingDelete(item); setActionError(""); setModal("delete"); }} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all bg-white dark:bg-slate-700">
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
            )
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-slate-500">{search ? t("stock.noResults", "No results.") : t("stock.noProductStockYet", "No product stock items yet.")}</p>
              {!search && <button type="button" onClick={openCreate} className="btn-primary mt-4 text-sm">{t("stock.addFirst", "Add first item")}</button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.18em] text-slate-400 border-b border-slate-100 dark:border-white/[0.06]">
                    <th className="px-6 py-4 font-bold">{t("stock.product", "Product")}</th>
                    <th className="px-6 py-4 font-bold">{t("organizations.title")}</th>
                    <th className="px-6 py-4 font-bold">{t("orders.quantity")}</th>
                    <th className="px-6 py-4 font-bold">Production</th>
                    <th className="px-6 py-4 font-bold">{t("common.status")}</th>
                    <th className="px-6 py-4 font-bold text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                  {filteredProducts.map((item) => (
                    <tr key={item.id} className="group transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.productName}</p>
                        {item.productId && <p className="text-[10px] text-slate-400 mt-0.5">ID: {item.productId}</p>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{orgName(item.organizationId)}</td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                          {item.quantity} <span className="text-xs font-medium text-slate-400">{item.unit}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.lastProductionId ? (
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest">From Production</p>
                            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate max-w-[120px]" title={item.lastProductionId}>
                              {item.lastProductionId.slice(0, 8)}…
                            </p>
                            {item.lastProductionAt && (
                              <p className="text-[10px] text-slate-400">
                                {new Date(item.lastProductionAt).toLocaleDateString()}
                              </p>
                            )}
                            {item.totalProduced > 0 && (
                              <p className="text-[10px] text-slate-400">
                                Total produced: <strong className="text-slate-600 dark:text-slate-300">{item.totalProduced} {item.unit}</strong>
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${item.quantity > 0 ? "status-emerald" : "status-red"}`}>
                          {item.quantity > 0 ? t("stock.inStock", "In Stock") : t("stock.outOfStock", "Out of Stock")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={() => openAdjust(item)} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all bg-white dark:bg-slate-700" title={t("stock.adjustQuantity", "Adjust Quantity")}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 12V4m0 0l4 4m-4-4l-4 4" />
                            </svg>
                          </button>
                          <button type="button" onClick={() => openEdit(item)} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-all bg-white dark:bg-slate-700">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          {role === "ADMIN" && (
                            <button type="button" onClick={() => setHistoryId(item.id)} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-amber-600 hover:border-amber-200 transition-all bg-white dark:bg-slate-700" title="View History">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}
                          <button type="button" onClick={() => { setPendingDelete(item); setActionError(""); setModal("delete"); }} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all bg-white dark:bg-slate-700">
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

      {modal && (modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4 py-6 animate-fade-in" onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-slate-900/10 max-h-[90vh] flex flex-col overflow-hidden mobile-full-modal" onClick={(e) => e.stopPropagation()}>
            <div className="px-7 pt-7 pb-4 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {modal === "create"
                  ? (activeTab === "materials" ? t("stock.addMaterial", "Add Material") : t("stock.addProduct", "Add Product"))
                  : (activeTab === "materials" ? t("stock.editMaterial", "Edit Material") : t("stock.editProduct", "Edit Product"))}
              </h2>
            </div>
            <div className="overflow-y-auto flex-1 px-7 py-5 space-y-4">{activeTab === "materials" ? MaterialFormContent : ProductFormContent}</div>
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

      {modal === "adjust" && quantityAdjust && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4 py-6 animate-fade-in" onClick={() => { setModal(null); setQuantityAdjust(null); }}>
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-slate-900/10 max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-7 pt-7 pb-4 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t("stock.adjustQuantity", "Adjust Quantity")}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {activeTab === "materials" ? quantityAdjust.name : quantityAdjust.productName}
                <span className="text-slate-400 ml-2">({t("orders.quantity")}: {quantityAdjust.quantity} {quantityAdjust.unit})</span>
              </p>
            </div>
            <div className="px-7 py-5 space-y-4">
              <FieldGroup label={t("stock.adjustAmount", "Amount (positive to increase, negative to decrease)")}>
                <input type="number" className={INPUT} value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder={t("stock.adjustPlaceholder", "e.g. 50 or -20")} />
              </FieldGroup>
            </div>
            {actionError && <p className="px-7 text-sm text-rose-600">{actionError}</p>}
            <div className="px-7 py-5 border-t border-slate-100 dark:border-white/[0.06] flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => { setModal(null); setQuantityAdjust(null); }} className="btn-secondary py-2 px-5 text-sm">{t("common.cancel")}</button>
              <button type="button" onClick={handleAdjust} disabled={saving} className="btn-primary py-2 px-5 text-sm">
                {saving ? t("common.saving", "Saving...") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "delete" && pendingDelete && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 p-7 shadow-2xl ring-1 ring-slate-900/10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t("stock.deleteStockItem", "Delete Stock Item")}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t("stock.deleteConfirm", `Delete "${activeTab === "materials" ? pendingDelete.name : pendingDelete.productName}"? This cannot be undone.`)}</p>
            {actionError && <p className="mt-3 text-sm text-rose-600">{actionError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => { setModal(null); setPendingDelete(null); }} className="btn-secondary py-2 px-5 text-sm">{t("common.cancel")}</button>
              <button type="button" onClick={handleDelete} disabled={saving} className="py-2 px-5 text-sm font-semibold rounded-full bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 transition-colors">
                {saving ? t("common.deleting", "Deleting...") : t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      <AuditHistoryModal entityType={activeTab === "materials" ? "MaterialStock" : "ProductStock"} entityId={historyId} onClose={() => setHistoryId(null)} />
    </DashboardLayout>
  );
}
