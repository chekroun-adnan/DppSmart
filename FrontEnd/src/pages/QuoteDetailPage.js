import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FileText, DollarSign, CreditCard, ArrowLeft, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { getQuotes, acceptQuote, createPayPalOrder, capturePayPalOrder, getMyOrders } from "../services/authService";

const QUOTE_META = {
  DRAFT:    { cls: "text-slate-500 bg-slate-100 dark:bg-slate-700", label: "Draft" },
  SENT:     { cls: "text-sky-600 bg-sky-100 dark:bg-sky-500/20", label: "Sent" },
  ACCEPTED: { cls: "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20", label: "Accepted" },
  REJECTED: { cls: "text-rose-600 bg-rose-100 dark:bg-rose-500/20", label: "Rejected" },
  EXPIRED:  { cls: "text-slate-500 bg-slate-100 dark:bg-slate-700", label: "Expired" },
};

function formatCurrency(amount, currency = "MAD") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
}

export default function QuoteDetailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get("quoteId");

  const [quote, setQuote] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [paypalLoading, setPaypalLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState(null); // "full" or "deposit"
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadQuote = async () => {
    if (!quoteId) { setLoading(false); return; }
    setLoading(true);
    try {
      const quotes = await getQuotes(null, null, null);
      const q = Array.isArray(quotes) ? quotes.find(q => q.id === quoteId) : null;
      setQuote(q);
      if (q?.orderId) {
        const orders = await getMyOrders();
        const o = Array.isArray(orders) ? orders.find(o => o.id === q.orderId) : null;
        setOrder(o);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQuote(); }, [quoteId]);

  const handleAccept = async () => {
    setActionLoading(true); setError("");
    try {
      await acceptQuote(quoteId);
      setSuccess("Quote accepted. You can now proceed with payment.");
      loadQuote();
    } catch (e) {
      setError(e.message || "Failed to accept quote");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePay = async (isDeposit) => {
    if (!quote?.orderId) return;
    setPaypalLoading(true); setError(""); setPaymentMode(isDeposit ? "deposit" : "full");
    try {
      const result = await createPayPalOrder({
        orderId: quote.orderId,
        deposit: isDeposit,
      });

      if (result.approvalUrl) {
        window.open(result.approvalUrl, "_blank");
        setSuccess("PayPal checkout opened in new tab. Complete payment there, then click 'Check Payment Status'.");
      } else {
        setSuccess("Payment processed successfully!");
        loadQuote();
      }
    } catch (e) {
      setError(e.message || "Payment failed");
    } finally {
      setPaypalLoading(false);
      setPaymentMode(null);
    }
  };

  const handleCheckPayment = async () => {
    if (!quote?.orderId) return;
    setLoading(true);
    try {
      const orders = await getMyOrders();
      const o = Array.isArray(orders) ? orders.find(o => o.id === quote.orderId) : null;
      setOrder(o);
      if (o?.paymentStatus === "PAID") {
        setSuccess("Payment confirmed! Your order is now confirmed.");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const depositAmount = quote?.total != null && order?.depositPercent != null
    ? quote.total * (order.depositPercent / 100) : (quote?.total != null ? quote.total * 0.5 : 0);
  const remainingAmount = quote?.total != null ? quote.total - depositAmount : 0;

  const isAccepted = quote?.status === "ACCEPTED";
  const isPaid = order?.paymentStatus === "PAID" || order?.paymentStatus === "PARTIALLY_PAID";

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto mt-6 p-4 sm:p-6 space-y-6">
        <button onClick={() => navigate("/client-orders")} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-brand-600 transition-colors">
          <ArrowLeft size={14} /> Back to Orders
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-brand-600" size={28} /></div>
        ) : error && !quote ? (
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/60 p-4 text-sm text-rose-600">{error}</div>
        ) : !quote ? (
          <div className="text-center py-16 text-slate-400">Quote not found.</div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText size={20} className="text-brand-500" /> Quote {quote.quoteNumber}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">Review and pay to confirm your order</p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${QUOTE_META[quote.status]?.cls || "text-slate-500 bg-slate-100"}`}>
                {QUOTE_META[quote.status]?.label || quote.status}
              </span>
            </div>

            {/* Success/Error */}
            {success && (
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 p-4 flex items-start gap-3">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300">{success}</p>
              </div>
            )}
            {error && (
              <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/60 p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                <p className="text-sm text-rose-600">{error}</p>
              </div>
            )}

            {/* Order Info */}
            {order && (
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Order</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{order.orderReference}</p>
                <p className="text-xs text-slate-400">Status: {order.status?.replace(/_/g, " ")}</p>
                {order.paymentStatus && (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    order.paymentStatus === "PAID" ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20" :
                    order.paymentStatus === "PARTIALLY_PAID" ? "text-amber-600 bg-amber-100 dark:bg-amber-500/20" :
                    "text-slate-500 bg-slate-100 dark:bg-slate-700"
                  }`}>
                    {order.paymentStatus === "PAID" ? "Paid" : order.paymentStatus === "PARTIALLY_PAID" ? "Partially Paid" : "Unpaid"}
                  </span>
                )}
              </div>
            )}

            {/* Quote Items */}
            <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.08] overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-white/[0.06]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Items</p>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {(quote.items || []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.productName}</p>
                      <p className="text-xs text-slate-400">{item.quantity}x @ {formatCurrency(item.unitPrice, quote.currency)}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatCurrency(item.totalPrice, quote.currency)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-2xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200/60 dark:border-brand-500/20 p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-semibold">{formatCurrency(quote.subtotal, quote.currency)}</span></div>
              {quote.discountPercent > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Discount ({quote.discountPercent}%)</span><span className="text-emerald-600 font-semibold">-{formatCurrency(quote.discountAmount, quote.currency)}</span></div>}
              {quote.taxRate > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Tax ({quote.taxRate}%)</span><span className="font-semibold">{formatCurrency(quote.taxAmount, quote.currency)}</span></div>}
              <div className="border-t border-brand-200/60 dark:border-brand-500/20 pt-2 flex justify-between">
                <span className="font-bold">Total</span><span className="text-lg font-bold text-brand-600">{formatCurrency(quote.total, quote.currency)}</span>
              </div>

              {isAccepted && (
                <>
                  <div className="border-t border-brand-200/60 dark:border-brand-500/20 pt-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Deposit ({order?.depositPercent || 50}%)</span>
                      <span className="font-bold text-amber-600">{formatCurrency(depositAmount, quote.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Remaining</span>
                      <span className="font-semibold">{formatCurrency(remainingAmount, quote.currency)}</span>
                    </div>
                  </div>

                  {/* Payment Buttons */}
                  {!isPaid && (
                    <div className="space-y-2 pt-2">
                      <button onClick={() => handlePay(true)} disabled={paypalLoading}
                        className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        {paypalLoading && paymentMode === "deposit" ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
                        {paypalLoading && paymentMode === "deposit" ? "Processing..." : `Pay Deposit (${formatCurrency(depositAmount, quote.currency)})`}
                      </button>
                      <button onClick={() => handlePay(false)} disabled={paypalLoading}
                        className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        {paypalLoading && paymentMode === "full" ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                        {paypalLoading && paymentMode === "full" ? "Processing..." : `Pay Full Amount (${formatCurrency(quote.total, quote.currency)})`}
                      </button>
                      <button onClick={handleCheckPayment} className="w-full py-2 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                        Check Payment Status
                      </button>
                    </div>
                  )}

                  {isPaid && (
                    <div className="rounded-xl bg-emerald-100 dark:bg-emerald-500/20 p-3 text-center mt-2">
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Payment Complete</p>
                    </div>
                  )}
                </>
              )}

              {!isAccepted && quote.status === "SENT" && (
                <button onClick={handleAccept} disabled={actionLoading}
                  className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50">
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {actionLoading ? "Accepting..." : "Accept Quote"}
                </button>
              )}

              {quote.status === "DRAFT" && (
                <p className="text-xs text-slate-400 text-center pt-2">This quote has not been sent yet.</p>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
