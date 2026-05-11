import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import OrgSelector from "../components/OrgSelector";
import {
  createOrder,
  deleteOrder,
  getAvailableProducts,
  getMainOrganizations,
  getMyOrganizations,
  getOrders,
  getSubOrganizations,
  updateOrder,
} from "../services/authService";
import AuditHistoryModal from "../components/AuditHistoryModal";

const loadOrgs = () => {
  const role = (localStorage.getItem("userRole") || "").toUpperCase();
  return role === "ADMIN"
    ? Promise.all([getMainOrganizations(), getSubOrganizations()]).then(([m, s]) => [...m, ...s])
    : getMyOrganizations();
};

const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"];

const STATUS_STYLE = {
  PENDING: "status-amber",
  CONFIRMED: "status-sky",
  PROCESSING: "status-blue",
  SHIPPED: "status-purple",
  COMPLETED: "status-emerald",
  CANCELLED: "status-red",
};

const emptyDraft = { productId: "", organizationId: "", quantity: 1, status: "PENDING" };

const INPUT = "h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-800/80 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const SELECT = "h-11 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 pl-4 pr-10 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 cursor-pointer bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzY0NzQ4YiIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_0.75rem_center] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzk0YTNiOCIvPjwvc3ZnPg==')] dark:bg-[right_0.75rem_center]";

function Modal({ title, onClose, onSubmit, submitLabel, loading, error, children, t }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-800 p-7 shadow-2xl ring-1 ring-slate-900/10">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-5">{title}</h2>
        <div className="space-y-4">{children}</div>
        {error && <p className="mt-4 text-sm font-medium text-rose-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary py-2 px-5 text-sm">{t("common.cancel")}</button>
          <button type="button" onClick={onSubmit} disabled={loading} className="btn-primary py-2 px-5 text-sm">
            {loading ? t("common.loading", "Loading...") : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const role = (localStorage.getItem("userRole") || "").toUpperCase();
  const canManage = role === "ADMIN" || role === "SUBADMIN";
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [modal, setModal] = useState(null); // "create" | "edit" | "delete"
  const [editingId, setEditingId] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState(() => localStorage.getItem("orgId") || "");
  const [historyId, setHistoryId] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [ordersData, productsData, orgsData] = await Promise.all([
          getOrders(),
          getAvailableProducts(),
          loadOrgs(),
        ]);
        if (mounted) {
          setOrders(ordersData);
          setProducts(productsData);
          setOrgs(orgsData);
        }
      } catch (e) {
        if (mounted) setError(e.message || t("errors.serverError", "Failed to load orders."));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setDraft(emptyDraft);
    setActionError("");
    setModal("create");
  };

  const openEdit = (order) => {
    setEditingId(order.id);
    setDraft({ productId: order.productId || "", organizationId: order.organizationId || "", quantity: order.quantity || 1, status: order.status || "PENDING" });
    setActionError("");
    setModal("edit");
  };

  const validateDraft = () => {
    if (!draft.productId) return t("orders.selectProduct", "Please select a product.");
    if (!draft.organizationId) return t("common.selectOrganization");
    if (!draft.quantity || draft.quantity < 1) return t("orders.quantityMin", "Quantity must be at least 1.");
    if (!draft.status) return t("orders.selectStatus", "Please select a status.");
    return null;
  };

  const handleCreate = async () => {
    const err = validateDraft();
    if (err) { setActionError(err); return; }
    setSaving(true);
    setActionError("");
    try {
      const created = await createOrder(draft);
      const item = created?.data ?? created;
      setOrders((prev) => [item, ...prev]);
      setModal(null);
    } catch (e) {
      setActionError(e.message || t("orders.createFailed", "Failed to create order."));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    const err = validateDraft();
    if (err) { setActionError(err); return; }
    setSaving(true);
    setActionError("");
    try {
      const updated = await updateOrder({ id: editingId, ...draft });
      const item = updated?.data ?? updated;
      setOrders((prev) => prev.map((o) => (o.id === editingId ? { ...o, ...item } : o)));
      setModal(null);
    } catch (e) {
      setActionError(e.message || t("orders.updateFailed", "Failed to update order."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setActionError("");
    try {
      await deleteOrder(pendingDelete.id);
      setOrders((prev) => prev.filter((o) => o.id !== pendingDelete.id));
      setModal(null);
      setPendingDelete(null);
    } catch (e) {
      setActionError(e.message || t("orders.deleteFailed", "Failed to delete order."));
    } finally {
      setSaving(false);
    }
  };

  const productName = (id) => products.find((p) => p.id === id)?.productName || id || "—";
  const orgName = (id) => orgs.find((o) => o.id === id)?.name || id || "—";

  const visibleOrders = selectedOrgId
    ? orders.filter((o) => o.organizationId === selectedOrgId)
    : orders;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">{t("orders.orderManagement", "Order Management")}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{t("orders.title")}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("orders.subtitle", "Track and manage production orders across your organization.")}</p>
          </div>
          {canManage && (
            <button type="button" onClick={openCreate} className="btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t("orders.newOrder", "New Order")}
            </button>
          )}
        </div>

        <OrgSelector value={selectedOrgId} onChange={setSelectedOrgId} />

        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              <p className="text-sm text-slate-500">{t("orders.loadingOrders", "Loading orders...")}</p>
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-rose-600 font-medium">{error}</div>
          ) : visibleOrders.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-slate-500">{selectedOrgId ? t("orders.noOrdersForOrg", "No orders for this organization.") : t("orders.noOrdersYet", "No orders yet.")}</p>
              {!selectedOrgId && canManage && <button type="button" onClick={openCreate} className="btn-primary mt-4 text-sm">{t("orders.createFirst", "Create your first order")}</button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.18em] text-slate-400 border-b border-slate-100 dark:border-white/[0.06]">
                    <th className="px-6 py-4 font-bold">{t("orders.reference", "Reference")}</th>
                    <th className="px-6 py-4 font-bold">{t("common.name")}</th>
                    <th className="px-6 py-4 font-bold">{t("organizations.title")}</th>
                    <th className="px-6 py-4 font-bold">{t("orders.quantity")}</th>
                    <th className="px-6 py-4 font-bold">{t("common.status")}</th>
                    <th className="px-6 py-4 font-bold">{t("common.date")}</th>
                    {canManage && <th className="px-6 py-4 font-bold text-right">{t("common.actions")}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                  {visibleOrders.map((order) => (
                    <tr key={order.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{order.orderReference || "—"}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{order.id}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{productName(order.productId)}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{orgName(order.organizationId)}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">{order.quantity}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLE[order.status] || "status-slate"}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                      </td>
                      {canManage && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => openEdit(order)} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-all bg-white dark:bg-slate-700">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            {role === "ADMIN" && (
                              <button type="button" onClick={() => setHistoryId(order.id)} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-amber-600 hover:border-amber-200 transition-all bg-white dark:bg-slate-700" title="View History">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              </button>
                            )}
                            <button type="button" onClick={() => { setPendingDelete(order); setActionError(""); setModal("delete"); }} className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all bg-white dark:bg-slate-700">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {canManage && modal === "create" && (
        <Modal title={t("orders.newOrder", "New Order")} onClose={() => setModal(null)} onSubmit={handleCreate} loading={saving} error={actionError} submitLabel={t("orders.createOrder")} t={t}>
          <FieldGroup label={t("orders.selectProduct", "Product")}>
            <select className={SELECT} value={draft.productId} onChange={(e) => setDraft((p) => ({ ...p, productId: e.target.value }))}>
              <option value="">— Select product —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.productName}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label={t("organizations.title")}>
            <select className={SELECT} value={draft.organizationId} onChange={(e) => setDraft((p) => ({ ...p, organizationId: e.target.value }))}>
              <option value="">— Select organization —</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label={t("orders.quantity")}>
            <input type="number" className={INPUT} min={1} value={draft.quantity} onChange={(e) => setDraft((p) => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} />
          </FieldGroup>
          <FieldGroup label={t("common.status")}>
            <select className={SELECT} value={draft.status} onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value }))}>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FieldGroup>
        </Modal>
      )}

      {canManage && modal === "edit" && (
        <Modal title={t("orders.editOrder", "Edit Order")} onClose={() => setModal(null)} onSubmit={handleEdit} loading={saving} error={actionError} t={t}>
          <FieldGroup label={t("orders.selectProduct", "Product")}>
            <select className={SELECT} value={draft.productId} onChange={(e) => setDraft((p) => ({ ...p, productId: e.target.value }))}>
              <option value="">— Select product —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.productName}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label={t("organizations.title")}>
            <select className={SELECT} value={draft.organizationId} onChange={(e) => setDraft((p) => ({ ...p, organizationId: e.target.value }))}>
              <option value="">— Select organization —</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label={t("orders.quantity")}>
            <input type="number" className={INPUT} min={1} value={draft.quantity} onChange={(e) => setDraft((p) => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} />
          </FieldGroup>
          <FieldGroup label={t("common.status")}>
            <select className={SELECT} value={draft.status} onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value }))}>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FieldGroup>
        </Modal>
      )}

      {canManage && modal === "delete" && pendingDelete && (
        <Modal title={t("orders.deleteOrder", "Delete Order")} onClose={() => setModal(null)} onSubmit={handleDelete} loading={saving} error={actionError} submitLabel={t("common.delete")} t={t}>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t("orders.deleteConfirm", `Delete order "${pendingDelete.orderReference}"? This cannot be undone.`)}</p>
        </Modal>
      )}

      <AuditHistoryModal entityType="Order" entityId={historyId} onClose={() => setHistoryId(null)} />
    </DashboardLayout>
  );
}
