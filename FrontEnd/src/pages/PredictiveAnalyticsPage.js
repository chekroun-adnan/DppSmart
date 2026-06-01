import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import OrgSelector from "../components/OrgSelector";
import { getPredictiveAnalysis } from "../services/authService";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { motion } from "framer-motion";

const STATUS_COLORS = {
  PENDING: "#f59e0b",
  IN_PROGRESS: "#6366f1",
  COMPLETED: "#22c55e",
  CANCELLED: "#ef4444",
  DELAYED: "#f97316",
  APPROVED: "#10b981",
  DECLINED: "#ef4444",
  DELIVERED: "#22c55e",
  SHIPPED: "#6366f1",
  PROCESSING: "#8b5cf6",
};

export default function PredictiveAnalyticsPage() {
  const [selectedOrgId, setSelectedOrgId] = useState(() => localStorage.getItem("orgId") || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!selectedOrgId) { setData(null); return; }
    let mounted = true;
    setLoading(true);
    setError("");
    setData(null);
    getPredictiveAnalysis(selectedOrgId)
      .then((res) => { if (mounted) setData(res?.data || res); })
      .catch((e) => { if (mounted) setError(e.message || "Failed to load predictive analysis."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [selectedOrgId]);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "realdata", label: "Real Data" },
    { id: "forecasts", label: "Forecasts" },
    { id: "risk", label: "Risk Scores" },
    { id: "anomalies", label: "Anomalies" },
    { id: "trends", label: "Trends" },
  ];

  const severityColor = (s) => {
    switch (s) {
      case "CRITICAL": return { text: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/40", border: "border-rose-200 dark:border-rose-800" };
      case "HIGH": return { text: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/40", border: "border-orange-200 dark:border-orange-800" };
      case "MEDIUM": return { text: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-800" };
      case "LOW": return { text: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-800" };
      default: return { text: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-800/40", border: "border-slate-200 dark:border-slate-700" };
    }
  };

  const riskColor = (val) => {
    if (val >= 75) return "#ef4444";
    if (val >= 50) return "#f97316";
    if (val >= 25) return "#eab308";
    return "#22c55e";
  };

  const anomalyIcon = (type) => {
    if (type === "SCAN_SPIKE") return "M9 19v-6a2 2 0 00-4 0V9a2 2 0 014 0v6m-6 0h6";
    if (type === "PRODUCTION_DELAY") return "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z";
    if (type === "STOCK_OUT") return "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4";
    if (type === "LOW_STOCK") return "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z";
    return "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z";
  };

  const rd = data?.realData;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">AI-Powered</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Predictive Analytics</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Real data + AI-driven forecasts, risk scores, and anomaly detection.</p>
          </div>
          {data && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">
              <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
              Live Data
            </span>
          )}
        </div>

        <OrgSelector value={selectedOrgId} onChange={setSelectedOrgId} />

        {selectedOrgId && (
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-fit overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        {!selectedOrgId && (
          <div className="glass-card py-16 text-center">
            <svg className="mx-auto w-10 h-10 text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            <p className="text-sm font-semibold text-slate-500">Select an organization above to view predictive analytics.</p>
          </div>
        )}

        {loading && (
          <div className="glass-card flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Running predictive analysis...</p>
          </div>
        )}

        {data && !loading && activeTab === "overview" && (
          <div className="space-y-5">
            <div className="glass-card p-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Executive Summary</h2>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{data.summary}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total Scans" value={rd?.totalScans || 0} sub={`${rd?.scansLast7Days || 0} this week`} color="#6366f1" />
              <StatCard label="Total Orders" value={rd?.totalOrders || 0} sub={`${rd?.ordersLast7Days || 0} this week`} color="#10b981" />
              <StatCard label="Productions" value={rd?.totalProductions || 0} sub={`${rd?.productionsLast7Days || 0} this week`} color="#f59e0b" />
              <StatCard label="Low Stock" value={rd?.lowStockCount || 0} sub={`${rd?.criticalStockCount || 0} out of stock`} color={(rd?.criticalStockCount || 0) > 0 ? "#ef4444" : "#eab308"} />
            </div>

            {data.keyInsights?.length > 0 && (
              <div className="glass-card p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Key Insights</h2>
                <div className="space-y-3">
                  {data.keyInsights.map((insight, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-950/30">
                      <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center flex-none mt-0.5">
                        <span className="text-[10px] font-bold text-brand-600">{i + 1}</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{insight}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {data.recommendations?.length > 0 && (
              <div className="glass-card p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Recommendations</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.recommendations.map((rec, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.06]">
                      <p className="text-sm text-slate-700 dark:text-slate-200">{rec}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {data.riskScore && (
              <div className="glass-card p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">Risk Score Overview</h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {[
                    { label: "Overall", val: data.riskScore.overall },
                    { label: "Supply Chain", val: data.riskScore.supplyChain },
                    { label: "Production", val: data.riskScore.production },
                    { label: "Stock", val: data.riskScore.stock },
                    { label: "Market Demand", val: data.riskScore.marketDemand },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className="relative w-16 h-16">
                        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                          <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                          <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={riskColor(item.val)} strokeWidth="3" strokeDasharray={`${item.val}, 100`} strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-slate-700 dark:text-slate-200">{item.val}</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {data && !loading && activeTab === "realdata" && rd && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total Scans" value={rd.totalScans || 0} sub="All time" color="#6366f1" />
              <StatCard label="Scans (30d)" value={rd.scansLast30Days || 0} sub={`${rd.scansLast7Days || 0} this week`} color="#8b5cf6" />
              <StatCard label="Unique Products Scanned" value={rd.uniqueProductsScanned || 0} sub={`of ${rd.totalProducts || 0} total`} color="#a78bfa" />
              <StatCard label="Products" value={rd.totalProducts || 0} sub="In catalog" color="#7c3aed" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total Orders" value={rd.totalOrders || 0} sub="All time" color="#10b981" />
              <StatCard label="Orders (30d)" value={rd.ordersLast30Days || 0} sub={`${rd.ordersLast7Days || 0} this week`} color="#059669" />
              <StatCard label="Total Productions" value={rd.totalProductions || 0} sub="All time" color="#f59e0b" />
              <StatCard label="Productions (7d)" value={rd.productionsLast7Days || 0} sub="This week" color="#d97706" />
            </div>

            {rd.ordersByStatus && Object.keys(rd.ordersByStatus).length > 0 && (
              <div className="glass-card p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Orders by Status</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={Object.entries(rd.ordersByStatus).map(([name, value]) => ({ name, value }))} margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" darkStroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12 }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                      {Object.entries(rd.ordersByStatus).map(([key], i) => (
                        <Cell key={i} fill={STATUS_COLORS[key] || "#6366f1"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {rd.productionsByStatus && Object.keys(rd.productionsByStatus).length > 0 && (
              <div className="glass-card p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Productions by Status</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={Object.entries(rd.productionsByStatus).map(([name, value]) => ({ name, value }))} margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" darkStroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12 }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                      {Object.entries(rd.productionsByStatus).map(([key], i) => (
                        <Cell key={i} fill={STATUS_COLORS[key] || "#f59e0b"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {rd.topScannedProducts && Object.keys(rd.topScannedProducts).length > 0 && (
              <div className="glass-card p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Most Scanned Products</h2>
                <div className="space-y-2">
                  {Object.entries(rd.topScannedProducts).slice(0, 8).map(([productId, count], i) => {
                    const maxCount = Object.values(rd.topScannedProducts)[0];
                    return (
                      <div key={productId} className="flex items-center gap-3">
                        <span className="w-5 text-xs font-bold text-slate-400 text-right">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-mono text-slate-700 dark:text-slate-200 truncate max-w-[200px]" title={productId}>{productId}</span>
                            <span className="text-xs font-bold text-brand-600 ml-2">{count} scans</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(count / maxCount) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.05 }}
                              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-indigo-500" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {rd.lowStockItems && rd.lowStockItems.length > 0 && (
              <div className="glass-card p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                  Low Stock Items ({rd.lowStockCount || rd.lowStockItems.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.18em] text-slate-400 border-b border-slate-100 dark:border-white/[0.06]">
                        <th className="pb-3 pr-4 font-bold">#</th>
                        <th className="pb-3 pr-4 font-bold">Name</th>
                        <th className="pb-3 pr-4 font-bold text-right">Current Qty</th>
                        <th className="pb-3 pr-4 font-bold text-right">Threshold</th>
                        <th className="pb-3 font-bold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                      {rd.lowStockItems.map((item, i) => (
                        <tr key={item.id || i}>
                          <td className="py-3 pr-4 text-slate-300">{i + 1}</td>
                          <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">{item.name || item.id || "—"}</td>
                          <td className="py-3 pr-4 text-right font-bold text-rose-600">{item.quantity}</td>
                          <td className="py-3 pr-4 text-right text-slate-500">{item.threshold}</td>
                          <td className="py-3 text-right">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.quantity === 0 ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"}`}>
                              {item.quantity === 0 ? "OUT OF STOCK" : "LOW STOCK"}
                            </span>
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

        {data && !loading && activeTab === "forecasts" && (
          <div className="space-y-5">
            <div className="glass-card p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">AI Forecasts</h2>
              {data.forecasts?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {data.forecasts.map((f, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                      className="p-5 rounded-2xl bg-gradient-to-br from-brand-50 to-indigo-50 dark:from-brand-900/20 dark:to-indigo-900/20 border border-brand-100 dark:border-brand-800/30">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-500">{f.label}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 font-bold">{f.period}</span>
                      </div>
                      <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{f.value}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-brand-200 dark:bg-brand-700/50 overflow-hidden">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${(f.confidence || 0) * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-brand-500">{Math.round((f.confidence || 0) * 100)}% conf.</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No forecast data available.</p>
              )}
            </div>
          </div>
        )}

        {data && !loading && activeTab === "risk" && (
          <div className="space-y-5">
            <div className="glass-card p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">Detailed Risk Scores</h2>
              {data.riskScore ? (
                <div className="space-y-4">
                  {[
                    { label: "Overall Risk", val: data.riskScore.overall },
                    { label: "Supply Chain Risk", val: data.riskScore.supplyChain },
                    { label: "Production Risk", val: data.riskScore.production },
                    { label: "Stock Risk", val: data.riskScore.stock },
                    { label: "Market Demand Risk", val: data.riskScore.marketDemand },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-36 text-xs font-semibold text-slate-600 dark:text-slate-300">{item.label}</div>
                      <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${item.val}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
                          className="h-full rounded-full" style={{ backgroundColor: riskColor(item.val) }} />
                      </div>
                      <div className="w-10 text-right text-xs font-bold text-slate-600 dark:text-slate-300">{item.val}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No risk data available.</p>
              )}
            </div>
          </div>
        )}

        {data && !loading && activeTab === "anomalies" && (
          <div className="space-y-5">
            <div className="glass-card p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">
                Detected Anomalies ({data.anomalies?.length || 0})
              </h2>
              {data.anomalies?.length > 0 ? (
                <div className="space-y-3">
                  {data.anomalies.map((a, i) => {
                    const sc = severityColor(a.severity);
                    return (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                        className={`flex items-start gap-4 p-4 rounded-xl border ${sc.bg} ${sc.border}`}>
                        <div className={`w-9 h-9 rounded-xl ${sc.bg} flex items-center justify-center flex-none mt-0.5`}>
                          <svg className={`w-5 h-5 ${sc.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={anomalyIcon(a.type)} /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-bold">{a.type?.replace(/_/g, " ")}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text} border ${sc.border}`}>{a.severity}</span>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-200">{a.description}</p>
                          {a.affectedEntity && (
                            <p className="text-[10px] font-mono text-slate-400 mt-1">Entity: {a.affectedEntity}</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-500 mb-1">No anomalies detected.</p>
                  <p className="text-xs text-slate-400">All systems operating normally.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {data && !loading && activeTab === "trends" && (
          <div className="space-y-5">
            {data.trendData?.scansTrend?.length > 0 && (
              <div className="glass-card p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Scans Trend (30 Days)</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.trendData.scansTrend} margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scanGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" darkStroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12 }}
                      labelFormatter={(v) => new Date(v).toLocaleDateString(undefined, { dateStyle: "medium" })} />
                    <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#scanGrad2)" dot={false} name="Actual" />
                    <Area type="monotone" dataKey="predicted" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 5" fill="none" dot={false} name="7d Avg" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {data.trendData?.ordersTrend?.length > 0 && (
              <div className="glass-card p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Orders Trend (30 Days)</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.trendData.ordersTrend} margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="orderGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" darkStroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12 }}
                      labelFormatter={(v) => new Date(v).toLocaleDateString(undefined, { dateStyle: "medium" })} />
                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#orderGrad2)" dot={false} name="Actual" />
                    <Area type="monotone" dataKey="predicted" stroke="#6ee7b7" strokeWidth={2} strokeDasharray="5 5" fill="none" dot={false} name="7d Avg" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {data.trendData?.productionTrend?.length > 0 && (
              <div className="glass-card p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Productions Trend (30 Days)</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.trendData.productionTrend} margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="prodGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" darkStroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12 }}
                      labelFormatter={(v) => new Date(v).toLocaleDateString(undefined, { dateStyle: "medium" })} />
                    <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} fill="url(#prodGrad2)" dot={false} name="Actual" />
                    <Area type="monotone" dataKey="predicted" stroke="#fcd34d" strokeWidth={2} strokeDasharray="5 5" fill="none" dot={false} name="7d Avg" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {!data.trendData?.scansTrend?.length && !data.trendData?.ordersTrend?.length && !data.trendData?.productionTrend?.length && (
              <div className="glass-card py-12 text-center">
                <p className="text-sm text-slate-500">No trend data available.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      </div>
      <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}