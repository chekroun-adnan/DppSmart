import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Receipt, CreditCard, DollarSign, Plus, Loader2, CheckCircle, XCircle, Clock, Send, Trash2, Download } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import {
  getPrices, createPrice, updatePrice, deletePrice,
  getQuotes, createQuoteFromOrder, sendQuote, acceptQuote, rejectQuote, deleteQuote,
  getInvoices, createInvoiceFromQuote, createInvoiceFromOrder, sendInvoice, recordPayment, cancelInvoice,
  getPayments, getAvailableProducts, suggestAiPrice, approveAiSuggestion,
  getOrders
} from "../services/authService";
import { useNotifications } from "../context/NotificationContext";

const TABS = [
  { key: "quotes", label: "Quotes", icon: FileText },
  { key: "invoices", label: "Invoices", icon: Receipt },
  { key: "prices", label: "Price List", icon: DollarSign },
];

const QUOTE_STATUS_STYLES = {
  DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  ACCEPTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  EXPIRED: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
};

const INVOICE_STATUS_STYLES = {
  DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  CANCELLED: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};

function formatCurrency(amount, currency) {
  if (amount == null) return "—";
  if (!currency) currency = "MAD";
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
  } catch {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "MAD" }).format(amount);
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

function Badge({ label, className }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${className}`}>{label}</span>;
}

export default function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "quotes";
  const setTab = (key) => {
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set("tab", key); return n; }, { replace: true });
  };
  const { addNotification } = useNotifications();

  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [missingPricingError, setMissingPricingError] = useState(null);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getQuotes();
      setQuotes(data);
    } catch (e) {
      addNotification?.({ type: "error", title: "Error", message: e.message });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInvoices();
      setInvoices(data);
    } catch (e) {
      addNotification?.({ type: "error", title: "Error", message: e.message });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const loadOrders = useCallback(async () => {
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (e) {
      // silent
    }
  }, []);

  useEffect(() => {
    if (activeTab === "quotes") { loadQuotes(); loadOrders(); }
    else if (activeTab === "invoices") loadInvoices();
  }, [activeTab, loadQuotes, loadInvoices, loadOrders]);

  const handleCreateFromOrder = async (orderId) => {
    setActionLoading(`create-${orderId}`);
    try {
      await createQuoteFromOrder(orderId);
      addNotification?.({ type: "success", title: "Quote created", message: "Quote created from order." });
      loadQuotes();
    } catch (e) {
      if (e.message && e.message.startsWith("MISSING_PRICING|")) {
        setMissingPricingError(e.message);
      } else {
        addNotification?.({ type: "error", title: "Error", message: e.message });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendQuote = async (id) => {
    setActionLoading(`send-${id}`);
    try {
      await sendQuote(id);
      addNotification?.({ type: "success", title: "Sent", message: "Quote sent to client." });
      loadQuotes();
    } catch (e) {
      addNotification?.({ type: "error", title: "Error", message: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptQuote = async (id) => {
    setActionLoading(`accept-${id}`);
    try {
      await acceptQuote(id);
      addNotification?.({ type: "success", title: "Accepted", message: "Quote accepted." });
      loadQuotes();
    } catch (e) {
      addNotification?.({ type: "error", title: "Error", message: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectQuote = async (id) => {
    setActionLoading(`reject-${id}`);
    try {
      await rejectQuote(id);
      addNotification?.({ type: "success", title: "Rejected", message: "Quote rejected." });
      loadQuotes();
    } catch (e) {
      addNotification?.({ type: "error", title: "Error", message: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteQuote = async (id) => {
    setActionLoading(`delete-${id}`);
    try {
      await deleteQuote(id);
      addNotification?.({ type: "success", title: "Deleted", message: "Quote deleted." });
      loadQuotes();
    } catch (e) {
      addNotification?.({ type: "error", title: "Error", message: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateInvoiceFromQuote = async (quoteId) => {
    setActionLoading(`inv-quote-${quoteId}`);
    try {
      await createInvoiceFromQuote(quoteId);
      addNotification?.({ type: "success", title: "Invoice created", message: "Invoice created from quote." });
      loadInvoices();
    } catch (e) {
      if (e.message && e.message.startsWith("MISSING_PRICING|")) {
        setMissingPricingError(e.message);
      } else {
        addNotification?.({ type: "error", title: "Error", message: e.message });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendInvoice = async (id) => {
    setActionLoading(`send-inv-${id}`);
    try {
      await sendInvoice(id);
      addNotification?.({ type: "success", title: "Sent", message: "Invoice sent to client." });
      loadInvoices();
    } catch (e) {
      addNotification?.({ type: "error", title: "Error", message: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelInvoice = async (id) => {
    setActionLoading(`cancel-inv-${id}`);
    try {
      await cancelInvoice(id);
      addNotification?.({ type: "success", title: "Cancelled", message: "Invoice cancelled." });
      loadInvoices();
    } catch (e) {
      addNotification?.({ type: "error", title: "Error", message: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Billing</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Quotes, invoices, and payments</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-white/[0.08]">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition-all ${
                activeTab === tab.key
                  ? "border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400"
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Quotes Tab */}
        {activeTab === "quotes" && (
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="flex-1 min-w-[200px] max-w-sm text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="">— Select an order —</option>
                {orders.filter(o => !o.quoteId).map(o => (
                  <option key={o.id} value={o.id}>
                    {o.orderReference || o.id} — {o.status} {o.clientId ? `(client: ${o.clientId.slice(0,8)}…)` : ""}
                  </option>
                ))}
              </select>
              <button onClick={() => {
                if (selectedOrderId) handleCreateFromOrder(selectedOrderId);
              }} disabled={!selectedOrderId || actionLoading?.startsWith("create")}
                className="text-xs font-semibold px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                {actionLoading?.startsWith("create") ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Create from Order
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-brand-600" size={24} /></div>
            ) : quotes.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400 italic">No quotes yet.</div>
            ) : (
              <div className="space-y-2">
                {quotes.map(q => (
                  <QuoteCard key={q.id} quote={q} actionLoading={actionLoading}
                    onSend={handleSendQuote} onAccept={handleAcceptQuote} onReject={handleRejectQuote}
                    onDelete={handleDeleteQuote} onCreateInvoice={handleCreateInvoiceFromQuote}
                    isExpanded={expandedId === q.id} onToggle={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === "invoices" && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-brand-600" size={24} /></div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400 italic">No invoices yet.</div>
            ) : (() => {
              const activeInvoices = invoices.filter(inv => inv.status !== "PAID" && inv.status !== "CANCELLED");
              return (
                <div className="space-y-2">
                  {activeInvoices.length === 0 && <div className="text-center py-12 text-sm text-slate-400 italic">No active invoices. All done!</div>}
                  {activeInvoices.map(inv => (
                    <InvoiceCard key={inv.id} invoice={inv} actionLoading={actionLoading}
                      onSend={handleSendInvoice} onCancel={handleCancelInvoice}
                      isExpanded={expandedId === inv.id} onToggle={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                    />
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Prices Tab */}
        {activeTab === "prices" && (
          <PricesView />
        )}
      </div>
      
      {/* Missing Pricing Error Modal */}
      <MissingPricingModal 
        errorString={missingPricingError} 
        onClose={() => setMissingPricingError(null)} 
      />
    </DashboardLayout>
  );
}

function QuoteCard({ quote, actionLoading, onSend, onAccept, onReject, onDelete, onCreateInvoice, isExpanded, onToggle }) {
  const isBusy = (key) => actionLoading === key;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/40 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{quote.quoteNumber}</span>
              <Badge label={quote.status} className={QUOTE_STATUS_STYLES[quote.status] || QUOTE_STATUS_STYLES.DRAFT} />
              {quote.total != null && (
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(quote.total, quote.currency)}</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
              {quote.clientId && <span>Client: {quote.clientId.slice(-8)}</span>}
              {quote.orderId && <span>Order: {quote.orderId.slice(-8)}</span>}
              {quote.validUntil && <span>Valid until: {formatDate(quote.validUntil)}</span>}
              <span>{quote.items?.length || 0} items</span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            {quote.status === "DRAFT" && (
              <>
                <button onClick={() => onSend(quote.id)} disabled={isBusy(`send-${quote.id}`)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 disabled:opacity-50 transition-colors flex items-center gap-1">
                  {isBusy(`send-${quote.id}`) ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Send
                </button>
                <button onClick={() => onDelete(quote.id)} disabled={isBusy(`delete-${quote.id}`)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 disabled:opacity-50 transition-colors flex items-center gap-1">
                  <Trash2 size={12} />
                </button>
              </>
            )}
            {quote.status === "SENT" && (
              <>
                <button onClick={() => onAccept(quote.id)} disabled={isBusy(`accept-${quote.id}`)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 disabled:opacity-50 transition-colors flex items-center gap-1">
                  {isBusy(`accept-${quote.id}`) ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                  Accept
                </button>
                <button onClick={() => onReject(quote.id)} disabled={isBusy(`reject-${quote.id}`)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 disabled:opacity-50 transition-colors flex items-center gap-1">
                  <XCircle size={12} />
                </button>
              </>
            )}
            {quote.status === "ACCEPTED" && (
              <button onClick={() => onCreateInvoice(quote.id)} disabled={isBusy(`inv-quote-${quote.id}`)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 disabled:opacity-50 transition-colors flex items-center gap-1">
                {isBusy(`inv-quote-${quote.id}`) ? <Loader2 size={12} className="animate-spin" /> : <Receipt size={12} />}
                Create Invoice
              </button>
            )}
            <button onClick={onToggle} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 transition-colors">
              <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-white/[0.06] px-4 py-4">
          {quote.items?.length > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 py-1">
                <span className="flex-1">Product</span>
                <span className="w-16 text-right">Qty</span>
                <span className="w-24 text-right">Unit Price</span>
                <span className="w-24 text-right">Total</span>
              </div>
              {quote.items.map((item, i) => (
                <div key={i} className="flex items-center text-xs text-slate-700 dark:text-slate-300 px-2 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="flex-1">{item.productName || item.productId?.slice(-8)}</span>
                  <span className="w-16 text-right font-semibold">{item.quantity}</span>
                  <span className="w-24 text-right">{formatCurrency(item.unitPrice)}</span>
                  <span className="w-24 text-right font-bold">{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400 px-2">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(quote.subtotal)}</span></div>
                {quote.discountPercent > 0 && <div className="flex justify-between"><span>Discount ({quote.discountPercent}%)</span><span className="text-red-500">-{formatCurrency(quote.discountAmount)}</span></div>}
                {quote.taxRate > 0 && <div className="flex justify-between"><span>Tax ({quote.taxRate}%)</span><span>{formatCurrency(quote.taxAmount)}</span></div>}
                <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Total</span><span>{formatCurrency(quote.total)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No items</p>
          )}
        </div>
      )}
    </div>
  );
}

function splitInvoiceItems(items = []) {
  const materials = (items || []).filter(i => i.itemType === "MATERIAL");
  const production = (items || []).filter(i => i.itemType === "PRODUCTION" || i.itemType === "PRODUCT" || !i.itemType);
  return { materials, production };
}

function InvoiceCard({ invoice, actionLoading, onSend, onCancel, isExpanded, onToggle }) {
  const isBusy = (key) => actionLoading === key;
  const isOverdue = invoice.status === "SENT" && invoice.dueDate && new Date(invoice.dueDate) < new Date();
  const displayStatus = isOverdue ? "OVERDUE" : invoice.status;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/40 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{invoice.invoiceNumber}</span>
              <Badge label={displayStatus} className={INVOICE_STATUS_STYLES[displayStatus] || INVOICE_STATUS_STYLES.DRAFT} />
              {invoice.total != null && (
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(invoice.total, invoice.currency)}</span>
              )}
              {invoice.amountPaid > 0 && (
                <span className="text-[10px] text-slate-400">Paid: {formatCurrency(invoice.amountPaid)}</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
              {invoice.clientId && <span>Client: {invoice.clientId.slice(-8)}</span>}
              {invoice.issueDate && <span>Issued: {formatDate(invoice.issueDate)}</span>}
              {invoice.dueDate && <span>Due: {formatDate(invoice.dueDate)}</span>}
              {invoice.paidDate && <span>Paid: {formatDate(invoice.paidDate)}</span>}
              {invoice.totalProductionCost > 0 && (
                <span className="text-blue-600 dark:text-blue-400">
                  Production: {formatCurrency(invoice.totalProductionCost, invoice.currency)}
                </span>
              )}
              {invoice.totalMaterialCost > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  Materials: {formatCurrency(invoice.totalMaterialCost, invoice.currency)}
                </span>
              )}
              <span>{invoice.items?.length || 0} items</span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            {invoice.status === "DRAFT" && (
              <>
                <button onClick={() => onSend(invoice.id)} disabled={isBusy(`send-inv-${invoice.id}`)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 disabled:opacity-50 transition-colors flex items-center gap-1">
                  {isBusy(`send-inv-${invoice.id}`) ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Send
                </button>
                <button onClick={() => onCancel(invoice.id)} disabled={isBusy(`cancel-inv-${invoice.id}`)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors flex items-center gap-1">
                  Cancel
                </button>
              </>
            )}
            <button onClick={onToggle} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 transition-colors">
              <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-white/[0.06] px-4 py-4">
          {invoice.items?.length > 0 ? (
            <div className="space-y-4">
              {(() => {
                const { materials, production } = splitInvoiceItems(invoice.items);
                const renderMaterials = (items) => {
                  if (!items.length) return null;
                  return (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest px-2 text-amber-600 dark:text-amber-400">Materials</p>
                      <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 py-1">
                        <span className="flex-1">Material</span>
                        <span className="w-24">Source</span>
                        <span className="w-24 text-right">Qty Used</span>
                        <span className="w-24 text-right">Unit Price</span>
                        <span className="w-24 text-right">Total</span>
                      </div>
                      {items.map((item, i) => (
                        <div key={i} className="flex items-center text-xs text-slate-700 dark:text-slate-300 px-2 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                          <span className="flex-1 font-medium">{item.productName || item.productId?.slice(-8)}</span>
                          <span className="w-24 text-[10px] font-semibold text-slate-500">
                            {item.clientSuppliedMaterials ? (
                              <span className="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-1.5 py-0.5 rounded-full">Client</span>
                            ) : "Company"}
                          </span>
                          <span className="w-24 text-right font-semibold">{item.quantity} {item.unit || ""}</span>
                          <span className="w-24 text-right text-slate-500">{item.clientSuppliedMaterials ? "—" : formatCurrency(item.unitPrice, invoice.currency)}</span>
                          <span className="w-24 text-right font-bold">{item.clientSuppliedMaterials ? "—" : formatCurrency(item.totalPrice, invoice.currency)}</span>
                        </div>
                      ))}
                    </div>
                  );
                };

                const renderProduction = (items) => {
                  if (!items.length) return null;
                  return (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest px-2 text-blue-600 dark:text-blue-400">Production</p>
                      <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 py-1">
                        <span className="flex-1">Operation</span>
                        <span className="w-16 text-right">Qty</span>
                        <span className="w-24 text-right">Time/Product</span>
                        <span className="w-24 text-right">Cost/Unit</span>
                        <span className="w-24 text-right">Total</span>
                      </div>
                      {items.map((item, i) => (
                        <div key={i} className="flex items-center text-xs text-slate-700 dark:text-slate-300 px-2 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                          <span className="flex-1 font-medium">{item.productName || item.productId?.slice(-8)}</span>
                          <span className="w-16 text-right font-semibold">{item.quantity}</span>
                          <span className="w-24 text-right text-slate-500">{item.durationPerUnit ? `${item.durationPerUnit} min` : "—"}</span>
                          <span className="w-24 text-right text-slate-500">{item.unitPrice ? formatCurrency(item.unitPrice, invoice.currency) : "—"}</span>
                          <span className="w-24 text-right font-bold">{formatCurrency(item.totalPrice, invoice.currency)}</span>
                        </div>
                      ))}
                    </div>
                  );
                };

                return (
                  <>
                    {renderMaterials(materials)}
                    {renderProduction(production)}
                  </>
                );
              })()}
              <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400 px-2">
                {invoice.totalProductionCost > 0 && (
                  <div className="flex justify-between">
                    <span>Production Cost</span>
                    <span>{formatCurrency(invoice.totalProductionCost, invoice.currency)}</span>
                  </div>
                )}
                {invoice.totalMaterialCost > 0 && (
                  <div className="flex justify-between">
                    <span>Material Cost</span>
                    <span>{formatCurrency(invoice.totalMaterialCost, invoice.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal, invoice.currency)}</span></div>
                {invoice.discountPercent > 0 && <div className="flex justify-between"><span>Discount ({invoice.discountPercent}%)</span><span className="text-red-500">-{formatCurrency(invoice.discountAmount, invoice.currency)}</span></div>}
                {invoice.taxRate > 0 && <div className="flex justify-between"><span>Tax ({invoice.taxRate}%)</span><span>{formatCurrency(invoice.taxAmount, invoice.currency)}</span></div>}
                <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Total</span><span>{formatCurrency(invoice.total, invoice.currency)}</span>
                </div>
                {invoice.amountInWords && (
                  <div className="text-[10px] text-slate-500 italic mt-1 pb-1">
                    Montant en lettres : {invoice.amountInWords}
                  </div>
                )}
                {invoice.amountPaid > 0 && (
                  <div className="flex justify-between font-semibold text-emerald-600 dark:text-emerald-400">
                    <span>Paid</span><span>{formatCurrency(invoice.amountPaid, invoice.currency)}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No items</p>
          )}
        </div>
      )}
    </div>
  );
}

function PricesView() {
  const [prices, setPrices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [approving, setApproving] = useState(false);
  const { addNotification } = useNotifications();

  const loadPrices = useCallback(async () => {
    setLoading(true);
    try {
      const [priceData, productData] = await Promise.all([
        getPrices(),
        getAvailableProducts()
      ]);
      setPrices(priceData);
      setProducts(Array.isArray(productData) ? productData : []);
    } catch (e) {
      addNotification?.({ type: "error", title: "Error", message: e.message });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => { loadPrices(); }, [loadPrices]);

  const handleSuggest = async () => {
    if (!selectedProductId) return;
    setAiLoading(selectedProductId);
    setAiSuggestion(null);
    try {
      const result = await suggestAiPrice(selectedProductId);
      setAiSuggestion(result);
    } catch (e) {
      addNotification?.({ type: "error", title: "Error", message: e.message });
    } finally {
      setAiLoading(null);
    }
  };

  const handleApprove = async () => {
    if (!aiSuggestion || !selectedProductId) return;
    setApproving(true);
    try {
      await approveAiSuggestion({
        productId: selectedProductId,
        unitPrice: aiSuggestion.suggestedUnitPrice,
        currency: aiSuggestion.currency
      });
      addNotification?.({ type: "success", title: "Price approved", message: "AI-suggested price has been saved." });
      setAiSuggestion(null);
      setSelectedProductId("");
      loadPrices();
    } catch (e) {
      addNotification?.({ type: "error", title: "Error", message: e.message });
    } finally {
      setApproving(false);
    }
  };

  const handleDismiss = () => {
    setAiSuggestion(null);
  };

  return (
    <div>
      {/* AI Price Suggestion */}
      <div className="mb-6 p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/40">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">AI Price Suggestion</h4>
        <div className="flex items-center gap-2">
          <select
            value={selectedProductId}
            onChange={e => { setSelectedProductId(e.target.value); setAiSuggestion(null); }}
            className="flex-1 max-w-xs text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="">Select a product...</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.productName || p.sku || p.id?.slice(-8)}
              </option>
            ))}
          </select>
          <button onClick={handleSuggest} disabled={!selectedProductId || aiLoading === selectedProductId}
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center gap-1"
          >
            {aiLoading === selectedProductId ? <Loader2 size={12} className="animate-spin" /> : <DollarSign size={12} />}
            Suggest AI Price
          </button>
        </div>

        {aiSuggestion && (
          <div className="mt-4 p-3 rounded-lg bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-brand-700 dark:text-brand-300">
                    {formatCurrency(aiSuggestion.suggestedUnitPrice, aiSuggestion.currency)}
                  </span>
                  <span className="text-[10px] text-slate-400">suggested retail price</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
                  <div>Manufacturing cost: {formatCurrency(aiSuggestion.manufacturingCost)}</div>
                  <div>Materials: {formatCurrency(aiSuggestion.materialCost)} | Operations: {formatCurrency(aiSuggestion.operationCost)}</div>
                </div>
                {aiSuggestion.reasoning && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 italic mt-1">{aiSuggestion.reasoning}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={handleApprove} disabled={approving}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  {approving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                  Approve
                </button>
                <button onClick={handleDismiss}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Existing Prices */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Configured Prices</h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-brand-600" size={24} /></div>
      ) : prices.length === 0 ? (
        <div className="text-center py-12 text-sm text-slate-400 italic">No prices configured yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 px-3 font-semibold">Product</th>
                <th className="text-left py-2 px-3 font-semibold">Client</th>
                <th className="text-right py-2 px-3 font-semibold">Unit Price</th>
                <th className="text-center py-2 px-3 font-semibold">Currency</th>
                <th className="text-center py-2 px-3 font-semibold">Valid From</th>
                <th className="text-center py-2 px-3 font-semibold">Valid To</th>
              </tr>
            </thead>
            <tbody>
              {prices.map(p => (
                <tr key={p.id} className="border-b border-slate-100 dark:border-white/[0.04] text-slate-700 dark:text-slate-300">
                  <td className="py-2 px-3">{p.productId?.slice(-8)}</td>
                  <td className="py-2 px-3">{p.clientId?.slice(-8) || "Default"}</td>
                  <td className="py-2 px-3 text-right font-semibold">{formatCurrency(p.unitPrice)}</td>
                  <td className="py-2 px-3 text-center">{p.currency || "MAD"}</td>
                  <td className="py-2 px-3 text-center">{p.validFrom ? formatDate(p.validFrom) : "—"}</td>
                  <td className="py-2 px-3 text-center">{p.validTo ? formatDate(p.validTo) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      )}
    </div>
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
            <XCircle size={20} />
            <h3 className="font-bold">Missing Pricing Data</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <XCircle size={18} />
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
