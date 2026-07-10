import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign, CheckCircle2, XCircle, Eye, Loader2, AlertTriangle,
  Clock, Banknote, Search, Filter, ChevronDown, FileText
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import {
  getAdminPayments, approvePayment, rejectPayment,
  getAdminPaymentsByStatus, getPaymentStats
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

export default function AdminPaymentsPage() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const loadPayments = async (statusFilter) => {
    setLoading(true);
    setError("");
    try {
      let data;
      if (statusFilter && statusFilter !== "ALL") {
        data = await getAdminPaymentsByStatus(statusFilter);
      } else {
        data = await getAdminPayments();
      }
      setPayments(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getPaymentStats();
      setStats(data);
    } catch (e) {
      // stats are non-critical
    }
  };

  useEffect(() => {
    loadPayments(filter !== "ALL" ? filter : null);
    loadStats();
  }, []);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    loadPayments(newFilter !== "ALL" ? newFilter : null);
  };

  const handleApprove = async (paymentId) => {
    setActionLoading(paymentId);
    setError("");
    try {
      await approvePayment(paymentId);
      setSuccess("Payment approved successfully!");
      setShowDetail(false);
      loadPayments(filter !== "ALL" ? filter : null);
      loadStats();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment) return;
    setActionLoading("reject");
    setError("");
    try {
      await rejectPayment(selectedPayment.id, rejectReason);
      setSuccess("Payment rejected.");
      setShowRejectModal(false);
      setShowDetail(false);
      setSelectedPayment(null);
      setRejectReason("");
      loadPayments(filter !== "ALL" ? filter : null);
      loadStats();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const openDetail = (payment) => {
    setSelectedPayment(payment);
    setShowDetail(true);
  };

  const filteredPayments = payments.filter(p => {
    if (search) {
      const q = search.toLowerCase();
      return (p.referenceNumber && p.referenceNumber.toLowerCase().includes(q)) ||
             p.id.toLowerCase().includes(q) ||
             (p.orderId && p.orderId.toLowerCase().includes(q));
    }
    return true;
  });

  const statusCards = stats ? [
    { label: "Awaiting Proof", value: stats.pendingPayments ?? 0, tone: "amber", Icon: Clock },
    { label: "Under Review", value: stats.underReviewPayments ?? 0, tone: "sky", Icon: Eye },
    { label: "Approved", value: stats.approvedPayments ?? 0, tone: "emerald", Icon: CheckCircle2 },
    { label: "Rejected", value: stats.rejectedPayments ?? 0, tone: "rose", Icon: XCircle },
    { label: "Total Revenue", value: formatCurrency(stats.totalRevenue ?? 0), tone: "brand", Icon: DollarSign },
  ] : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Finance</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Payments</h1>
            <p className="text-sm text-slate-400">Manage and validate client payments</p>
          </div>
        </div>

        {/* Status cards */}
        {statusCards.length > 0 && (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            {statusCards.map(card => (
              <div key={card.label} className={`glass-card rounded-2xl p-4 ${card.tone === "brand" ? "ring-1 ring-brand-200 dark:ring-brand-500/20" : ""}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{card.label}</p>
                  <card.Icon size={16} className={`text-${card.tone === "brand" ? "brand" : card.tone}-500`} />
                </div>
                <p className={`text-xl font-extrabold ${card.tone === "brand" ? "text-brand-600 dark:text-brand-400" : `text-${card.tone}-600 dark:text-${card.tone}-400`}`}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Error / Success */}
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search by order, reference..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["ALL", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"].map(f => (
              <button key={f} onClick={() => handleFilterChange(f)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${filter === f ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>
                {f === "ALL" ? "All" : PAYMENT_STATUS_META[f]?.label || f}
              </button>
            ))}
          </div>
        </div>

        {/* Payments Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-16">
              <Banknote size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 font-medium">No payments found</p>
              <p className="text-xs text-slate-400 mt-1">Payments will appear here when clients submit them.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5">
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Order</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Type</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Reference</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map(p => {
                    const meta = PAYMENT_STATUS_META[p.status] || {};
                    const Icon = meta.Icon || Clock;
                    return (
                      <tr key={p.id}
                        className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        onClick={() => openDetail(p)}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-xs font-mono">{p.orderId?.substring(0, 12)}...</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${p.paymentType === "DEPOSIT" ? "text-amber-600 bg-amber-100 dark:bg-amber-500/10" : "text-brand-600 bg-brand-100 dark:bg-brand-500/10"}`}>
                            {p.paymentType === "DEPOSIT" ? "Deposit" : "Final"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold">{formatCurrency(p.amount, p.currency)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">{p.referenceNumber || "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{formatDate(p.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${meta.cls || "text-slate-500 bg-slate-100"}`}>
                            <Icon size={12} /> {meta.label || p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.status === "UNDER_REVIEW" && (
                            <div className="flex gap-2 justify-end" onClick={e => e.stopPropagation()}>
                              <button onClick={() => { setSelectedPayment(p); setShowRejectModal(true); }}
                                className="px-3 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[10px] font-bold hover:bg-rose-200 dark:hover:bg-rose-500/20 transition-colors">
                                Reject
                              </button>
                              <button onClick={() => handleApprove(p.id)}
                                disabled={actionLoading === p.id}
                                className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition-colors flex items-center gap-1">
                                {actionLoading === p.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                Approve
                              </button>
                            </div>
                          )}
                          {p.paymentProofUrl && (
                            <a href={p.paymentProofUrl} target="_blank" rel="noopener noreferrer"
                              className="text-brand-600 hover:text-brand-700 text-[10px] font-bold flex items-center gap-1 justify-end mt-1"
                              onClick={e => e.stopPropagation()}>
                              <Eye size={12} /> View Proof
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment Detail Modal */}
        {showDetail && selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowDetail(false)}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl"
              onClick={e => e.stopPropagation()}>
              <h2 className="font-bold text-lg mb-4">Payment Details</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Order ID</span>
                  <span className="font-mono text-xs">{selectedPayment.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount</span>
                  <span className="font-bold">{formatCurrency(selectedPayment.amount, selectedPayment.currency)}</span>
                </div>
                {selectedPayment.referenceNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reference</span>
                    <span className="font-mono">{selectedPayment.referenceNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Method</span>
                  <span>{selectedPayment.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${(PAYMENT_STATUS_META[selectedPayment.status] || {}).cls || ""}`}>
                    {(PAYMENT_STATUS_META[selectedPayment.status] || {}).label || selectedPayment.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Submitted</span>
                  <span>{formatDate(selectedPayment.createdAt)}</span>
                </div>
                {selectedPayment.validatedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Validated</span>
                    <span>{formatDate(selectedPayment.validatedAt)}</span>
                  </div>
                )}
                {selectedPayment.notes && (
                  <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                    <span className="text-slate-400 block mb-1">Notes</span>
                    <p className="text-slate-600 dark:text-slate-300">{selectedPayment.notes}</p>
                  </div>
                )}
                {selectedPayment.paymentProofUrl && (
                  <div className="pt-2">
                    <a href={selectedPayment.paymentProofUrl} target="_blank" rel="noopener noreferrer"
                      className="text-brand-600 hover:text-brand-700 text-sm font-bold flex items-center gap-2">
                      <Eye size={16} /> View Payment Proof
                    </a>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowDetail(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Close
                </button>
                {selectedPayment.status === "UNDER_REVIEW" && (
                  <>
                    <button onClick={() => { setShowDetail(false); setSelectedPayment(selectedPayment); setShowRejectModal(true); }}
                      className="flex-1 py-2.5 rounded-xl bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 text-sm font-bold hover:bg-rose-200 dark:hover:bg-rose-500/20 transition-colors">
                      Reject
                    </button>
                    <button onClick={() => { handleApprove(selectedPayment.id); }}
                      disabled={actionLoading === selectedPayment.id}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-sm font-bold hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1">
                      {actionLoading === selectedPayment.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowRejectModal(false)}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl"
              onClick={e => e.stopPropagation()}>
              <h2 className="font-bold text-lg mb-2">Reject Payment</h2>
              <p className="text-sm text-slate-500 mb-4">
                Provide a reason for rejecting this payment of {formatCurrency(selectedPayment.amount, selectedPayment.currency)}.
                The client will be notified and can resubmit.
              </p>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none mb-4" />
              <div className="flex gap-3">
                <button onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Cancel
                </button>
                <button onClick={handleReject}
                  disabled={actionLoading === "reject" || !rejectReason.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition-colors flex items-center justify-center gap-1 disabled:bg-rose-300">
                  {actionLoading === "reject" ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  Reject Payment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
