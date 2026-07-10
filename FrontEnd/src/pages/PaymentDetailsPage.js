import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, DollarSign, Building2, FileText, CheckCircle2,
  Loader2, AlertTriangle, Upload, Banknote, XCircle, Clock,
  Eye, Percent
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import {
  getMyOrders, getQuotes, getOrderPayments, initiatePayment,
  uploadPaymentProof, getBankDetails
} from "../services/authService";

const PAYMENT_STATUS_META = {
  PENDING:       { label: "Awaiting Proof", cls: "text-amber-600 bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400", Icon: Clock },
  UNDER_REVIEW:  { label: "Under Review",   cls: "text-sky-600 bg-sky-100 dark:bg-sky-500/10 dark:text-sky-400",   Icon: Eye },
  APPROVED:      { label: "Approved",       cls: "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400", Icon: CheckCircle2 },
  REJECTED:      { label: "Rejected",       cls: "text-rose-600 bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400",   Icon: XCircle },
};

function formatCurrency(amount, currency = "MAD") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

export default function PaymentDetailsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState(null);
  const [quote, setQuote] = useState(null);
  const [payments, setPayments] = useState([]);
  const [bankDetails, setBankDetails] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState("");

  const loadData = async () => {
    if (!orderId) { setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const [ordersList, paymentsList] = await Promise.all([
        getMyOrders(),
        getOrderPayments(orderId),
      ]);
      const foundOrder = Array.isArray(ordersList) ? ordersList.find(o => o.id === orderId) : null;
      setOrder(foundOrder);
      setPayments(Array.isArray(paymentsList) ? paymentsList : []);

      if (foundOrder?.quoteId) {
        const quotes = await getQuotes();
        const foundQuote = Array.isArray(quotes) ? quotes.find(q => q.id === foundOrder.quoteId) : null;
        setQuote(foundQuote);
      }

      if (foundOrder?.organizationId) {
        const bank = await getBankDetails(foundOrder.organizationId);
        setBankDetails(bank);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [orderId]);

  const depositPayment = payments.find(p => p.paymentType === "DEPOSIT");
  const finalPayment = payments.find(p => p.paymentType === "FINAL");
  const awaitingDeposit = order?.status === "AWAITING_DEPOSIT" || order?.status === "DEPOSIT_UNDER_REVIEW";
  const awaitingFinal = order?.status === "FINAL_PAYMENT_PENDING" || order?.status === "READY_FOR_DELIVERY";
  const isDepositApproved = order?.paymentStatus === "PARTIALLY_PAID" || order?.paymentStatus === "PAID";
  const isFullyPaid = order?.paymentStatus === "PAID";

  const handleInitiateDeposit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const payment = await initiatePayment(orderId, "BANK_TRANSFER", "DEPOSIT", order?.depositAmount, order?.currency);
      setSuccess("Deposit payment initiated. Please transfer the amount and upload your proof.");
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitiateFinal = async () => {
    setSubmitting(true);
    setError("");
    try {
      const payment = await initiatePayment(orderId, "BANK_TRANSFER", "FINAL", order?.remainingBalance, order?.currency);
      setSuccess("Final payment initiated. Please transfer the remaining balance and upload your proof.");
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ["image/png", "image/jpg", "image/jpeg", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        setError("Only PNG, JPG, JPEG, and PDF files are allowed.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be under 10MB.");
        return;
      }
      setSelectedFile(file);
      setError("");
    }
  };

  const handleUpload = async (paymentId) => {
    if (!selectedFile) { setError("Please select a file."); return; }
    setSubmitting(true);
    setError("");
    try {
      await uploadPaymentProof(paymentId, selectedFile, referenceNumber);
      setSuccess("Payment proof uploaded successfully! It is now under review.");
      setSelectedFile(null);
      setReferenceNumber("");
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!orderId) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto text-center py-20">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold">No order selected</h2>
          <p className="text-slate-500 mt-2">Please select an order from your orders page.</p>
          <button onClick={() => navigate("/client-orders")}
            className="mt-4 btn-primary">Go to Orders</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <button onClick={() => navigate("/client-orders")}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
          <ArrowLeft size={16} /> Back to Orders
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Payment</h1>
            <p className="text-sm text-slate-500">Order {order?.orderReference || orderId}</p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-4 text-sm text-rose-700 dark:text-rose-300 flex items-start gap-3">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-4 text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-3">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> {success}
          </div>
        )}

        {/* Payment Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</p>
            <p className="text-2xl font-extrabold mt-1">{formatCurrency(order?.totalPrice, order?.currency)}</p>
          </div>
          <div className="glass-card rounded-2xl p-5 ring-1 ring-amber-200 dark:ring-amber-500/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Deposit ({order?.depositPercent || 30}%)</p>
            <p className="text-2xl font-extrabold mt-1 text-amber-600">{formatCurrency(order?.depositAmount, order?.currency)}</p>
            {depositPayment?.status === "APPROVED" && (
              <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1"><CheckCircle2 size={12} /> Approved</p>
            )}
          </div>
          <div className="glass-card rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Remaining</p>
            <p className="text-2xl font-extrabold mt-1">{formatCurrency(order?.remainingBalance, order?.currency)}</p>
            {isFullyPaid && (
              <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1"><CheckCircle2 size={12} /> Paid in full</p>
            )}
          </div>
        </div>

        {/* Bank Details */}
        {bankDetails && bankDetails.bankName && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={18} className="text-slate-500" />
              <h2 className="font-bold">Bank Information</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Bank Name</p>
                <p className="font-medium mt-1">{bankDetails.bankName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Account Holder</p>
                <p className="font-medium mt-1">{bankDetails.accountHolder}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Account Number</p>
                <p className="font-medium mt-1 font-mono">{bankDetails.accountNumber}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">IBAN</p>
                <p className="font-medium mt-1 font-mono text-xs">{bankDetails.iban}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">SWIFT / BIC</p>
                <p className="font-medium mt-1 font-mono">{bankDetails.swiftCode}</p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 text-sm text-amber-700 dark:text-amber-300">
          <p className="font-bold">Payment Instructions</p>
          <p className="mt-1">Transfer the exact amount using your bank. Upload a PDF or image of the transfer confirmation/receipt. Your payment will be reviewed by our team.</p>
        </div>

        {/* ===== Deposit Payment Section ===== */}
        {awaitingDeposit && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Percent size={18} className="text-amber-500" />
              <h2 className="font-bold">Deposit Payment ({order?.depositPercent || 30}%)</h2>
            </div>
            {renderPaymentSection(depositPayment, "DEPOSIT", handleInitiateDeposit, handleUpload)}
          </div>
        )}

        {/* ===== Final Payment Section ===== */}
        {awaitingFinal && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={18} className="text-brand-500" />
              <h2 className="font-bold">Final Payment</h2>
            </div>
            {renderPaymentSection(finalPayment, "FINAL", handleInitiateFinal, handleUpload)}
          </div>
        )}

        {/* Quote Summary */}
        {quote && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={18} className="text-slate-500" />
              <h2 className="font-bold">Quote Summary</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Quote #{quote.quoteNumber}</span>
                <span>{formatCurrency(quote.subtotal, quote.currency)}</span>
              </div>
              {quote.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Discount ({quote.discountPercent}%)</span>
                  <span className="text-rose-500">-{formatCurrency(quote.discountAmount, quote.currency)}</span>
                </div>
              )}
              {quote.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Tax ({quote.taxRate}%)</span>
                  <span>{formatCurrency(quote.taxAmount, quote.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2 border-t border-slate-100 dark:border-white/5">
                <span>Total</span>
                <span>{formatCurrency(quote.total, quote.currency)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );

  function renderPaymentSection(payment, type, onInitiate, onUpload) {
    const isPending = payment?.status === "PENDING";
    const isUnderReview = payment?.status === "UNDER_REVIEW";
    const isApproved = payment?.status === "APPROVED";
    const isRejected = payment?.status === "REJECTED";

    if (!payment) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-slate-500 mb-4">Initiate the payment to see bank details and upload proof.</p>
          <button onClick={onInitiate} disabled={submitting}
            className="btn-primary py-3 px-6 text-sm font-bold flex items-center gap-2 mx-auto">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign size={16} />}
            Initiate {type === "DEPOSIT" ? "Deposit" : "Final"} Payment
          </button>
        </div>
      );
    }

    if (isApproved) {
      return (
        <div className="text-center py-4">
          <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
          <p className="font-bold text-emerald-600">{type === "DEPOSIT" ? "Deposit" : "Final Payment"} Approved</p>
        </div>
      );
    }

    if (isUnderReview) {
      return (
        <div className="text-center py-4">
          <Eye size={32} className="mx-auto text-sky-500 mb-2" />
          <p className="font-bold">{type === "DEPOSIT" ? "Deposit" : "Payment"} Under Review</p>
          <p className="text-sm text-slate-500 mt-1">Your proof has been submitted. We'll review it shortly.</p>
          <button onClick={loadData} className="mt-3 text-sm text-brand-600 font-medium flex items-center gap-1 mx-auto">
            <Loader2 size={14} className="animate-spin" /> Refresh Status
          </button>
        </div>
      );
    }

    if (isRejected) {
      return (
        <div className="text-center py-4">
          <XCircle size={32} className="mx-auto text-rose-500 mb-2" />
          <p className="font-bold text-rose-600">Payment Rejected</p>
          {payment.notes && <p className="text-sm text-rose-500 mt-1">Reason: {payment.notes}</p>}
          <button onClick={onInitiate} className="mt-3 btn-primary py-2 px-4 text-sm">
            Try Again
          </button>
        </div>
      );
    }

    // PENDING state — show upload form
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
            Reference Number (optional)
          </label>
          <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)}
            placeholder="e.g., Transfer #12345"
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
            Upload Proof of Payment
          </label>
          <div className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-6 text-center hover:border-brand-400 transition-colors cursor-pointer"
            onClick={() => document.getElementById("proof-upload-" + type).click()}>
            {selectedFile ? (
              <div className="text-sm">
                <FileText size={24} className="mx-auto text-brand-600 mb-2" />
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-slate-400 text-xs mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div>
                <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">Click to upload PDF, PNG, or JPG</p>
                <p className="text-xs text-slate-400 mt-1">Max 10MB</p>
              </div>
            )}
            <input id={"proof-upload-" + type} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange}
              className="hidden" />
          </div>
        </div>
        <button onClick={() => onUpload(payment.id)} disabled={!selectedFile || submitting}
          className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload size={16} />}
          Submit Payment Proof
        </button>
      </div>
    );
  }
}
