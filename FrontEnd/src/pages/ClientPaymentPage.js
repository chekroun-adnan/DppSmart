import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CreditCard, DollarSign, ArrowLeft, CheckCircle, XCircle, Loader2 } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { getClientInvoice, createPaymentSession, getPaymentMethods, getMyOrders } from "../services/authService";

const GATEWAY_META = {
  PAYPAL: { label: "PayPal", icon: DollarSign, desc: "Pay with your PayPal account" },
  CMI:    { label: "Carte Bancaire (CMI)", icon: CreditCard, desc: "Pay by credit card via CMI" },
  M2T:    { label: "Maroc Telecommerce", icon: CreditCard, desc: "Pay by credit card via M2T" },
};

function formatCurrency(amount, currency = "MAD") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
}

export default function ClientPaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get("invoiceId");

  const [invoice, setInvoice] = useState(null);
  const [methods, setMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!invoiceId) { setLoading(false); return; }
    Promise.all([
      getClientInvoice(invoiceId),
      getPaymentMethods(),
    ]).then(([inv, meth]) => {
      setInvoice(inv);
      setMethods(meth?.methods || meth || []);
      if (meth?.methods?.length) setSelectedMethod(meth.methods[0]);
    }).catch(e => setError(e.message))
    .finally(() => setLoading(false));
  }, [invoiceId]);

  const handlePay = async () => {
    if (!selectedMethod || !invoiceId) return;
    setProcessing(true);
    setError("");
    try {
      const base = window.location.origin;
      const session = await createPaymentSession({
        invoiceId,
        paymentMethod: selectedMethod,
        successUrl: `${base}/payments/return?method=${selectedMethod}&status=success`,
        cancelUrl: `${base}/payments/return?method=${selectedMethod}&status=cancel`,
      });

      if (session.redirectUrl) {
        window.location.href = session.redirectUrl;
      } else if (session.formHtml) {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(session.formHtml);
          win.document.close();
        }
      } else {
        setResult({ success: true });
      }
    } catch (e) {
      setError(e.message || "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  if (result) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto mt-20 p-6">
          <div className="rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 p-8 text-center">
            <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4" />
            <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-300">Payment Successful</h2>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">Your payment has been processed.</p>
            <button onClick={() => navigate("/my-orders")} className="btn-primary mt-6 py-2 px-5 text-sm">
              Back to Orders
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto mt-10 p-4 sm:p-6 space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-brand-600 transition-colors">
          <ArrowLeft size={14} /> Back
        </button>

        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Payment</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Choose your payment method</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-brand-600" size={24} /></div>
        ) : error ? (
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-500/20 p-4">
            <p className="text-sm font-medium text-rose-600">{error}</p>
          </div>
        ) : !invoiceId ? (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 p-4">
            <p className="text-sm text-amber-700 dark:text-amber-300">No invoice selected. Please select an invoice to pay.</p>
          </div>
        ) : (
          <>
            {invoice && (
              <div className="rounded-2xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200/60 dark:border-brand-500/20 p-4 space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">Invoice #{invoice.invoiceNumber}</p>
                <p className="text-2xl font-bold text-brand-700 dark:text-brand-300">
                  {formatCurrency(invoice.total, invoice.currency)}
                </p>
                <p className="text-xs text-slate-400">Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("fr-FR") : "—"}</p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Payment Method</p>
              {methods.map(m => {
                const meta = GATEWAY_META[m] || { label: m, icon: CreditCard, desc: "" };
                const Icon = meta.icon;
                return (
                  <button key={m} onClick={() => setSelectedMethod(m)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                      selectedMethod === m
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10 dark:border-brand-400"
                        : "border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <Icon size={20} className={selectedMethod === m ? "text-brand-600" : "text-slate-400"} />
                    <div>
                      <p className={`text-sm font-semibold ${selectedMethod === m ? "text-brand-700 dark:text-brand-300" : "text-slate-700 dark:text-slate-200"}`}>
                        {meta.label}
                      </p>
                      <p className="text-xs text-slate-400">{meta.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <button onClick={handlePay} disabled={processing || !selectedMethod}
              className="w-full py-3 rounded-2xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
              {processing ? "Processing..." : `Pay ${invoice ? formatCurrency(invoice.total, invoice.currency) : ""}`}
            </button>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
