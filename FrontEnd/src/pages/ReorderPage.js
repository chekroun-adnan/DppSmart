import { useEffect, useState } from "react";
import {
  ShoppingCart, RefreshCw, Package, Calendar, Search,
  Star, X,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { getMyOrders, createOrder } from "../services/authService";

const INPUT = "h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-800/80 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";

function FieldGroup({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// ─── Reorder Date Modal ───────────────────────────────────────────────────────

function ReorderModal({ order, onClose, onReordered }) {
  const [deliveryDate, setDate] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async () => {
    if (!deliveryDate) { setError("Please select a delivery date."); return; }
    setLoading(true); setError("");
    try {
      const result = await createOrder({
        requestedDeliveryDate: deliveryDate,
        items: (order.items || []).map(it => ({ productId: it.productId, quantity: it.quantity })),
      });
      onReordered(result?.data ?? result);
    } catch (e) {
      setError(e.message || "Failed to place reorder.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/60 dark:bg-black/75 backdrop-blur-[2px] px-4 animate-fade-in">
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
          <p className="text-xs font-bold text-brand-700 dark:text-brand-300 mb-1">
            From order: <span className="font-mono">{order.orderReference}</span>
          </p>
          <div className="space-y-1 mt-2">
            {(order.items || []).map((it, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Package size={10} className="text-brand-500" /> {it.productName}
                </span>
                <span className="font-semibold">×{it.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        <FieldGroup label="Requested Delivery Date">
          <input type="date" min={today} value={deliveryDate}
            onChange={e => setDate(e.target.value)} className={INPUT} />
        </FieldGroup>

        {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary py-2 px-5 text-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary py-2 px-5 text-sm">
            {loading ? "Placing…" : "Place Reorder"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReorderPage() {
  const role = (localStorage.getItem("userRole") || "").toUpperCase();
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [reorderTarget, setReorderTarget] = useState(null);
  const [successMsg, setSuccessMsg]       = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const ords = await getMyOrders();
      const list = Array.isArray(ords) ? ords : [];
      // Only DELIVERED orders, sorted newest first
      const delivered = list
        .filter(o => o.status === "DELIVERED")
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setOrders(delivered);
    } catch (e) {
      setError(e.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  // Compute top 5 products by total quantity ordered across all delivered orders
  const topProducts = (() => {
    const map = {};
    orders.forEach(o => {
      (o.items || []).forEach(it => {
        if (!it.productName) return;
        if (!map[it.productName]) map[it.productName] = { name: it.productName, totalQty: 0, orderCount: 0 };
        map[it.productName].totalQty += (it.quantity || 0);
        map[it.productName].orderCount += 1;
      });
    });
    return Object.values(map)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5);
  })();

  // Stats
  const totalOrders  = orders.length;
  const totalItems   = orders.reduce((s, o) => s + (o.totalQuantity || 0), 0);
  const firstDate    = orders.length > 0 ? orders[orders.length - 1].createdAt : null;
  const lastDate     = orders.length > 0 ? orders[0].createdAt : null;
  const fmt = d => d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

  // Filter
  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (o.orderReference || "").toLowerCase().includes(q)
      || (o.items || []).some(it => (it.productName || "").toLowerCase().includes(q));
  });

  const handleReordered = (newOrder) => {
    setReorderTarget(null);
    setSuccessMsg("Reorder placed successfully!");
    setTimeout(() => setSuccessMsg(""), 4000);
    load();
  };

  // Only show to CLIENT role
  if (role !== "CLIENT") {
    return (
      <DashboardLayout>
        <div className="glass-card p-12 text-center">
          <ShoppingCart size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">This page is only available to clients.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:p-8 max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Order History</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <RefreshCw size={26} className="text-brand-500" /> Reorder & History
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Browse your delivered orders and quickly reorder your favorites.</p>
        </div>

        {/* Success banner */}
        {successMsg && (
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 p-4 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{successMsg}</p>
          </div>
        )}

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Delivered Orders", value: totalOrders, color: "text-brand-600 dark:text-brand-400" },
            { label: "Total Items Ordered", value: totalItems, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "First Order", value: fmt(firstDate), color: "text-slate-700 dark:text-slate-200" },
            { label: "Last Order", value: fmt(lastDate), color: "text-slate-700 dark:text-slate-200" },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
              <p className={`text-lg font-bold ${color} truncate`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Most Ordered Products */}
        {topProducts.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star size={16} className="text-amber-500" />
              <h2 className="text-xs font-extrabold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Most Ordered Products</h2>
            </div>
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-4">
                  <div className="w-6 h-6 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">#{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{p.name}</span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0 ml-2">{p.totalQty} units · {p.orderCount} orders</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-700"
                        style={{ width: `${Math.round((p.totalQty / topProducts[0].totalQty) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by order reference or product name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/60 pl-9 pr-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
          />
        </div>

        {/* Orders list */}
        {loading ? (
          <div className="glass-card rounded-3xl p-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="glass-card rounded-3xl p-8 text-center text-rose-500 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center">
            <ShoppingCart size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {search ? "No orders match your search." : "No delivered orders yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => (
              <div key={order.id} className="glass-card rounded-2xl p-5 border border-slate-200/60 dark:border-white/[0.06]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{order.orderReference}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Delivered
                      </span>
                    </div>

                    {/* Products */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(order.items || []).map((it, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg font-medium">
                          <Package size={10} /> {it.productName} ×{it.quantity}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} /> {fmt(order.requestedDeliveryDate)}
                      </span>
                      <span>Total: <strong className="text-slate-600 dark:text-slate-300">{order.totalQuantity ?? 0} units</strong></span>
                    </div>
                  </div>

                  <button
                    onClick={() => setReorderTarget(order)}
                    className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
                  >
                    <RefreshCw size={14} /> Reorder
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reorderTarget && (
        <ReorderModal
          order={reorderTarget}
          onClose={() => setReorderTarget(null)}
          onReordered={handleReordered}
        />
      )}
    </DashboardLayout>
  );
}
