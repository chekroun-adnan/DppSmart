import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { getMyInvoices, fetchInvoicePdfBlob } from "../services/authService";
import { FileText, Download, AlertTriangle, Loader } from "lucide-react";

const CARD = "bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/[0.06] p-5";

const STATUS_STYLES = {
  DRAFT: "text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400",
  SENT: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  PARTIALLY_PAID: "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
  PAID: "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  OVERDUE: "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  CANCELLED: "text-slate-500 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400",
};

function fmtPrice(v) {
  if (v == null) return "$0.00";
  return "$" + Number(v).toFixed(2);
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyInvoices();
        setInvoices(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e?.message || "Failed to load invoices.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePreviewPdf = async (id) => {
    const token = localStorage.getItem("accessToken");
    const apiBase = process.env.REACT_APP_API_URL || "http://localhost:8080";
    const pdfUrl = `${apiBase}/api/billing/invoices/${encodeURIComponent(id)}/pdf?token=${encodeURIComponent(token || "")}`;
    window.open(pdfUrl, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-500" /> My Invoices
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            View and download your invoices
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div className={CARD}>
            <div className="text-center py-12 text-sm text-slate-400">Loading invoices...</div>
          </div>
        ) : invoices.length === 0 ? (
          <div className={CARD}>
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-400">No invoices found</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div key={inv.id} className={`${CARD} flex items-center justify-between flex-wrap gap-3`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {inv.invoiceNumber || inv.id?.slice(0, 8)}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_STYLES[inv.status] || ""}`}>
                      {inv.status || "DRAFT"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <p>Issued: {fmtDate(inv.issueDate)} &middot; Due: {fmtDate(inv.dueDate)}</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      Total: {fmtPrice(inv.total)}
                      {inv.amountPaid > 0 && (
                        <span className="text-green-600 ml-2">
                          (Paid: {fmtPrice(inv.amountPaid)})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handlePreviewPdf(inv.id)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0"
                >
                  {pdfLoading ? <Loader size={14} className="animate-spin" /> : <Download size={14} />} PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
