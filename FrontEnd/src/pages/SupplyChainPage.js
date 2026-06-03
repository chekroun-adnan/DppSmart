import { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import {
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  getMaterialOrders, createMaterialOrder, updateMaterialOrder, deleteMaterialOrder,
  updateTracking,
  validateReception,
  processReturn,
  getMyOrganizations, getMainOrganizations, getSubOrganizations,
} from "../services/authService";
import { useNotifications } from "../context/NotificationContext";
import AuditHistoryModal from "../components/AuditHistoryModal";
import TrackingMap from "../components/maps/TrackingMap";
import MapPicker from "../components/maps/MapPicker";
import SupplierMap from "../components/maps/SupplierMap";
import PlacesAutocomplete from "../components/maps/PlacesAutocomplete";
import { useDeliveryTracking } from "../hooks/useDeliveryTracking";

const ROLE = () => (localStorage.getItem("userRole") || "").toUpperCase();
const canEdit = () => ["ADMIN", "SUBADMIN"].includes(ROLE());

const STATUS_COLORS = {
  ORDERED: "bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400",
  CONFIRMED_BY_SUPPLIER: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400",
  IN_TRANSIT: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400",
  ARRIVED: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
  PARTIALLY_APPROVED: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
  APPROVED: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  DECLINED: "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400",
  RETURNED: "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

function FieldGroup({ label, children }) {
  return (
    <div className="grid gap-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#64748B]">{label}</label>
      {children}
    </div>
  );
}

const INPUT = "premium-input";
const SELECT = "premium-select";
const TEXTAREA = "premium-input resize-none";

const emptySupplier = { name: "", companyName: "", email: "", phone: "", address: "", city: "", country: "", latitude: "", longitude: "", organizationId: "" };
const emptyOrderItem = { materialId: "", materialName: "", materialReference: "", orderedQuantity: "", unit: "", notes: "" };

export default function SupplyChainPage() {
  const { t } = useTranslation();
  const { addToast } = useNotifications();
  const [activeTab, setActiveTab] = useState("suppliers");
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [modal, setModal] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [auditId, setAuditId] = useState(null);
  const [auditType, setAuditType] = useState("");

  
  const [supplierForm, setSupplierForm] = useState(emptySupplier);
  const [editingSupplier, setEditingSupplier] = useState(null);

  
  const [orderForm, setOrderForm] = useState({ supplierId: "", organizationId: "", expectedDeliveryDate: "", notes: "", items: [{ ...emptyOrderItem }] });
  const [editingOrder, setEditingOrder] = useState(null);

  
  const [receptionOrderId, setReceptionOrderId] = useState(null);
  const [receptionForm, setReceptionForm] = useState({ decision: "", notes: "", rejectionReason: "", itemDecisions: [] });

  
  const [returnOrderId, setReturnOrderId] = useState(null);
  const [returnForm, setReturnForm] = useState({ itemId: "", returnQuantity: "", rejectionReason: "", notes: "" });

  
  const [configuringOrderId, setConfiguringOrderId] = useState(null);
  const [configForm, setConfigForm] = useState({ supplierId: "", expectedDeliveryDate: "" });
  const [configSaving, setConfigSaving] = useState(false);

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [viewSupplierLocation, setViewSupplierLocation] = useState(null);

  const { livePosition, connected } = useDeliveryTracking(selectedOrder?.id);

  const isSupplierModalOpen = modal === "supplier";

  useEffect(() => {
    if (isSupplierModalOpen || pendingDelete || showMapPicker || viewSupplierLocation) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isSupplierModalOpen, pendingDelete, showMapPicker, viewSupplierLocation]);

  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") {
        if (pendingDelete) { setPendingDelete(null); return; }
        if (modal === "supplier") { setModal(null); setActionError(""); return; }
        if (showMapPicker) { setShowMapPicker(false); return; }
        if (viewSupplierLocation) { setViewSupplierLocation(null); return; }
      }
    }
    if (isSupplierModalOpen || pendingDelete || showMapPicker || viewSupplierLocation) {
      window.addEventListener("keydown", handleEsc);
    }
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isSupplierModalOpen, pendingDelete, showMapPicker, viewSupplierLocation, modal]);

  const loadOrgs = () => {
    const r = ROLE();
    return r === "ADMIN"
      ? Promise.all([getMainOrganizations(), getSubOrganizations()]).then(([m, s]) => [...m, ...s])
      : getMyOrganizations();
  };

  const reload = async () => {
    setLoading(true);
    try {
      const [supData, ordData, orgData] = await Promise.all([
        getSuppliers(),
        getMaterialOrders(),
        loadOrgs(),
      ]);
      setSuppliers(supData);
      setOrders(ordData);
      setOrgs(orgData);
    } catch (err) {
      setActionError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  
  const openCreateSupplier = () => {
    setSupplierForm({ ...emptySupplier, organizationId: orgs[0]?.id || "" });
    setEditingSupplier(null);
    setModal("supplier");
  };

  const openEditSupplier = (s) => {
    setSupplierForm({
      id: s.id,
      name: s.name || "",
      companyName: s.companyName || "",
      email: s.email || "",
      phone: s.phone || "",
      address: s.address || "",
      city: s.city || "",
      country: s.country || "",
      latitude: s.latitude || "",
      longitude: s.longitude || "",
      organizationId: s.organizationId || "",
    });
    setEditingSupplier(s);
    setModal("supplier");
  };

  const handleSaveSupplier = async () => {
    setActionError("");
    setSaving(true);
    try {
      const payload = {
        ...supplierForm,
        latitude: supplierForm.latitude ? parseFloat(supplierForm.latitude) : null,
        longitude: supplierForm.longitude ? parseFloat(supplierForm.longitude) : null,
      };
      if (editingSupplier) {
        await updateSupplier(payload);
      } else {
        await createSupplier(payload);
      }
      setModal(null);
      await reload();
    } catch (err) {
      setActionError(err.message || "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSupplier = async (id) => {
    try {
      await deleteSupplier(id);
      setPendingDelete(null);
      await reload();
    } catch (err) {
      setActionError(err.message || "Failed to delete supplier");
    }
  };

  
  const openCreateOrder = () => {
    setOrderForm({ supplierId: "", organizationId: orgs[0]?.id || "", expectedDeliveryDate: "", notes: "", items: [{ ...emptyOrderItem }] });
    setEditingOrder(null);
    setModal("order");
  };

  const handleAddOrderItem = () => {
    setOrderForm(prev => ({ ...prev, items: [...prev.items, { ...emptyOrderItem }] }));
  };

  const handleRemoveOrderItem = (idx) => {
    setOrderForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const updateOrderItem = (idx, field, value) => {
    setOrderForm(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  };

  const handleSaveOrder = async () => {
    setActionError("");
    setSaving(true);
    try {
      const payload = {
        supplierId: orderForm.supplierId,
        organizationId: orderForm.organizationId,
        expectedDeliveryDate: orderForm.expectedDeliveryDate || undefined,
        notes: orderForm.notes,
        items: orderForm.items.map(item => ({
          ...item,
          orderedQuantity: parseInt(item.orderedQuantity) || 0,
        })),
      };
      if (editingOrder) {
        await updateMaterialOrder(editingOrder.id, payload);
      } else {
        await createMaterialOrder(payload);
      }
      setModal(null);
      await reload();
    } catch (err) {
      setActionError(err.message || "Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrder = async (id) => {
    try {
      await deleteMaterialOrder(id);
      setPendingDelete(null);
      await reload();
    } catch (err) {
      setActionError(err.message || "Failed to delete order");
    }
  };

  
  const handleUpdateTracking = async (status) => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      await updateTracking(selectedOrder.id, { materialOrderId: selectedOrder.id, currentStatus: status });
      await reload();
    } catch (err) {
      setActionError(err.message || "Failed to update tracking");
    } finally {
      setSaving(false);
    }
  };

  
  const openReception = (order) => {
    setReceptionOrderId(order.id);
    setReceptionForm({
      decision: "",
      notes: "",
      rejectionReason: "",
      itemDecisions: order.items?.map(item => {
        const ordered = item.orderedQuantity || 0;
        const remaining = item.remainingQuantity != null ? item.remainingQuantity : ordered;
        return {
          itemId: item.id,
          receivedQuantity: remaining,
          approvedQuantity: remaining,
          rejectedQuantity: 0,
          conditionStatus: "good",
          notes: "",
        };
      }) || [],
    });
    setModal("reception");
  };

  const updateItemDecision = (idx, field, value) => {
    setReceptionForm(prev => {
      const itemDecisions = [...prev.itemDecisions];
      const updated = { ...itemDecisions[idx], [field]: value };
      if (field === "receivedQuantity") {
        const received = parseInt(value) || 0;
        updated.approvedQuantity = received;
        updated.rejectedQuantity = 0;
      }
      if (field === "approvedQuantity") {
        const approved = parseInt(value) || 0;
        const received = parseInt(prev.itemDecisions[idx].receivedQuantity) || 0;
        updated.rejectedQuantity = Math.max(0, received - approved);
      }
      if (field === "rejectedQuantity") {
        const rejected = parseInt(value) || 0;
        const received = parseInt(prev.itemDecisions[idx].receivedQuantity) || 0;
        updated.approvedQuantity = Math.max(0, received - rejected);
      }
      itemDecisions[idx] = updated;
      return { ...prev, itemDecisions };
    });
  };

  const handleValidateReception = async () => {
    setActionError("");
    setSaving(true);
    try {
      const result = await validateReception(receptionOrderId, receptionForm);
      setModal(null);
      await reload();

      
      if (result?.stockResults?.length) {
        result.stockResults.forEach(r => {
          if (!r) return;
          const nameByMatch = {
            MATERIAL_ID: null,
            MATERIAL_NAME_UNIT: "matched by name/unit — refCode was different",
            REFERENCE_CODE: null,
            NO_MATCH: null,
          };
          const matchNote = nameByMatch[r.matchedBy];
          const mainMsg = r.action === "CREATED_NEW_STOCK"
            ? `New stock created: ${r.materialName} ${r.receivedQuantity} ${r.newQuantity ? `(qty: ${r.newQuantity})` : ""}`
            : `Stock updated: ${r.materialName} +${r.receivedQuantity}. New quantity: ${r.newQuantity}`;
          addToast({ type: r.action === "CREATED_NEW_STOCK" ? "info" : "success", message: mainMsg });
          if (matchNote) {
            addToast({ type: "warning", message: `${r.materialName}: ${matchNote}` });
          }
        });
      } else {
        addToast({ type: "success", message: "Reception validated successfully." });
      }
    } catch (err) {
      setActionError(err.message || "Failed to validate reception");
    } finally {
      setSaving(false);
    }
  };

  
  const openReturn = (order) => {
    setReturnOrderId(order.id);
    setReturnForm({ itemId: order.items?.[0]?.id || "", returnQuantity: "", rejectionReason: "", notes: "" });
    setModal("return");
  };

  const handleProcessReturn = async () => {
    setActionError("");
    setSaving(true);
    try {
      await processReturn(returnOrderId, returnForm.itemId, parseInt(returnForm.returnQuantity), returnForm.rejectionReason, returnForm.notes);
      setModal(null);
      await reload();
    } catch (err) {
      setActionError(err.message || "Failed to process return");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOrderConfig = async (orderId) => {
    if (!configForm.supplierId) {
      setActionError("Please select a supplier before confirming.");
      return;
    }
    setConfigSaving(true);
    setActionError("");
    try {
      await updateMaterialOrder(orderId, {
        supplierId: configForm.supplierId,
        expectedDeliveryDate: configForm.expectedDeliveryDate || undefined,
        status: "APPROVED",
      });
      setConfiguringOrderId(null);
      await reload();
      addToast({ type: "success", title: "Order Confirmed", message: "Supplier assigned and order approved." });
    } catch (err) {
      setActionError(err.message || "Failed to update order");
    } finally {
      setConfigSaving(false);
    }
  };

  const tabs = [
    { key: "suppliers", label: t("supplyChain.suppliers") },
    { key: "orders", label: t("supplyChain.orders") },
    { key: "tracking", label: t("supplyChain.tracking") },
    { key: "reception", label: t("supplyChain.reception") },
    { key: "returns", label: t("supplyChain.returns") },
  ];

  const pendingOrders = orders.filter(o => !["COMPLETED", "RETURNED"].includes(o.status));
  const returnedOrders = orders.filter(o => o.status === "RETURNED" || (o.items?.some(i => i.conditionStatus === "returned")));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC]">{t("supplyChain.title")}</h1>
            <p className="text-sm text-slate-500 dark:text-[#64748B] mt-1">{t("supplyChain.subtitle", "Manage suppliers, orders, deliveries, and reception validation.")}</p>
          </div>
        </div>

        
        <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-[#111827]/60 p-1 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all ${activeTab === tab.key ? "bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] shadow-sm" : "text-slate-500 dark:text-[#64748B] hover:text-slate-700 dark:hover:text-[#94A3B8]"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {actionError && (
          <div className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/5 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{actionError}</div>
        )}

        
        {activeTab === "suppliers" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-[#64748B]">{t("supplyChain.suppliers")} ({suppliers.length})</p>
              {canEdit() && (
                <button onClick={openCreateSupplier} className="btn-primary text-sm">{t("supplyChain.createSupplier")}</button>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-4 border-slate-200 dark:border-[#334155] border-t-brand-600 rounded-full animate-spin" />
                <p className="text-sm text-slate-500 dark:text-[#64748B]">{t("common.loading")}</p>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="glass-card py-16 text-center">
                <p className="text-sm font-semibold text-slate-500 dark:text-[#64748B]">{t("supplyChain.noSuppliers")}</p>
              </div>
            ) : (
              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-[#64748B] border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)]">
                        <th className="px-6 py-4 font-bold">{t("supplyChain.companyName")}</th>
                        <th className="px-6 py-4 font-bold">{t("supplyChain.supplierName")}</th>
                        <th className="px-6 py-4 font-bold">{t("supplyChain.email")}</th>
                        <th className="px-6 py-4 font-bold">{t("supplyChain.phone")}</th>
                        <th className="px-6 py-4 font-bold">{t("supplyChain.city")}</th>
                        <th className="px-6 py-4 font-bold">{t("supplyChain.country")}</th>
                        <th className="px-6 py-4 font-bold">{t("common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[rgba(255,255,255,0.04)]">
                      {suppliers.map(s => (
                        <tr key={s.id} className="group transition-colors hover:bg-slate-50/50 dark:hover:bg-[#1E293B]/50">
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">{s.companyName || s.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-[#94A3B8]">{s.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-[#94A3B8]">{s.email || "—"}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-[#94A3B8]">{s.phone || "—"}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-[#94A3B8]">{s.city || "—"}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-[#94A3B8]">{s.country || "—"}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1 items-center">
                              {s.latitude && s.longitude && (
                                <button onClick={() => setViewSupplierLocation(s)} className="p-1.5 rounded-lg text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-700 dark:hover:text-brand-300 transition-colors" title={t("supplyChain.location")}>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                  </svg>
                                </button>
                              )}
                              {canEdit() && (
                                <>
                                  <button onClick={() => openEditSupplier(s)} className="p-1.5 rounded-lg text-slate-400 dark:text-[#64748B] hover:bg-slate-100 dark:hover:bg-[#1E293B] hover:text-brand-600 dark:hover:text-brand-400 transition-colors" title={t("common.edit")}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button onClick={() => setPendingDelete(s)} className="p-1.5 rounded-lg text-slate-400 dark:text-[#64748B] hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-colors" title={t("common.delete")}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              )}
                              <button onClick={() => { setAuditId(s.id); setAuditType("Supplier"); }} className="p-1.5 rounded-lg text-slate-400 dark:text-[#64748B] hover:bg-slate-100 dark:hover:bg-[#1E293B] hover:text-slate-600 dark:hover:text-[#94A3B8] transition-colors" title={t("common.audit")}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        
        {activeTab === "orders" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-[#64748B]">{t("supplyChain.orders")} ({orders.length})</p>
              {canEdit() && (
                <button onClick={openCreateOrder} className="btn-primary text-sm">{t("supplyChain.createOrder")}</button>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-4 border-slate-200 dark:border-[#334155] border-t-brand-600 rounded-full animate-spin" />
                <p className="text-sm text-slate-500 dark:text-[#64748B]">{t("common.loading")}</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="glass-card py-16 text-center">
                <p className="text-sm font-semibold text-slate-500 dark:text-[#64748B]">{t("supplyChain.noOrders")}</p>
              </div>
            ) : (
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {orders.map(order => {
                  const isAutoPO = !!order.sourceClientOrderId;
                  const needsConfig = isAutoPO && order.status === "PENDING";
                  const isConfiguring = configuringOrderId === order.id;
                  return (
                  <div key={order.id} className={`glass-card p-5 space-y-3 ${needsConfig ? "ring-2 ring-amber-400/50 dark:ring-amber-500/30" : ""}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{order.orderNumber}</p>
                          {isAutoPO && (
                            <span className="rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">Auto-Generated</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-[#64748B] mt-0.5">{order.supplierName || (needsConfig ? "No supplier assigned" : "—")}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${STATUS_COLORS[order.status] || "bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400"}`}>
                        {t(`supplyChain.${order.status.toLowerCase()}`, order.status)}
                      </span>
                    </div>

                    
                    {needsConfig && isConfiguring && (
                      <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 p-3 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">Assign Supplier & Confirm</p>
                        <select
                          value={configForm.supplierId}
                          onChange={e => setConfigForm(prev => ({ ...prev, supplierId: e.target.value }))}
                          className="premium-select w-full text-sm"
                        >
                          <option value="">— Select supplier —</option>
                          {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.companyName || s.name}</option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={configForm.expectedDeliveryDate}
                          onChange={e => setConfigForm(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                          className="premium-input w-full text-sm"
                          placeholder="Expected delivery date"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveOrderConfig(order.id)}
                            disabled={configSaving || !configForm.supplierId}
                            className="flex-1 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
                          >
                            {configSaving ? "Saving…" : "Confirm Order"}
                          </button>
                          <button
                            onClick={() => setConfiguringOrderId(null)}
                            className="rounded-lg bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-[#94A3B8] text-xs font-semibold px-3 py-1.5 hover:bg-slate-200 dark:hover:bg-[#334155] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-slate-50 dark:bg-[#111827]/40 p-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-[#64748B]">{t("supplyChain.totalOrdered")}</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{order.totalOrderedQuantity || 0}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/5 p-2">
                        <p className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">{t("supplyChain.totalApproved")}</p>
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{order.totalAcceptedQuantity || 0}</p>
                      </div>
                      <div className="rounded-lg bg-rose-50 dark:bg-rose-500/5 p-2">
                        <p className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">{t("supplyChain.totalRejected")}</p>
                        <p className="text-sm font-bold text-rose-700 dark:text-rose-400">{order.totalRejectedQuantity || 0}</p>
                      </div>
                    </div>

                    {order.expectedDeliveryDate && (
                      <p className="text-xs text-slate-500 dark:text-[#64748B]">{t("supplyChain.expectedDelivery")}: {new Date(order.expectedDeliveryDate).toLocaleDateString()}</p>
                    )}

                    
                    {isAutoPO && order.items?.length > 0 && (
                      <div className="rounded-lg bg-slate-50 dark:bg-[#111827]/40 p-2 space-y-1">
                        {order.items.map(item => (
                          <div key={item.id} className="flex justify-between text-xs">
                            <span className="text-slate-700 dark:text-[#94A3B8] truncate mr-2">{item.materialName}</span>
                            <span className="shrink-0 font-semibold text-slate-900 dark:text-[#F8FAFC]">{item.orderedQuantity} {item.unit || ""}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 flex-wrap">
                      {needsConfig && !isConfiguring && canEdit() && (
                        <button
                          onClick={() => { setConfiguringOrderId(order.id); setConfigForm({ supplierId: "", expectedDeliveryDate: "" }); }}
                          className="flex-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
                        >
                          Assign Supplier
                        </button>
                      )}
                      <button onClick={() => { setSelectedOrder(order); setActiveTab("tracking"); }} className="flex-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">{t("supplyChain.tracking")}</button>
                      {(order.status === "SHIPPED" || order.status === "APPROVED") && (
                        <button onClick={() => openReception(order)} className="flex-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">{t("supplyChain.validateReception")}</button>
                      )}
                      {(order.status === "APPROVED" || order.status === "PARTIALLY_APPROVED") && canEdit() && (
                        <button onClick={() => openReturn(order)} className="flex-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300">{t("supplyChain.processReturn")}</button>
                      )}
                      {canEdit() && (
                        <button onClick={() => setPendingDelete({ ...order, type: "order" })} className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300">{t("common.delete")}</button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        
        {activeTab === "tracking" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-[#64748B]">{t("supplyChain.tracking")}</p>
            </div>

            {!selectedOrder ? (
              <div className="glass-card p-6 space-y-3">
                <p className="text-sm font-semibold text-slate-500 dark:text-[#64748B]">{t("supplyChain.orderDetails")}</p>
                <div className="space-y-2">
                  {pendingOrders.map(order => (
                    <button key={order.id} onClick={() => setSelectedOrder(order)}
                      className="w-full flex justify-between items-center rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.06)] bg-slate-50 dark:bg-[#111827]/40 px-4 py-3 text-left hover:bg-white dark:hover:bg-[#1E293B] hover:border-brand-300 dark:hover:border-brand-500/30 transition-all">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">{order.orderNumber}</p>
                        <p className="text-xs text-slate-500 dark:text-[#64748B]">{order.supplierName || "—"}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${STATUS_COLORS[order.status] || "bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400"}`}>
                        {t(`supplyChain.${order.status.toLowerCase()}`, order.status)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2 items-center">
                  <button onClick={() => setSelectedOrder(null)} className="text-sm font-semibold text-slate-500 dark:text-[#64748B] hover:text-slate-700 dark:hover:text-[#94A3B8]">← Back</button>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{selectedOrder.orderNumber}</h3>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${STATUS_COLORS[selectedOrder.status] || "bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400"}`}>
                    {t(`supplyChain.${selectedOrder.status.toLowerCase()}`, selectedOrder.status)}
                  </span>
                </div>

                
                <div className="glass-card overflow-hidden p-4">
                  <TrackingMap
                    order={selectedOrder}
                    supplier={suppliers.find(s => s.id === selectedOrder.supplierId)}
                    livePosition={livePosition}
                    connected={connected}
                  />
                </div>

                
                {canEdit() && (
                  <div className="glass-card p-5 space-y-3">
                    <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{t("supplyChain.updateLocation")}</p>
                    <div className="flex flex-wrap gap-2">
                      {["PENDING", "APPROVED", "SHIPPED", "PARTIALLY_RECEIVED", "RECEIVED", "DISPUTED", "COMPLETED"].map(status => (
                        <button key={status} onClick={() => handleUpdateTracking(status)} disabled={saving}
                          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all disabled:opacity-50 ${selectedOrder.status === status ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-[#111827]/40 text-slate-700 dark:text-[#94A3B8] hover:bg-slate-200 dark:hover:bg-[#1E293B]"}`}>
                          {t(`supplyChain.${status.toLowerCase()}`, status)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                
                <div className="glass-card overflow-hidden">
                  <table className="min-w-full text-left">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-[#64748B] border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)]">
                        <th className="px-6 py-4 font-bold">{t("supplyChain.materialName")}</th>
                        <th className="px-6 py-4 font-bold">{t("supplyChain.orderedQuantity")}</th>
                        <th className="px-6 py-4 font-bold">{t("supplyChain.unit")}</th>
                        <th className="px-6 py-4 font-bold">{t("supplyChain.condition")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[rgba(255,255,255,0.04)]">
                      {selectedOrder.items?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-[#1E293B]/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">{item.materialName}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-[#94A3B8]">{item.orderedQuantity}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-[#94A3B8]">{item.unit}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-[#94A3B8]">{item.conditionStatus || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        
        {activeTab === "reception" && (
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-[#64748B]">{t("supplyChain.reception")}</p>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-4 border-slate-200 dark:border-[#334155] border-t-brand-600 rounded-full animate-spin" />
                <p className="text-sm text-slate-500 dark:text-[#64748B]">{t("common.loading")}</p>
              </div>
            ) : pendingOrders.length === 0 ? (
              <div className="glass-card py-16 text-center">
                <p className="text-sm font-semibold text-slate-500 dark:text-[#64748B]">{t("supplyChain.noOrders")}</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingOrders.map(order => (
                  <div key={order.id} className="glass-card p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{order.orderNumber}</p>
                        <p className="text-xs text-slate-500 dark:text-[#64748B] mt-0.5">{order.supplierName || "—"}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${STATUS_COLORS[order.status] || "bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400"}`}>
                        {t(`supplyChain.${order.status.toLowerCase()}`, order.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#64748B]">{order.items?.length || 0} {t("supplyChain.items")}</p>
                    {order.status === "SHIPPED" || order.status === "PARTIALLY_RECEIVED" || order.status === "PENDING" || order.status === "APPROVED" ? (
                      <button onClick={() => openReception(order)} className="w-full btn-primary text-sm">{t("supplyChain.validateReception")}</button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        
        {activeTab === "returns" && (
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-[#64748B]">{t("supplyChain.returns")}</p>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-4 border-slate-200 dark:border-[#334155] border-t-brand-600 rounded-full animate-spin" />
                <p className="text-sm text-slate-500 dark:text-[#64748B]">{t("common.loading")}</p>
              </div>
            ) : returnedOrders.length === 0 ? (
              <div className="glass-card py-16 text-center">
                <p className="text-sm font-semibold text-slate-500 dark:text-[#64748B]">{t("supplyChain.returnedMaterials", "No returned materials")}</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {returnedOrders.map(order => (
                  <div key={order.id} className="glass-card p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{order.orderNumber}</p>
                        <p className="text-xs text-slate-500 dark:text-[#64748B] mt-0.5">{order.supplierName || "—"}</p>
                      </div>
                      <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400">{t("supplyChain.returned")}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/5 p-2">
                        <p className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">{t("supplyChain.totalApproved")}</p>
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{order.totalApprovedQuantity || 0}</p>
                      </div>
                      <div className="rounded-lg bg-rose-50 dark:bg-rose-500/5 p-2">
                        <p className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">{t("supplyChain.totalRejected")}</p>
                        <p className="text-sm font-bold text-rose-700 dark:text-rose-400">{order.totalRejectedQuantity || 0}</p>
                      </div>
                    </div>
                    {canEdit() && order.status !== "RETURNED" && (
                      <button onClick={() => openReturn(order)} className="w-full text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300">{t("supplyChain.processReturn")}</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-[#64748B] mb-3">{t("supplyChain.orders")} ({orders.length})</p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {orders.filter(o => o.items?.some(i => i.conditionStatus === "returned")).map(order => (
                  <div key={order.id} className="glass-card p-5 space-y-3">
                    <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{order.orderNumber}</p>
                    <p className="text-xs text-slate-500 dark:text-[#64748B]">{order.supplierName || "—"}</p>
                    <div className="space-y-2">
                      {order.items?.filter(i => i.conditionStatus === "returned").map(item => (
                        <div key={item.id} className="rounded-lg bg-rose-50 dark:bg-rose-500/5 p-3">
                          <p className="text-sm font-semibold text-rose-900 dark:text-rose-300">{item.materialName}</p>
                          <p className="text-xs text-rose-600 dark:text-rose-400">{t("supplyChain.rejectedQuantity")}: {item.rejectedQuantity || 0} {item.unit}</p>
                          {item.notes && <p className="text-xs text-rose-500 dark:text-rose-400 mt-1">{item.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      
      {modal === "supplier" && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => { setModal(null); setActionError(""); }}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-6 md:p-8">
              <div className="flex items-start justify-between mb-5">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{editingSupplier ? t("supplyChain.editSupplier") : t("supplyChain.createSupplier")}</h2>
                <button
                  type="button"
                  onClick={() => { setModal(null); setActionError(""); }}
                  className="ml-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <FieldGroup label={t("supplyChain.companyName")}>
                  <input className={INPUT} value={supplierForm.companyName} onChange={e => setSupplierForm(p => ({ ...p, companyName: e.target.value }))} />
                </FieldGroup>
                <FieldGroup label={t("supplyChain.supplierName")}>
                  <input className={INPUT} value={supplierForm.name} onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))} />
                </FieldGroup>
                <div className="grid grid-cols-2 gap-3">
                  <FieldGroup label={t("supplyChain.email")}>
                    <input className={INPUT} type="email" value={supplierForm.email} onChange={e => setSupplierForm(p => ({ ...p, email: e.target.value }))} />
                  </FieldGroup>
                  <FieldGroup label={t("supplyChain.phone")}>
                    <input className={INPUT} value={supplierForm.phone} onChange={e => setSupplierForm(p => ({ ...p, phone: e.target.value }))} />
                  </FieldGroup>
                </div>
                <FieldGroup label={t("supplyChain.address")}>
                  <PlacesAutocomplete
                    value={supplierForm.address}
                    onChange={(val) => setSupplierForm(p => ({ ...p, address: val }))}
                    onPlaceSelected={({ address, lat, lng, city, country }) =>
                      setSupplierForm(p => ({
                        ...p,
                        address,
                        latitude: lat.toFixed(6),
                        longitude: lng.toFixed(6),
                        city: city || p.city,
                        country: country || p.country,
                      }))
                    }
                    placeholder="Search address (auto-fills lat/lng)..."
                  />
                </FieldGroup>
                <div className="grid grid-cols-2 gap-3">
                  <FieldGroup label={t("supplyChain.city")}>
                    <input className={INPUT} value={supplierForm.city} onChange={e => setSupplierForm(p => ({ ...p, city: e.target.value }))} />
                  </FieldGroup>
                  <FieldGroup label={t("supplyChain.country")}>
                    <input className={INPUT} value={supplierForm.country} onChange={e => setSupplierForm(p => ({ ...p, country: e.target.value }))} />
                  </FieldGroup>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FieldGroup label={t("supplyChain.latitude")}>
                    <input className={INPUT} type="number" step="any" value={supplierForm.latitude} onChange={e => setSupplierForm(p => ({ ...p, latitude: e.target.value }))} />
                  </FieldGroup>
                  <FieldGroup label={t("supplyChain.longitude")}>
                    <input className={INPUT} type="number" step="any" value={supplierForm.longitude} onChange={e => setSupplierForm(p => ({ ...p, longitude: e.target.value }))} />
                  </FieldGroup>
                </div>
                <div>
                  <button type="button" onClick={() => setShowMapPicker(true)} className="flex items-center gap-2 text-xs font-semibold text-brand-600 hover:text-brand-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    {t("supplyChain.location", "Pick on Map")}
                  </button>
                </div>
                <FieldGroup label={t("common.organization")}>
                  <select className={SELECT} value={supplierForm.organizationId} onChange={e => setSupplierForm(p => ({ ...p, organizationId: e.target.value }))}>
                    <option value="">— Select —</option>
                    {orgs.map(org => <option key={org.id} value={org.id}>{org.name || org.id}</option>)}
                  </select>
                </FieldGroup>
              </div>
              {actionError && <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">{actionError}</p>}
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setModal(null)} className="btn-secondary py-2 px-5 text-sm">{t("common.cancel")}</button>
                <button onClick={handleSaveSupplier} disabled={saving} className="btn-primary py-2 px-5 text-sm">{saving ? t("common.saving") : t("common.save")}</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      
      {showMapPicker && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9998] grid place-items-center bg-slate-900/40 px-4 py-6 animate-fade-in" onClick={() => setShowMapPicker(false)}>
          <div className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-[#1E293B] shadow-2xl dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] ring-1 ring-slate-900/10 dark:ring-[rgba(255,255,255,0.08)] overflow-hidden flex flex-col" style={{ height: "80vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-7 pt-7 pb-4 border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)] shrink-0 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC]">{t("supplyChain.location", "Pick Location")}</h2>
                <p className="text-xs text-slate-500 dark:text-[#64748B] mt-1">Click on the map or drag the marker to set the supplier's location.</p>
              </div>
              <button onClick={() => setShowMapPicker(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-[#94A3B8]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <MapPicker
                lat={supplierForm.latitude ? parseFloat(supplierForm.latitude) : 48.85}
                lng={supplierForm.longitude ? parseFloat(supplierForm.longitude) : 2.35}
                onLocationChange={({ lat, lng }) =>
                  setSupplierForm(p => ({ ...p, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }))
                }
              />
            </div>
            <div className="px-7 py-4 border-t border-slate-100 dark:border-[rgba(255,255,255,0.06)] shrink-0 flex justify-end">
              <button onClick={() => setShowMapPicker(false)} className="btn-primary py-2 px-5 text-sm">{t("common.done", "Done")}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      
      {modal === "order" && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/40 px-4 py-6 animate-fade-in" onClick={() => setModal(null)}>
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#1E293B] shadow-2xl dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] ring-1 ring-slate-900/10 dark:ring-[rgba(255,255,255,0.08)] max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-7 pt-7 pb-4 border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)] shrink-0">
              <h2 className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC]">{editingOrder ? t("common.edit") : t("supplyChain.createOrder")}</h2>
            </div>
            <div className="overflow-y-auto flex-1 px-7 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label={t("supplyChain.suppliers")}>
                  <select className={SELECT} value={orderForm.supplierId} onChange={e => setOrderForm(p => ({ ...p, supplierId: e.target.value }))}>
                    <option value="">— Select supplier —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.companyName || s.name}</option>)}
                  </select>
                </FieldGroup>
                <FieldGroup label={t("common.organization")}>
                  <select className={SELECT} value={orderForm.organizationId} onChange={e => setOrderForm(p => ({ ...p, organizationId: e.target.value }))}>
                    <option value="">— Select —</option>
                    {orgs.map(org => <option key={org.id} value={org.id}>{org.name || org.id}</option>)}
                  </select>
                </FieldGroup>
              </div>
              <FieldGroup label={t("supplyChain.expectedDelivery")}>
                <input className={INPUT} type="date" value={orderForm.expectedDeliveryDate} onChange={e => setOrderForm(p => ({ ...p, expectedDeliveryDate: e.target.value }))} />
              </FieldGroup>
              <FieldGroup label={t("supplyChain.notes")}>
                <textarea className={TEXTAREA} rows={2} value={orderForm.notes} onChange={e => setOrderForm(p => ({ ...p, notes: e.target.value }))} />
              </FieldGroup>

              
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{t("supplyChain.items")} ({orderForm.items.length})</p>
                  <button onClick={handleAddOrderItem} className="text-xs font-semibold text-brand-600 hover:text-brand-700">+ {t("supplyChain.addItem")}</button>
                </div>
                <div className="space-y-3">
                  {orderForm.items.map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.06)] bg-slate-50 dark:bg-[#111827]/40 p-4 space-y-3">
                      <div className="flex justify-between">
                        <p className="text-xs font-bold text-slate-500 dark:text-[#64748B]">Item {idx + 1}</p>
                        {orderForm.items.length > 1 && (
                          <button onClick={() => handleRemoveOrderItem(idx)} className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300">{t("supplyChain.removeItem")}</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FieldGroup label={t("supplyChain.materialName")}>
                          <input className={INPUT} value={item.materialName} onChange={e => updateOrderItem(idx, "materialName", e.target.value)} />
                        </FieldGroup>
                        <FieldGroup label={t("supplyChain.materialReference")}>
                          <input className={INPUT} value={item.materialReference} onChange={e => updateOrderItem(idx, "materialReference", e.target.value)} />
                        </FieldGroup>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FieldGroup label={t("supplyChain.orderedQuantity")}>
                          <input className={INPUT} type="number" value={item.orderedQuantity} onChange={e => updateOrderItem(idx, "orderedQuantity", e.target.value)} />
                        </FieldGroup>
                        <FieldGroup label={t("supplyChain.unit")}>
                          <input className={INPUT} value={item.unit} onChange={e => updateOrderItem(idx, "unit", e.target.value)} />
                        </FieldGroup>
                      </div>
                      <FieldGroup label={t("supplyChain.notes")}>
                        <input className={INPUT} value={item.notes} onChange={e => updateOrderItem(idx, "notes", e.target.value)} />
                      </FieldGroup>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {actionError && <p className="px-7 text-sm text-rose-600 dark:text-rose-400">{actionError}</p>}
            <div className="px-7 py-5 border-t border-slate-100 dark:border-[rgba(255,255,255,0.06)] flex justify-end gap-3 shrink-0">
              <button onClick={() => setModal(null)} className="btn-secondary py-2 px-5 text-sm">{t("common.cancel")}</button>
              <button onClick={handleSaveOrder} disabled={saving} className="btn-primary py-2 px-5 text-sm">{saving ? t("common.saving") : t("common.save")}</button>
            </div>
          </div>
        </div>
      )}

      
      {modal === "reception" && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/40 px-4 py-6 animate-fade-in" onClick={() => setModal(null)}>
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#1E293B] shadow-2xl dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] ring-1 ring-slate-900/10 dark:ring-[rgba(255,255,255,0.08)] max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-7 pt-7 pb-4 border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)] shrink-0">
              <h2 className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC]">{t("supplyChain.validateReception")}</h2>
            </div>
            <div className="overflow-y-auto flex-1 px-7 py-5 space-y-4">
              <FieldGroup label={t("supplyChain.decision")}>
                <select className={SELECT} value={receptionForm.decision} onChange={e => setReceptionForm(p => ({ ...p, decision: e.target.value }))}>
                  <option value="">— Select decision —</option>
                  <option value="APPROVED">{t("supplyChain.approved")}</option>
                  <option value="PARTIALLY_APPROVED">{t("supplyChain.partiallyApproved")}</option>
                  <option value="DECLINED">{t("supplyChain.declined")}</option>
                </select>
              </FieldGroup>

              {receptionForm.itemDecisions.map((item, idx) => {
                const origItem = orders.find(o => o.id === receptionOrderId)?.items?.[idx];
                const ordered = origItem?.orderedQuantity || 0;
                const remaining = origItem?.remainingQuantity != null ? origItem.remainingQuantity : ordered;
                const received = item.receivedQuantity || 0;
                const approved = item.approvedQuantity || 0;
                const rejected = item.rejectedQuantity || 0;
                const diff = received - ordered;
                return (
                  <div key={idx} className="rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.06)] bg-slate-50 dark:bg-[#111827]/40 p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{origItem?.materialName || `Item ${idx + 1}`}</p>
                      {diff !== 0 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diff > 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"}`}>
                          {diff > 0 ? `+${diff} extra` : `${diff} missing`}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-slate-100 dark:bg-[#1E293B] p-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400">{t("supplyChain.orderedQuantity")}</p>
                        <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">{ordered}</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 p-2">
                        <p className="text-[10px] font-bold uppercase text-blue-500">{t("supplyChain.receivedQuantity")} *</p>
                        <input className="w-full text-center text-sm font-extrabold bg-transparent border-none outline-none text-blue-700 dark:text-blue-300" type="number" min="0"
                          value={received} onChange={e => updateItemDecision(idx, "receivedQuantity", parseInt(e.target.value) || 0)} />
                      </div>
                      <div className="rounded-lg bg-slate-100 dark:bg-[#1E293B] p-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400">{t("supplyChain.remaining")}</p>
                        <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">{remaining}</p>
                      </div>
                    </div>
                    {diff !== 0 && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-lg px-3 py-2">
                        {diff > 0
                          ? `You received ${diff} more than ordered. Accept only ${ordered} and return ${diff}, or accept all ${received}.`
                          : `You received ${Math.abs(diff)} less than ordered. Accept what you got (${received}), or create a dispute.`}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <FieldGroup label={t("supplyChain.accept")}>
                        <input className={INPUT} type="number" min="0" value={approved} onChange={e => updateItemDecision(idx, "approvedQuantity", parseInt(e.target.value) || 0)} />
                      </FieldGroup>
                      <FieldGroup label={t("supplyChain.reject")}>
                        <input className={INPUT} type="number" min="0" value={rejected} onChange={e => updateItemDecision(idx, "rejectedQuantity", parseInt(e.target.value) || 0)} />
                      </FieldGroup>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-slate-400 dark:text-[#64748B]">
                        Accepted + Rejected = <span className={approved + rejected !== received && received > 0 ? "text-rose-500 font-bold" : "text-slate-600 dark:text-slate-300"}>{approved + rejected}</span> / Received: {received}
                      </p>
                      {approved + rejected !== received && received > 0 && (
                        <span className="text-[10px] text-amber-500 font-bold">⚠ Mismatch</span>
                      )}
                    </div>
                    <FieldGroup label={t("supplyChain.conditionStatus")}>
                      <select className={SELECT} value={item.conditionStatus} onChange={e => updateItemDecision(idx, "conditionStatus", e.target.value)}>
                        <option value="good">Good</option>
                        <option value="damaged">Damaged</option>
                        <option value="defective">Defective</option>
                      </select>
                    </FieldGroup>
                    <FieldGroup label={t("supplyChain.notes")}>
                      <input className={INPUT} value={item.notes} onChange={e => updateItemDecision(idx, "notes", e.target.value)} />
                    </FieldGroup>
                  </div>
                );
              })}

              {receptionForm.decision === "DECLINED" && (
                <FieldGroup label={t("supplyChain.rejectionReason")}>
                  <textarea className={TEXTAREA} rows={3} value={receptionForm.rejectionReason} onChange={e => setReceptionForm(p => ({ ...p, rejectionReason: e.target.value }))} />
                </FieldGroup>
              )}

              <FieldGroup label={t("supplyChain.notes")}>
                <textarea className={TEXTAREA} rows={2} value={receptionForm.notes} onChange={e => setReceptionForm(p => ({ ...p, notes: e.target.value }))} />
              </FieldGroup>
            </div>
            {actionError && <p className="px-7 text-sm text-rose-600 dark:text-rose-400">{actionError}</p>}
            <div className="px-7 py-5 border-t border-slate-100 dark:border-[rgba(255,255,255,0.06)] flex justify-end gap-3 shrink-0">
              <button onClick={() => setModal(null)} className="btn-secondary py-2 px-5 text-sm">{t("common.cancel")}</button>
              <button onClick={handleValidateReception} disabled={saving || !receptionForm.decision} className="btn-primary py-2 px-5 text-sm">{saving ? t("common.saving") : t("common.save")}</button>
            </div>
          </div>
        </div>
      )}

      
      {modal === "return" && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/40 px-4 py-6 animate-fade-in" onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1E293B] shadow-2xl dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] ring-1 ring-slate-900/10 dark:ring-[rgba(255,255,255,0.08)] max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-7 pt-7 pb-4 border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)] shrink-0">
              <h2 className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC]">{t("supplyChain.processReturn")}</h2>
            </div>
            <div className="overflow-y-auto flex-1 px-7 py-5 space-y-4">
              <FieldGroup label={t("supplyChain.items")}>
                <select className={SELECT} value={returnForm.itemId} onChange={e => setReturnForm(p => ({ ...p, itemId: e.target.value }))}>
                  <option value="">— Select item —</option>
                  {orders.find(o => o.id === returnOrderId)?.items?.map(item => (
                    <option key={item.id} value={item.id}>{item.materialName} (Approved: {item.approvedQuantity || 0})</option>
                  ))}
                </select>
              </FieldGroup>
              <FieldGroup label={t("supplyChain.returnQuantity")}>
                <input className={INPUT} type="number" value={returnForm.returnQuantity} onChange={e => setReturnForm(p => ({ ...p, returnQuantity: e.target.value }))} />
              </FieldGroup>
              <FieldGroup label={t("supplyChain.rejectionReason")}>
                <textarea className={TEXTAREA} rows={3} value={returnForm.rejectionReason} onChange={e => setReturnForm(p => ({ ...p, rejectionReason: e.target.value }))} />
              </FieldGroup>
              <FieldGroup label={t("supplyChain.notes")}>
                <textarea className={TEXTAREA} rows={2} value={returnForm.notes} onChange={e => setReturnForm(p => ({ ...p, notes: e.target.value }))} />
              </FieldGroup>
            </div>
            {actionError && <p className="px-7 text-sm text-rose-600 dark:text-rose-400">{actionError}</p>}
            <div className="px-7 py-5 border-t border-slate-100 dark:border-[rgba(255,255,255,0.06)] flex justify-end gap-3 shrink-0">
              <button onClick={() => setModal(null)} className="btn-secondary py-2 px-5 text-sm">{t("common.cancel")}</button>
              <button onClick={handleProcessReturn} disabled={saving || !returnForm.itemId || !returnForm.returnQuantity} className="btn-primary py-2 px-5 text-sm">{saving ? t("common.saving") : t("common.save")}</button>
            </div>
          </div>
        </div>
      )}

      
      {viewSupplierLocation && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9998] grid place-items-center bg-slate-900/40 px-4 py-6 animate-fade-in" onClick={() => setViewSupplierLocation(null)}>
          <div className="relative w-full max-w-5xl rounded-3xl bg-white dark:bg-[#1E293B] shadow-2xl dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] ring-1 ring-slate-900/10 dark:ring-[rgba(255,255,255,0.08)] overflow-hidden flex flex-col max-h-[90vh] z-[9999]" onClick={(e) => e.stopPropagation()}>
            <div className="px-7 pt-7 pb-4 border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)] shrink-0 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">{viewSupplierLocation.companyName || viewSupplierLocation.name}</h2>
                <p className="text-xs text-slate-500 dark:text-[#64748B] mt-0.5">{viewSupplierLocation.city}{viewSupplierLocation.city && viewSupplierLocation.country ? ", " : ""}{viewSupplierLocation.country}</p>
              </div>
              <button onClick={() => setViewSupplierLocation(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-[#94A3B8]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 h-[32rem]">
              <SupplierMap supplier={viewSupplierLocation} />
            </div>
          </div>
        </div>,
        document.body
      )}

      
      {pendingDelete && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="relative w-full max-w-md max-h-[90vh] overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-6 md:p-8">
              <div className="flex items-start justify-between mb-5">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t("common.confirmDelete")}</h2>
                <button
                  type="button"
                  onClick={() => setPendingDelete(null)}
                  className="ml-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {pendingDelete.type === "order"
                  ? `Delete order "${pendingDelete.orderNumber}"?`
                  : `Delete supplier "${pendingDelete.companyName || pendingDelete.name}"?`}
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setPendingDelete(null)} className="btn-secondary py-2 px-5 text-sm">{t("common.cancel")}</button>
                <button onClick={() => pendingDelete.type === "order" ? handleDeleteOrder(pendingDelete.id) : handleDeleteSupplier(pendingDelete.id)} className="btn-primary py-2 px-5 text-sm bg-rose-600 hover:bg-rose-700">{t("common.delete")}</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      
      {auditId && (
        <AuditHistoryModal entityType={auditType} entityId={auditId} onClose={() => { setAuditId(null); setAuditType(""); }} />
      )}
    </DashboardLayout>
  );
}
