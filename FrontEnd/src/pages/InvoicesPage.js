import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import {
  getInvoices, getInvoice, createInvoiceFromOrder, updateInvoice,
  sendInvoice, cancelInvoice, recordPayment, fetchInvoicePdfBlob, downloadInvoicePdf, getOrders,
  getOrderById, getExpeditionByOrder, updateExpeditionUnitsPerBox
} from "../services/authService";
import OrderDetailsModal from "../components/OrderDetailsModal";
import {
  FileText, Plus, Search, Download, Send, X, CheckCircle,
  AlertTriangle, DollarSign, CreditCard, Trash2, Edit, Eye, Loader, Package
} from "lucide-react";

const CARD = "bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/[0.06] p-5";

const STATUS_STYLES = {
  DRAFT: "text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400",
  SENT: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  PARTIALLY_PAID: "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
  PAID: "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  OVERDUE: "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  CANCELLED: "text-slate-500 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400",
};

function fmtPrice(v, currency = "MAD") {
  if (v == null) return `0.00 ${currency}`;
  return `${Number(v).toFixed(2)} ${currency}`;
}

function splitInvoiceItems(items = []) {
  const materials = items.filter(i => i.itemType === "MATERIAL");
  const production = items.filter(i => i.itemType === "PRODUCTION" || i.itemType === "PRODUCT" || !i.itemType);
  return { materials, production };
}

function InvoiceLineTable({ title, items, currency, accent = "slate", variant = "default" }) {
  if (!items.length) return null;
  const accentHeader = accent === "amber"
    ? "text-amber-700 dark:text-amber-300"
    : "text-blue-700 dark:text-blue-300";
  const isProduction = variant === "production";
  return (
    <div className="space-y-2">
      <h3 className={`text-sm font-semibold ${accentHeader}`}>{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-white/[0.06]">
              <th className="pb-2 font-medium">{isProduction ? "Operation" : "Description"}</th>
              <th className="pb-2 font-medium text-right">Qty</th>
              {isProduction && (
                <>
                  <th className="pb-2 font-medium text-right">Time / Product</th>
                  <th className="pb-2 font-medium text-right">Cost / Min</th>
                </>
              )}
              {!isProduction && <th className="pb-2 font-medium text-right">Unit Price</th>}
              <th className="pb-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-slate-100 dark:border-white/[0.04]">
                <td className="py-2 text-slate-900 dark:text-white">{item.productName || "—"}</td>
                <td className="py-2 text-right">{item.quantity ?? "—"}</td>
                {isProduction && (
                  <>
                    <td className="py-2 text-right">{item.durationPerUnit != null ? `${item.durationPerUnit} min` : "—"}</td>
                    <td className="py-2 text-right">{item.costPerMinute != null ? fmtPrice(item.costPerMinute, currency) : "—"}</td>
                  </>
                )}
                {!isProduction && <td className="py-2 text-right">{fmtPrice(item.unitPrice, currency)}</td>}
                <td className="py-2 text-right font-medium">{fmtPrice(item.totalPrice, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("items");
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedExpeditionOrder, setSelectedExpeditionOrder] = useState(null);
  const [expeditionLoading, setExpeditionLoading] = useState(false);
  const [missingPricingError, setMissingPricingError] = useState(null);
  const { useNavigate } = require("react-router-dom");
  const navigate = useNavigate();

  const load = async (filterStatus) => {
    setLoading(true);
    setError("");
    try {
      const params = filterStatus && filterStatus !== "ALL" ? { status: filterStatus } : {};
      const data = await getInvoices(params);
      setInvoices(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const data = await getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load orders:", e);
    }
  };

  useEffect(() => { 
    load(statusFilter); 
    loadOrders();
  }, []);
  const handleFilter = (s) => {
    setStatusFilter(s);
    load(s);
  };

  const handleSelect = async (inv) => {
    setDetailLoading(true);
    setSelected(null);
    setActiveTab("items");
    try {
      const data = await getInvoice(inv.id);
      setSelected(data);
    } catch (e) {
      setError(e?.message || "Failed to load invoice details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateFromOrder = async () => {
    if (!selectedOrderId) return;
    const mode = window.confirm(
      "Company supplies materials?\n\nOK = Company supplies materials (materials + production)\nCancel = Client supplies materials (production only)"
    )
      ? "FULL_MANUFACTURING"
      : "CLIENT_SUPPLIED_MATERIALS";
    try {
      const newInvoice = await createInvoiceFromOrder(selectedOrderId, mode);
      await load(statusFilter);
      await loadOrders();
      setSelectedOrderId("");
      if (newInvoice && newInvoice.id) {
        handleSelect(newInvoice);
      }
    } catch (e) {
      if (e.message && e.message.startsWith("MISSING_PRICING|")) {
        setMissingPricingError(e.message);
      } else {
        setError(e?.message || "Failed to create invoice.");
      }
    }
  };

  const handleSend = async () => {
    if (!selected) return;
    try {
      const data = await sendInvoice(selected.id);
      setSelected(data);
      await load(statusFilter);
    } catch (e) {
      setError(e?.message || "Failed to send invoice.");
    }
  };

  const handleCancel = async () => {
    if (!selected) return;
    if (!window.confirm("Cancel this invoice?")) return;
    try {
      const data = await cancelInvoice(selected.id);
      setSelected(data);
      await load(statusFilter);
    } catch (e) {
      setError(e?.message || "Failed to cancel invoice.");
    }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    const taxRate = prompt("Tax Rate %:", selected.taxRate || "0");
    if (taxRate === null) return;
    const discount = prompt("Discount %:", selected.discountPercent || "0");
    if (discount === null) return;
    try {
      const data = await updateInvoice(selected.id, {
        taxRate: parseFloat(taxRate) || 0,
        discountPercent: parseFloat(discount) || 0,
      });
      setSelected(data);
      await load(statusFilter);
    } catch (e) {
      setError(e?.message || "Failed to update invoice.");
    }
  };

  const handleOpenExpedition = async () => {
    if (!selected?.orderId) return;
    setExpeditionLoading(true);
    setSelectedExpeditionOrder(null);
    try {
      const order = await getOrderById(selected.orderId);
      const exp = await getExpeditionByOrder(selected.orderId).catch(() => null);
      setSelectedExpeditionOrder({ ...order, expedition: exp });
    } catch (e) {
      setError(e?.message || "Failed to load expedition details.");
    } finally {
      setExpeditionLoading(false);
    }
  };

  const handleUpdateUnitsPerBox = async (newUnitsPerBox) => {
    if (!selectedExpeditionOrder || !newUnitsPerBox || parseInt(newUnitsPerBox) <= 0) return;
    setExpeditionLoading(true);
    setError("");
    try {
      const expId = selectedExpeditionOrder.expedition?.id;
      if (!expId) return;
      const updated = await updateExpeditionUnitsPerBox(expId, parseInt(newUnitsPerBox));
      setSelectedExpeditionOrder({ ...selectedExpeditionOrder, expedition: updated });
    } catch (e) {
      setError(e?.message || "Failed to update units per box.");
    } finally {
      setExpeditionLoading(false);
    }
  };

  const handlePreviewPdf = async (id) => {
    const token = localStorage.getItem("accessToken");
    const apiBase = process.env.REACT_APP_API_URL || "http://localhost:8080";
    const pdfUrl = `${apiBase}/api/billing/invoices/${encodeURIComponent(id)}/pdf?token=${encodeURIComponent(token || "")}`;
    window.open(pdfUrl, "_blank");
  };

  const filtered = invoices.filter((inv) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (inv.invoiceNumber || "").toLowerCase().includes(q) ||
           (inv.clientId || "").toLowerCase().includes(q) ||
           (inv.orderId || "").toLowerCase().includes(q);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-500" /> Invoices
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage client invoices and payments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-transparent text-sm text-slate-900 dark:text-white"
            >
              <option value="">— Select an order —</option>
              {orders.filter(o => !o.invoiceId).map(o => (
                <option key={o.id} value={o.id}>
                  {o.orderReference || o.id} — {o.status}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreateFromOrder}
              disabled={!selectedOrderId}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center gap-2"
            >
              <Plus size={16} /> Create Invoice
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-transparent text-sm text-slate-900 dark:text-white"
            />
          </div>
          {["ALL", "ACTIVE", "DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"].map((s) => (
            <button
              key={s}
              onClick={() => handleFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.1]"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* List */}
          <div className={`${CARD} lg:col-span-1`}>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              {filtered.length} Invoice{filtered.length !== 1 ? "s" : ""}
            </h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-sm text-slate-400">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400">No invoices found</div>
              ) : (
                filtered.map((inv) => {
                  const pct = inv.total > 0 ? Math.min(100, Math.round(((inv.amountPaid || 0) / inv.total) * 100)) : 0;
                  return (
                    <button
                      key={inv.id}
                      onClick={() => handleSelect(inv)}
                      className={`w-full text-left p-3 rounded-xl border transition-colors ${
                        selected?.id === inv.id
                          ? "border-blue-400 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-700"
                          : "border-slate-200 dark:border-white/[0.06] hover:border-blue-300 dark:hover:border-blue-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {inv.invoiceNumber || inv.id?.slice(0, 8)}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_STYLES[inv.status] || ""}`}>
                          {inv.status || "DRAFT"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {fmtDate(inv.issueDate)} &middot; {fmtPrice(inv.total, inv.currency || "MAD")}
                      </div>
                      {inv.status === "PARTIALLY_PAID" && (
                        <div className="mt-2 h-1 bg-slate-200 dark:bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Detail */}
          <div className={`${CARD} lg:col-span-2`}>
            {detailLoading ? (
              <div className="text-center py-16 text-sm text-slate-400">Loading...</div>
            ) : !selected ? (
              <div className="text-center py-16 text-slate-400">
                <FileText size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select an invoice to view details</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selected.invoiceNumber || "Draft Invoice"}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Order: {selected.orderId?.slice(0, 12)}...
                    </p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[selected.status] || ""}`}>
                      {selected.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.status === "DRAFT" && (
                      <>
                        <button onClick={handleSend} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1">
                          <Send size={12} /> Send
                        </button>
                        <button onClick={handleUpdate} className="px-3 py-1.5 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] rounded-lg text-xs font-medium text-slate-600 flex items-center gap-1">
                          <Edit size={12} /> Edit Tax/Discount
                        </button>
                        <button onClick={handleCancel} className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded-lg text-xs font-medium flex items-center gap-1">
                          <Trash2 size={12} /> Cancel
                        </button>
                      </>
                    )}
                    <button onClick={handleOpenExpedition} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium flex items-center gap-1">
                      <Package size={12} /> Expedition
                    </button>
                    <button onClick={() => handlePreviewPdf(selected.id)} className="px-3 py-1.5 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] rounded-lg text-xs font-medium text-slate-600 flex items-center gap-1">
                      <Eye size={12} /> PDF
                    </button>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl text-center border border-blue-100 dark:border-blue-900/30">
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{fmtPrice(selected.totalProductionCost, selected.currency)}</div>
                    <div className="text-xs text-slate-500 mt-1">Production</div>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl text-center border border-amber-100 dark:border-amber-900/30">
                    <div className="text-lg font-bold text-amber-700 dark:text-amber-300">{fmtPrice(selected.totalMaterialCost, selected.currency)}</div>
                    <div className="text-xs text-slate-500 mt-1">Materials</div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-white/[0.04] rounded-xl text-center">
                    <div className="text-lg font-bold text-slate-900 dark:text-white">{fmtPrice(selected.subtotal, selected.currency)}</div>
                    <div className="text-xs text-slate-500 mt-1">Subtotal</div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-white/[0.04] rounded-xl text-center">
                    <div className="text-lg font-bold text-green-600">{fmtPrice(selected.total, selected.currency)}</div>
                    <div className="text-xs text-slate-500 mt-1">Total</div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-white/[0.04] rounded-xl text-center">
                    <div className="text-lg font-bold text-blue-600">{fmtPrice(selected.amountPaid || 0, selected.currency)}</div>
                    <div className="text-xs text-slate-500 mt-1">Paid</div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-white/[0.04] rounded-xl text-center">
                    <div className="text-lg font-bold text-amber-600">{fmtPrice(Math.max(0, (selected.total || 0) - (selected.amountPaid || 0)), selected.currency)}</div>
                    <div className="text-xs text-slate-500 mt-1">Balance</div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-slate-200 dark:border-white/[0.06] pb-2">
                  {["items", "costs", "shipping", "dates"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={`text-sm font-medium pb-2 -mb-[9px] border-b-2 transition-colors ${
                        activeTab === t
                          ? "text-blue-600 border-blue-600"
                          : "text-slate-500 border-transparent hover:text-slate-700"
                      }`}
                    >
                      {t === "items" ? "Line Items" : t === "costs" ? "Cost Breakdown" : t === "shipping" ? "Shipping / Expedition" : "Dates & Notes"}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                {activeTab === "items" && (() => {
                  const { materials, production } = splitInvoiceItems(selected.items);
                  const currency = selected.currency || "MAD";
                  return (
                    <div className="space-y-6">
                      <InvoiceLineTable title="Production Services" items={production} currency={currency} accent="blue" variant="production" />
                      <InvoiceLineTable title="Materials" items={materials} currency={currency} accent="amber" />
                      {materials.length === 0 && production.length === 0 && (
                        <p className="text-center text-slate-400 text-xs py-4">No line items</p>
                      )}
                    </div>
                  );
                })()}

                {activeTab === "costs" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">Production Cost</div>
                        <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                          {fmtPrice(selected.totalProductionCost, selected.currency)}
                        </div>
                      </div>
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800">
                        <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mb-1">Material Cost</div>
                        <div className="text-xl font-bold text-amber-700 dark:text-amber-300">
                          {fmtPrice(selected.totalMaterialCost, selected.currency)}
                        </div>
                      </div>
                      <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800">
                        <div className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">Tax</div>
                        <div className="text-xl font-bold text-green-700 dark:text-green-300">
                          {fmtPrice(selected.taxAmount, selected.currency)}
                        </div>
                      </div>
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-200 dark:border-purple-800">
                        <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-1">Billing Mode</div>
                        <div className="text-sm font-bold text-purple-700 dark:text-purple-300">
                          {selected.manufacturingMode === "CLIENT_SUPPLIED_MATERIALS" ? "Client Materials" : "Company Materials"}
                        </div>
                      </div>
                    </div>
                    {(() => {
                      const { production } = splitInvoiceItems(selected.items);
                      if (!production.length) return null;
                      return (
                        <InvoiceLineTable
                          title="Production Operations"
                          items={production}
                          currency={selected.currency || "MAD"}
                          accent="blue"
                        />
                      );
                    })()}
                  </div>
                )}

                {activeTab === "shipping" && (
                  <div className="space-y-4">
                    {!selected.expeditionStatus ? (
                      <div className="text-center py-8 text-sm text-slate-400">
                        No expedition information available for this invoice yet.
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/[0.06]">
                            <div className="text-xs text-slate-500 font-semibold mb-1">Expedition Status</div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {selected.expeditionStatus}
                            </div>
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/[0.06]">
                            <div className="text-xs text-slate-500 font-semibold mb-1">Shipment Date</div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {fmtDate(selected.shipmentDate)}
                            </div>
                          </div>
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
                            <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">Products Shipped</div>
                            <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                              {selected.shippedQuantity || 0}
                            </div>
                          </div>
                          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800">
                            <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mb-1">Total Boxes</div>
                            <div className="text-xl font-bold text-amber-700 dark:text-amber-300">
                              {selected.totalBoxes || 0}
                            </div>
                          </div>
                        </div>
                        {selected.boxSummaries && selected.boxSummaries.length > 0 && (
                          <div className="mt-4">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Boxes Used Breakdown</h3>
                            <div className="bg-slate-50 dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/[0.06] overflow-hidden">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-white/[0.06]">
                                    <th className="p-3 font-medium">Box Type</th>
                                    <th className="p-3 font-medium text-right">Quantity</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selected.boxSummaries.map((box, i) => (
                                    <tr key={i} className="border-b last:border-0 border-slate-100 dark:border-white/[0.04]">
                                      <td className="p-3 text-slate-900 dark:text-white">{box.boxType}</td>
                                      <td className="p-3 text-right font-medium">{box.quantity}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeTab === "dates" && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/[0.04]">
                      <span className="text-slate-500">Issue Date</span>
                      <span className="font-medium">{fmtDate(selected.issueDate)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/[0.04]">
                      <span className="text-slate-500">Due Date</span>
                      <span className="font-medium">{fmtDate(selected.dueDate)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/[0.04]">
                      <span className="text-slate-500">Paid Date</span>
                      <span className="font-medium">{fmtDate(selected.paidDate)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/[0.04]">
                      <span className="text-slate-500">Sent At</span>
                      <span className="font-medium">{selected.sentAt ? new Date(selected.sentAt).toLocaleString() : "—"}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Notes</span>
                      <span className="font-medium text-right max-w-[200px]">{selected.notes || "—"}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Order Details Modal */}
        <OrderDetailsModal
          selectedOrder={selectedExpeditionOrder}
          setSelectedOrder={setSelectedExpeditionOrder}
          orderLoading={expeditionLoading}
          handleUpdateUnitsPerBox={handleUpdateUnitsPerBox}
          statusColor={(status) => {
            if (status === "PACKING") return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
            if (status === "READY_TO_SHIP") return "text-amber-600 bg-amber-100 dark:bg-amber-900/30";
            if (status === "SHIPPED") return "text-green-600 bg-green-100 dark:bg-green-900/30";
            if (status === "DELIVERED") return "text-purple-600 bg-purple-100 dark:bg-purple-900/30";
            return "text-slate-500 bg-slate-100 dark:bg-slate-800";
          }}
          navigate={navigate}
        />

        {/* Missing Pricing Error Modal */}
        <MissingPricingModal 
          errorString={missingPricingError} 
          onClose={() => setMissingPricingError(null)} 
        />
      </div>
    </DashboardLayout>
  );
}

function MissingPricingModal({ errorString, onClose }) {
  if (!errorString) return null;
  const parts = errorString.split("|");
  let materials = [];
  let operations = [];
  parts.forEach(p => {
    if (p.startsWith("MAT:")) materials = p.substring(4).split(",");
    if (p.startsWith("OP:")) operations = p.substring(3).split(",");
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <X size={20} />
            <h3 className="font-bold">Missing Pricing Data</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Cannot generate the document because some required prices are missing from the Technical Sheet. Please configure them first.
          </p>
          
          {materials.length > 0 && materials[0] !== "" && (
            <div className="mb-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Missing Material Prices</h4>
              <ul className="space-y-1">
                {materials.filter(m => m).map((m, i) => (
                  <li key={i} className="text-sm text-red-600 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded">- {m}</li>
                ))}
              </ul>
            </div>
          )}

          {operations.length > 0 && operations[0] !== "" && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Missing Operation Costs</h4>
              <ul className="space-y-1">
                {operations.filter(o => o).map((o, i) => (
                  <li key={i} className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded">- {o}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
