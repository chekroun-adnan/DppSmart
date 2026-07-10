import { useEffect, useState } from "react";
import {
  ShoppingCart, Plus, X, ChevronRight, ChevronLeft,
  Calendar, Clock, CheckCircle2, XCircle,
  AlertTriangle, Trash2, RefreshCw, Package, Truck, Factory,
  DollarSign, FileText,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import {
  getMyOrders, getAvailableProducts, createOrder,
  clientAcceptOrder, clientRejectOrder, cancelOrder,
  getProductionByOrderId,
} from "../services/authService";


const STATUS_META = {
  DRAFT: { label: "Draft", cls: "status-slate", Icon: FileText, desc: "Your order is being created." },
  PENDING_REVIEW: { label: "Under Review", cls: "status-amber", Icon: Clock, desc: "Your order has been received and is being reviewed." },
  PENDING_QUOTATION: { label: "Pending Quotation", cls: "status-amber", Icon: Clock, desc: "A quote is being prepared for your order." },
  QUOTE_SENT: { label: "Quote Sent", cls: "status-sky", Icon: FileText, desc: "Your quote has been sent. Please review and accept." },
  AWAITING_DEPOSIT: { label: "Awaiting Deposit", cls: "status-amber", Icon: DollarSign, desc: "Please pay the deposit to confirm your order." },
  DEPOSIT_UNDER_REVIEW: { label: "Deposit Under Review", cls: "status-sky", Icon: Clock, desc: "Your deposit proof is being reviewed by our team." },
  CONFIRMED: { label: "Confirmed", cls: "status-emerald", Icon: CheckCircle2, desc: "Deposit approved! Your order is confirmed and scheduled for production." },
  PLANNED: { label: "Planned", cls: "status-blue", Icon: Clock, desc: "Order is queued in the production plan." },
  IN_PRODUCTION: { label: "In Production", cls: "status-blue", Icon: Factory, desc: "Your order is currently being manufactured." },
  PRODUCTION_COMPLETED: { label: "Production Completed", cls: "status-emerald", Icon: CheckCircle2, desc: "All manufacturing operations are complete." },
  READY_FOR_DELIVERY: { label: "Ready for Delivery", cls: "status-emerald", Icon: Package, desc: "Your order is ready. Awaiting final payment." },
  FINAL_PAYMENT_PENDING: { label: "Final Payment Pending", cls: "status-amber", Icon: DollarSign, desc: "Please pay the remaining balance for delivery." },
  DELIVERED: { label: "Delivered", cls: "status-slate", Icon: Truck, desc: "Your order has been delivered. Thank you!" },
  CLOSED: { label: "Closed", cls: "status-slate", Icon: CheckCircle2, desc: "Order fully paid and completed." },
  REJECTED: { label: "Rejected", cls: "status-red", Icon: XCircle, desc: "Your order was rejected. Please contact us for details." },
  CANCELLED: { label: "Cancelled", cls: "status-slate", Icon: XCircle, desc: "This order has been cancelled." },
};

const ITEM_STATUS_META = {
  AVAILABLE: { label: "In Stock", cls: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10" },
  PARTIAL: { label: "Partial Stock", cls: "text-amber-700  dark:text-amber-400  bg-amber-50  dark:bg-amber-500/10" },
  OUT_OF_STOCK: { label: "Will Produce", cls: "text-sky-700    dark:text-sky-400    bg-sky-50    dark:bg-sky-500/10" },
  TO_PRODUCE: { label: "Will Produce", cls: "text-sky-700    dark:text-sky-400    bg-sky-50    dark:bg-sky-500/10" },
};

const INPUT = "h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-800/80 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const SELECT = "h-11 w-full appearance-none rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 pl-4 pr-10 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-800/80 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 cursor-pointer";

function FieldGroup({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, cls: "status-slate", Icon: Clock };
  const { label, cls, Icon } = meta;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      <Icon size={11} /> {label}
    </span>
  );
}

function Modal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4 animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-slate-900/10 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-slate-100 dark:border-white/[0.06]">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-7 py-5 space-y-5 flex-1">{children}</div>
        {footer && <div className="px-7 py-5 border-t border-slate-100 dark:border-white/[0.06]">{footer}</div>}
      </div>
    </div>
  );
}



function CreateOrderModal({ products, onClose, onCreated }) {
  const [items, setItems] = useState([{ productId: "", quantity: 1 }]);
  const [deliveryDate, setDate] = useState("");
  const [materialSource, setMaterialSource] = useState("COMPANY_SUPPLIED");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(null);

  const productMap = Object.fromEntries((products || []).map(p => [p.id, p]));

  const addItem = () => setItems(p => [...p, { productId: "", quantity: 1 }]);
  const removeItem = idx => setItems(p => p.filter((_, i) => i !== idx));
  const setItem = (idx, field, val) =>
    setItems(p => p.map((it, i) => i === idx ? { ...it, [field]: val } : it));

  const getItemPrice = (productId) => {
    const p = productMap[productId];
    return p?.estimatedUnitPrice ?? null;
  };

  const getItemCurrency = (productId) => {
    const p = productMap[productId];
    return p?.estimatedCurrency || "MAD";
  };

  const totalEstimate = items.reduce((sum, it) => {
    const price = getItemPrice(it.productId);
    return sum + (price ? price * Number(it.quantity) : 0);
  }, 0);

  const handleSubmit = async () => {
    setError("");
    if (!deliveryDate) { setError("Please select a delivery date."); return; }
    if (items.some(it => !it.productId)) { setError("Please select a product for each item."); return; }
    if (items.some(it => Number(it.quantity) < 1)) { setError("Quantity must be at least 1."); return; }

    setLoading(true);
    try {
      const result = await createOrder({
        requestedDeliveryDate: deliveryDate,
        materialSource: materialSource,
        items: items.map(it => ({ productId: it.productId, quantity: Number(it.quantity) })),
      });
      const order = result?.data ?? result;
      setSubmitted(order);
      onCreated(order);
    } catch (e) {
      setError(e.message || "Failed to submit order.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const order = submitted;
    const lineItems = (order.items || items).map((it, i) => {
      const p = productMap[it.productId || it.productId];
      const price = getItemPrice(it.productId) || 0;
      const qty = Number(it.quantity);
      return { name: p?.productName || p?.name || it.productName || "Product", qty, price, total: price * qty };
    });
    const grandTotal = lineItems.reduce((s, i) => s + i.total, 0);
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Order ${order.orderReference || "Confirmation"}</title>
    <style>
      body { font-family: 'Helvetica', 'Arial', sans-serif; margin: 0; padding: 40px; color: #1e293b; }
      .header { border-bottom: 2px solid #0d9488; padding-bottom: 20px; margin-bottom: 24px; }
      .header h1 { margin: 0; font-size: 22px; color: #0d9488; }
      .header p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th { text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 1px solid #e2e8f0; }
      td { padding: 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
      td:last-child, th:last-child { text-align: right; }
      .total-row td { font-weight: bold; font-size: 15px; border-bottom: none; padding-top: 16px; }
      .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
      @media print { body { padding: 20px; } }
    </style></head><body>
      <div class="header">
        <h1>Order Confirmation</h1>
        <p>Reference: ${order.orderReference || "—"} | Date: ${new Date().toLocaleDateString("fr-FR")}</p>
        <p>Delivery: ${order.requestedDeliveryDate ? new Date(order.requestedDeliveryDate).toLocaleDateString("fr-FR") : "—"}</p>
      </div>
      <table>
        <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
        <tbody>
          ${lineItems.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${i.price.toFixed(2)} MAD</td><td>${i.total.toFixed(2)} MAD</td></tr>`).join("")}
          <tr class="total-row"><td colspan="3">Estimated Total</td><td>${grandTotal.toFixed(2)} MAD</td></tr>
        </tbody>
      </table>
      <div class="footer">Thank you for your order!</div>
      <script>window.print();window.close();<\\/script>
    </body></html>`);
    printWindow.document.close();
  };

  const today = new Date().toISOString().split("T")[0];

  if (submitted) {
    return (
      <Modal
        title="Order Placed Successfully"
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={handlePrint} className="btn-primary py-2 px-5 text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Invoice
            </button>
            {submitted._id && (
              <button onClick={() => { onClose(); /* will navigate to orders list */ }}
                className="py-2 px-5 text-sm font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors flex items-center gap-2">
                View My Orders
              </button>
            )}
            <button onClick={onClose} className="btn-secondary py-2 px-5 text-sm">Close</button>
          </div>
        }
      >
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 p-4 flex items-start gap-3 mb-4">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Your order has been submitted!</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Reference: <span className="font-mono font-bold">{submitted.orderReference}</span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200/60 dark:border-brand-500/20 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-500 mb-3">Billing Summary</p>
          <div className="space-y-2">
            {items.map((it, i) => {
              const p = productMap[it.productId];
              const price = getItemPrice(it.productId) || 0;
              const qty = Number(it.quantity);
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{p?.productName || p?.name || "Product"}</p>
                    <p className="text-[11px] text-slate-400">{qty} × {price.toFixed(2)} MAD</p>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{(price * qty).toFixed(2)} MAD</span>
                </div>
              );
            })}
            <div className="border-t border-brand-200/60 dark:border-brand-500/20 pt-2 mt-2 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Estimated Total</span>
              <span className="text-lg font-bold text-brand-600 dark:text-brand-400">{totalEstimate.toFixed(2)} MAD</span>
            </div>
          </div>
        </div>

        {submitted.invoiceId ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3 flex items-center gap-1">
            <CheckCircle2 size={12} /> Invoice created — you can pay now to confirm your order.
          </p>
        ) : (
          <p className="text-xs text-slate-400 mt-3">
            The final invoice will be available once your order is confirmed.
          </p>
        )}
      </Modal>
    );
  }

  return (
    <Modal
      title="Place New Order"
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3">
          {totalEstimate > 0 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Estimated Total</span>
              <span className="text-lg font-bold text-brand-600 dark:text-brand-400">{totalEstimate.toFixed(2)} MAD</span>
            </div>
          )}
          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary py-2 px-5 text-sm">Cancel</button>
            <button onClick={handleSubmit} disabled={loading} className="btn-primary py-2 px-5 text-sm">
              {loading ? "Submitting…" : "Submit Order"}
            </button>
          </div>
        </div>
      }
    >
      <FieldGroup label="Requested Delivery Date">
        <input type="date" min={today} value={deliveryDate}
          onChange={e => setDate(e.target.value)} className={INPUT} />
      </FieldGroup>

      <FieldGroup label="Material Supply">
        <select value={materialSource} onChange={e => setMaterialSource(e.target.value)} className={SELECT}>
          <option value="COMPANY_SUPPLIED">Company Supplied (Materials + Production)</option>
          <option value="CLIENT_SUPPLIED">Client Supplied (Production Only)</option>
        </select>
      </FieldGroup>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Order Items</label>
          <button onClick={addItem}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
            <Plus size={14} /> Add Product
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item, idx) => {
            const unitPrice = getItemPrice(item.productId);
            const currency = getItemCurrency(item.productId);
            const lineTotal = unitPrice ? unitPrice * Number(item.quantity) : 0;
            return (
              <div key={idx} className="flex gap-3 items-end p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/[0.06]">
                <div className="flex-1">
                  <FieldGroup label="Product">
                    <select value={item.productId} onChange={e => setItem(idx, "productId", e.target.value)} className={SELECT}>
                      <option value="">Select product…</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.productName || p.name}
                          {p.estimatedUnitPrice ? ` (${p.estimatedUnitPrice.toFixed(2)} ${p.estimatedCurrency || "MAD"}/u)` : ""}
                        </option>
                      ))}
                    </select>
                  </FieldGroup>
                  {item.productId && unitPrice !== null && (
                    <p className="mt-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                      Unit price: {unitPrice.toFixed(2)} {currency}
                    </p>
                  )}
                  {item.productId && unitPrice === null && (
                    <p className="mt-1 text-[11px] text-slate-400">Price not available</p>
                  )}
                </div>
                <div className="w-28">
                  <FieldGroup label="Quantity">
                    <input type="number" min={1} value={item.quantity}
                      onChange={e => setItem(idx, "quantity", e.target.value)} className={INPUT} />
                  </FieldGroup>
                </div>
                {item.productId && unitPrice !== null && (
                  <div className="w-24 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Subtotal</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{lineTotal.toFixed(2)}</p>
                  </div>
                )}
                {items.length > 1 && (
                  <button onClick={() => removeItem(idx)}
                    className="mb-0.5 p-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}



function ReorderModal({ order, products, onClose, onCreated }) {
  const [deliveryDate, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const today = new Date().toISOString().split("T")[0];

  const handleReorder = async () => {
    if (!deliveryDate) { setError("Please select a delivery date."); return; }
    setLoading(true); setError("");
    try {
      const result = await createOrder({
        requestedDeliveryDate: deliveryDate,
        items: (order.items || []).map(it => ({ productId: it.productId, quantity: it.quantity })),
      });
      onCreated(result?.data ?? result);
    } catch (e) {
      setError(e.message || "Failed to place reorder.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/60 dark:bg-black/75 backdrop-blur-[2px] px-4 animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 p-7 shadow-2xl ring-1 ring-slate-900/10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <RefreshCw size={18} className="text-brand-500" /> Reorder
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="rounded-2xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 p-4 mb-5">
          <p className="text-xs font-bold text-brand-700 dark:text-brand-300 mb-2">Reorder same items:</p>
          <div className="space-y-1">
            {(order.items || []).map((it, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5"><Package size={10} className="text-brand-500" /> {it.productName}</span>
                <span className="font-semibold">×{it.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        <FieldGroup label="New Requested Delivery Date">
          <input type="date" min={today} value={deliveryDate}
            onChange={e => setDate(e.target.value)} className={INPUT} />
        </FieldGroup>

        {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary py-2 px-5 text-sm">Cancel</button>
          <button onClick={handleReorder} disabled={loading} className="btn-primary py-2 px-5 text-sm">
            {loading ? "Placing…" : "Place Reorder"}
          </button>
        </div>
      </div>
    </div>
  );
}



function OrderDetailModal({ order, products, onClose, onRefresh, onReordered }) {
  const [view, setView] = useState("detail");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [productions, setProductions] = useState([]);
  const [loadingProds, setLoadingProds] = useState(false);
  const [showReorder, setShowReorder] = useState(false);

  const canRespond = order.status === "DATE_CHANGE_REQUESTED";
  const canCancel = ["PENDING_REVIEW", "READY_FOR_CONFIRMATION", "DATE_CHANGE_REQUESTED",
    "BLOCKED_INSUFFICIENT_STOCK", "BLOCKED_INSUFFICIENT_MATERIALS", "BLOCKED_NO_BOM"]
    .includes(order.status);
  const isDelivered = order.status === "DELIVERED";


  useEffect(() => {
    if (!["IN_PRODUCTION", "READY", "DELIVERED"].includes(order.status)) return;
    setLoadingProds(true);
    getProductionByOrderId(order.id)
      .then(setProductions)
      .catch(() => { })
      .finally(() => setLoadingProds(false));
  }, [order.id, order.status]); // eslint-disable-line

  const handleAccept = async () => {
    setLoading(true); setError("");
    try {
      await clientAcceptOrder({ orderId: order.id, clientResponseMessage: msg });
      onRefresh(); onClose();
    } catch (e) { setError(e.message || "Failed."); }
    finally { setLoading(false); }
  };

  const handleReject = async () => {
    setLoading(true); setError("");
    try {
      await clientRejectOrder({ orderId: order.id, clientResponseMessage: msg });
      onRefresh(); onClose();
    } catch (e) { setError(e.message || "Failed."); }
    finally { setLoading(false); }
  };

  const handleCancel = async () => {
    setLoading(true); setError("");
    try {
      await cancelOrder(order.id);
      onRefresh(); onClose();
    } catch (e) { setError(e.message || "Failed."); }
    finally { setLoading(false); }
  };

  const fmt = d => d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
  const meta = STATUS_META[order.status] || { label: order.status, cls: "status-slate", Icon: Clock, desc: "" };


  const TIMELINE = [
    { key: "submitted", label: "Submitted", statuses: ["PENDING_REVIEW", "READY_FOR_CONFIRMATION", "BLOCKED_INSUFFICIENT_STOCK", "BLOCKED_INSUFFICIENT_MATERIALS", "BLOCKED_NO_BOM", "CONFIRMED", "DATE_CHANGE_REQUESTED", "IN_PRODUCTION", "READY", "DELIVERED"] },
    { key: "confirmed", label: "Confirmed", statuses: ["CONFIRMED", "IN_PRODUCTION", "READY", "DELIVERED"] },
    { key: "production", label: "In Production", statuses: ["IN_PRODUCTION", "READY", "DELIVERED"] },
    { key: "ready", label: "Ready", statuses: ["READY", "DELIVERED"] },
    { key: "delivered", label: "Delivered", statuses: ["DELIVERED"] },
  ];

  const isTerminal = ["REJECTED", "CANCELLED"].includes(order.status);

  return (
    <>
      <Modal
        title={
          <span className="flex items-center gap-3">
            {view !== "detail" && (
              <button onClick={() => { setView("detail"); setError(""); }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors">
                <ChevronLeft size={16} />
              </button>
            )}
            {view === "accept" ? "Accept New Date" : view === "reject" ? "Reject New Date" : order.orderReference}
          </span>
        }
        onClose={onClose}
        footer={
          view === "detail" ? (
            <div className="flex flex-wrap gap-3 justify-between">
              <div className="flex gap-3 flex-wrap">
                {canRespond && (
                  <>
                    <button onClick={() => { setView("accept"); setMsg(""); }}
                      className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                      <CheckCircle2 size={14} /> Accept New Date
                    </button>
                    <button onClick={() => { setView("reject"); setMsg(""); }}
                      className="btn-secondary py-2 px-4 text-sm flex items-center gap-2 !text-rose-600 !border-rose-200 dark:!border-rose-500/30 hover:!bg-rose-50 dark:hover:!bg-rose-500/10">
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                )}
                {isDelivered && (
                  <button onClick={() => setShowReorder(true)}
                    className="btn-primary py-2 px-4 text-sm flex items-center gap-2 !bg-emerald-600 hover:!bg-emerald-700">
                    <RefreshCw size={14} /> Reorder
                  </button>
                )}
              </div>
              {canCancel && (
                <button onClick={handleCancel} disabled={loading}
                  className="py-2 px-4 text-sm rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-500 hover:text-rose-600 hover:border-rose-200 dark:hover:border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all font-semibold">
                  {loading ? "Cancelling…" : "Cancel Order"}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
              <div className="flex justify-end gap-3">
                <button onClick={() => { setView("detail"); setError(""); }} className="btn-secondary py-2 px-5 text-sm">Back</button>
                <button onClick={view === "accept" ? handleAccept : handleReject} disabled={loading}
                  className={`py-2 px-5 text-sm rounded-xl font-semibold transition-all ${view === "accept" ? "btn-primary" : "bg-rose-600 hover:bg-rose-700 text-white"}`}>
                  {loading ? "Saving…" : view === "accept" ? "Confirm Accept" : "Confirm Reject"}
                </button>
              </div>
            </div>
          )
        }
      >
        {view === "detail" ? (
          <>

            <div className={`rounded-2xl p-4 flex items-start gap-3 ${order.status === "READY" ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20" :
                order.status === "IN_PRODUCTION" ? "bg-sky-50 dark:bg-sky-500/10 border border-sky-200/60 dark:border-sky-500/20" :
                  order.status === "DATE_CHANGE_REQUESTED" ? "bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20" :
                    order.status === "DELIVERED" ? "bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/[0.06]" :
                      ["REJECTED", "CANCELLED"].includes(order.status) ? "bg-rose-50 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-500/20" :
                        "bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/[0.06]"
              }`}>
              <meta.Icon size={18} className={
                order.status === "READY" ? "text-emerald-500 shrink-0 mt-0.5" :
                  order.status === "IN_PRODUCTION" ? "text-sky-500 shrink-0 mt-0.5" :
                    order.status === "DATE_CHANGE_REQUESTED" ? "text-amber-500 shrink-0 mt-0.5" :
                      ["REJECTED", "CANCELLED"].includes(order.status) ? "text-rose-500 shrink-0 mt-0.5" :
                        "text-slate-400 shrink-0 mt-0.5"
              } />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{meta.label}</p>
                {meta.desc && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{meta.desc}</p>}
              </div>
            </div>


            {!isTerminal && (
              <div className="flex items-center gap-0">
                {TIMELINE.map((step, idx) => {
                  const done = step.statuses.includes(order.status);
                  const isLast = idx === TIMELINE.length - 1;
                  return (
                    <div key={step.key} className="flex items-center flex-1 min-w-0">
                      <div className="flex flex-col items-center gap-1 flex-none">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${done ? "bg-brand-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-400"
                          }`}>
                          {done ? "✓" : idx + 1}
                        </div>
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">{step.label}</span>
                      </div>
                      {!isLast && (
                        <div className={`h-0.5 flex-1 mx-1 rounded transition-colors ${done ? "bg-brand-400" : "bg-slate-100 dark:bg-slate-700"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}


            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Requested Date", val: fmt(order.requestedDeliveryDate), color: "text-slate-700 dark:text-slate-200" },
                { label: "Confirmed Date", val: fmt(order.confirmedDeliveryDate), color: "text-emerald-600 dark:text-emerald-400" },
                { label: "Proposed Date", val: fmt(order.proposedDeliveryDate), color: "text-sky-600 dark:text-sky-400" },
              ].map(({ label, val, color }) => (
                <div key={label} className="rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/[0.06] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                  <p className={`text-sm font-semibold ${color}`}>{val}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/[0.06] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Material Supply</p>
              <p className={`text-sm font-semibold ${order.materialSource === 'CLIENT_SUPPLIED' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {order.materialSource === 'CLIENT_SUPPLIED' ? 'Client Supplied (Production Only)' : 'Company Supplied (Materials + Production)'}
              </p>
            </div>


            {order.adminMessage && (
              <div className="rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200/60 dark:border-sky-500/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-sky-500 mb-1">Message from Us</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{order.adminMessage}</p>
              </div>
            )}


            {(order.totalPrice != null && order.totalPrice > 0) || order.paymentStatus ? (
              <div className="rounded-2xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200/60 dark:border-brand-500/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-500 mb-2">Pricing & Payment</p>
                {order.paymentStatus && (
                  <div className="mb-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${order.paymentStatus === "PAID" ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20" :
                        order.paymentStatus === "PARTIALLY_PAID" ? "text-amber-600 bg-amber-100 dark:bg-amber-500/20" :
                          order.paymentStatus === "REFUNDED" ? "text-rose-600 bg-rose-100 dark:bg-rose-500/20" :
                            "text-slate-500 bg-slate-100 dark:bg-slate-700"
                      }`}>
                      {order.paymentStatus === "PAID" ? "Paid" :
                        order.paymentStatus === "PARTIALLY_PAID" ? `Partially Paid (${order.amountPaid?.toFixed(2)} / ${order.totalPrice?.toFixed(2)} ${order.currency || "MAD"})` :
                          order.paymentStatus === "REFUNDED" ? "Refunded" : "Unpaid"}
                    </span>
                    {order.amountDue > 0 && (
                      <span className="ml-2 text-xs text-amber-600 font-semibold">Due: {order.amountDue?.toFixed(2)} {order.currency || "MAD"}</span>
                    )}
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Total</span>
                    <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
                      {order.totalPrice?.toFixed(2)} {order.currency || "MAD"}
                    </span>
                  </div>
                </div>
                {order.quoteId && (
                  <button onClick={() => window.location.href = `/quote?quoteId=${order.quoteId}`}
                    className="mt-2 w-full py-2.5 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 transition-colors">
                    View Quote
                  </button>
                )}
                {(order.status === "AWAITING_DEPOSIT") && (
                  <button onClick={() => window.location.href = `/payment?orderId=${order.id}`}
                    className="mt-2 w-full py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors">
                    Pay Deposit
                  </button>
                )}
                {(order.status === "DEPOSIT_UNDER_REVIEW") && (
                  <button onClick={() => window.location.href = `/payment?orderId=${order.id}`}
                    className="mt-2 w-full py-2.5 rounded-xl bg-sky-500 text-white font-bold text-sm hover:bg-sky-600 transition-colors">
                    View Payment Status
                  </button>
                )}
                {(order.status === "FINAL_PAYMENT_PENDING" || order.status === "READY_FOR_DELIVERY") && (
                  <button onClick={() => window.location.href = `/payment?orderId=${order.id}`}
                    className="mt-2 w-full py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors">
                    Pay Remaining Balance
                  </button>
                )}
              </div>
            ) : null}

            {["IN_PRODUCTION", "READY", "DELIVERED"].includes(order.status) && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                  <Factory size={11} /> Production Progress
                </p>
                {loadingProds ? (
                  <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                    <div className="w-4 h-4 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                    Loading…
                  </div>
                ) : productions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No production data linked yet.</p>
                ) : productions.map((prod) => {
                  const steps = Array.isArray(prod.steps) ? prod.steps : [];
                  const done = steps.filter(s => s.completed).length;
                  const pct = steps.length > 0 ? Math.round((done / steps.length) * 100) : 0;
                  return (
                    <div key={prod.id} className="rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200/60 dark:border-sky-500/20 p-4 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-sky-700 dark:text-sky-300">Batch · {prod.status?.replace("_", " ")}</span>
                        <span className="text-xs font-bold text-sky-600 dark:text-sky-400">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-sky-100 dark:bg-sky-900/40 overflow-hidden mb-3">
                        <div className="h-full rounded-full bg-sky-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="space-y-1">
                        {steps.map((step, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            {step.completed ? (
                              <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                            ) : (
                              <div className="w-3 h-3 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
                            )}
                            <span className={step.completed ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-300"}>
                              {step.stepName || `Step ${i + 1}`}
                            </span>
                            {step.operator && <span className="text-slate-400">· {step.operator}</span>}
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-sky-500 dark:text-sky-400 mt-2 font-medium">{done}/{steps.length} steps completed</p>
                    </div>
                  );
                })}
              </div>
            )}


            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Ordered Products ({order.totalQuantity ?? 0} units total)
              </p>
              <div className="space-y-2">
                {(order.items || []).map((item, i) => {
                  const sm = ITEM_STATUS_META[item.status] || { label: "Processing", cls: "text-slate-500 bg-slate-100 dark:bg-slate-700" };
                  const needsProduction = item.status === "OUT_OF_STOCK" || item.status === "TO_PRODUCE";
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/[0.06]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center shrink-0">
                          <Package size={14} className="text-brand-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{item.productName}</p>
                          <p className="text-xs text-slate-400">Qty: {item.quantity} {item.unit || ""}</p>
                          {needsProduction && (
                            <p className="text-[10px] text-sky-600 dark:text-sky-400 font-medium mt-0.5 flex items-center gap-1">
                              <Factory size={10} /> Will be manufactured for your order
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${sm.cls}`}>
                        {sm.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <>
            {view === "accept" ? (
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 p-4">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-1">You are accepting the new delivery date:</p>
                <p className="text-xl font-bold text-emerald-600">{fmt(order.proposedDeliveryDate)}</p>
                {order.adminMessage && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Note: {order.adminMessage}</p>}
              </div>
            ) : (
              <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-500/20 p-4">
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">You are rejecting the proposed date. The order will be marked as rejected.</p>
              </div>
            )}
            <FieldGroup label="Message (optional)">
              <textarea rows={3} value={msg} onChange={e => setMsg(e.target.value)}
                placeholder="Add a message…"
                className={INPUT + " h-auto py-3 resize-none"} />
            </FieldGroup>
          </>
        )}
      </Modal>

      {showReorder && (
        <ReorderModal
          order={order}
          products={products}
          onClose={() => setShowReorder(false)}
          onCreated={(newOrder) => {
            setShowReorder(false);
            onReordered(newOrder);
            onClose();
          }}
        />
      )}
    </>
  );
}



export default function ClientOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [ords, prods] = await Promise.all([getMyOrders(), getAvailableProducts()]);
      setOrders(Array.isArray(ords) ? ords : []);
      setProducts(Array.isArray(prods) ? prods : []);
    } catch (e) {
      setError(e.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const handleCreated = order => {
    const newOrder = order?.data ?? order;
    setOrders(prev => [newOrder, ...prev]);
    setShowCreate(false);
  };
  const handleReordered = newOrder => {
    const o = newOrder?.data ?? newOrder;
    setOrders(prev => [o, ...prev]);
  };

  const fmt = d => d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

  const actionNeeded = orders.filter(o => o.status === "DATE_CHANGE_REQUESTED");
  const readyOrders = orders.filter(o => o.status === "READY");

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:p-8 max-w-5xl mx-auto space-y-6">


        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <ShoppingCart size={22} className="text-brand-500" /> My Orders
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Track and manage your product orders</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 py-2.5 px-5 text-sm self-start sm:self-auto">
            <Plus size={16} /> Place New Order
          </button>
        </div>


        {actionNeeded.length > 0 && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Action Required</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                {actionNeeded.length} order{actionNeeded.length > 1 ? "s have" : " has"} a new proposed delivery date waiting for your response.
              </p>
            </div>
          </div>
        )}
        {readyOrders.length > 0 && (
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 p-4 flex items-start gap-3">
            <Truck size={18} className="text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Ready for Delivery</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                {readyOrders.length} order{readyOrders.length > 1 ? "s are" : " is"} ready and waiting for pickup or delivery.
              </p>
            </div>
          </div>
        )}


        {loading ? (
          <div className="glass-card rounded-3xl p-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="glass-card rounded-3xl p-8 text-center text-rose-500 text-sm">{error}</div>
        ) : orders.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center">
            <ShoppingCart size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No orders yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 mb-6">Place your first order to get started</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary py-2.5 px-6 text-sm mx-auto flex items-center gap-2">
              <Plus size={15} /> Place Order
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const needsAction = order.status === "DATE_CHANGE_REQUESTED";
              const isReady = order.status === "READY";
              const hasProductionItems = (order.items || []).some(
                it => it.status === "OUT_OF_STOCK" || it.status === "TO_PRODUCE"
              );

              return (
                <div key={order.id}
                  onClick={() => setSelected(order)}
                  className={`glass-card rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all group border ${needsAction ? "border-amber-300 dark:border-amber-500/40" :
                      isReady ? "border-emerald-300 dark:border-emerald-500/40" :
                        "border-slate-200/60 dark:border-white/[0.06]"
                    }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">

                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{order.orderReference}</span>
                        <StatusBadge status={order.status} />
                        {needsAction && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                            ● Response needed
                          </span>
                        )}
                        {isReady && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            ● Ready to ship
                          </span>
                        )}
                      </div>


                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(order.items || []).map((it, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg font-medium">
                            <Package size={10} /> {it.productName} ×{it.quantity}
                            {(it.status === "OUT_OF_STOCK" || it.status === "TO_PRODUCE") && (
                              <span className="text-sky-500" title="Will be manufactured">
                                <Factory size={10} />
                              </span>
                            )}
                          </span>
                        ))}
                      </div>


                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        {order.materialSource === 'CLIENT_SUPPLIED' && (
                          <span className="flex items-center gap-1 font-medium text-purple-600 dark:text-purple-400">
                            <Package size={11} /> Client Supplied Materials
                          </span>
                        )}
                        <span className="flex items-center gap-1"><Calendar size={11} /> Requested: {fmt(order.requestedDeliveryDate)}</span>
                        {order.confirmedDeliveryDate && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 size={11} /> Confirmed: {fmt(order.confirmedDeliveryDate)}
                          </span>
                        )}
                        {order.proposedDeliveryDate && order.status === "DATE_CHANGE_REQUESTED" && (
                          <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                            <RefreshCw size={11} /> New proposed: {fmt(order.proposedDeliveryDate)}
                          </span>
                        )}
                      </div>


                      {hasProductionItems && !["DELIVERED", "CANCELLED", "REJECTED"].includes(order.status) && (
                        <p className="mt-1.5 text-[11px] text-sky-600 dark:text-sky-400 flex items-center gap-1">
                          <Factory size={11} /> Some items will be manufactured specifically for your order
                        </p>
                      )}
                      {order.totalPrice != null && order.totalPrice > 0 && (
                        <p className="mt-1.5 text-xs font-bold text-brand-600 dark:text-brand-400">
                          Total: {order.totalPrice?.toFixed(2)} {order.currency || "MAD"}
                        </p>
                      )}
                    </div>

                    <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-500 transition-colors shrink-0 mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateOrderModal products={products} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
      {selected && (
        <OrderDetailModal
          order={selected}
          products={products}
          onClose={() => setSelected(null)}
          onRefresh={() => { setSelected(null); load(); }}
          onReordered={handleReordered}
        />
      )}
    </DashboardLayout>
  );
}
