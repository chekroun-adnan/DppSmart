import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "../components/DashboardLayout";
import OrgSelector from "../components/OrgSelector";
import {
  getEmployees,
  getMyOrganizations,
  getOrders,
  getProductions,
  getScansByOrg,
  getTasks,
  getAvailableProducts as getProducts,
} from "../services/authService";
import {
  AreaChart, Area,   LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from "recharts";
import {
  jsPDF } from "jspdf";
import "jspdf-autotable";

// ─── Chart Configuration ────────────────────────────────────────────────────
const CHART_COLORS = {
  brand: "#4d7aff",
  emerald: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  purple: "#8b5cf6",
  sky: "#0ea5e9",
  rose: "#f43f5e",
  orange: "#f97316",
  slate: "#64748b",
};

const DONUT_COLORS = [
  CHART_COLORS.emerald, CHART_COLORS.brand, CHART_COLORS.amber,
  CHART_COLORS.purple, CHART_COLORS.sky, CHART_COLORS.rose,
];

// ─── Time Range ───────────────────────────────────────────────────────────────
const TIME_RANGES = [
  { key: "7d",  label: "7 Days",   days: 7   },
  { key: "30d", label: "30 Days",  days: 30  },
  { key: "90d", label: "90 Days",  days: 90  },
  { key: "all", label: "All Time", days: null },
];

function filterByTimeRange(data, dateField, days) {
  if (!days) return data;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return data.filter((item) => {
    const d = item[dateField] ? new Date(item[dateField]) : null;
    return d && d >= cutoff;
  });
}

// ─── Sparkline Chart ─────────────────────────────────────────────────────────
function Sparkline({ data, color = CHART_COLORS.brand, width = 80, height = 32 }) {
  const points = data.slice(-14).map((v, i) => ({ v: v ?? 0, i }));
  if (points.length < 2) return <div style={{ width, height }} />;
  const max = Math.max(...points.map((p) => p.v), 1);
  const min = Math.min(...points.map((p) => p.v), 0);
  const range = max - min || 1;
  const pts = points.map((p) => ({
    x: (p.i / (points.length - 1)) * width,
    y: height - ((p.v - min) / range) * height,
  }));
  const d = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = pts[i - 1];
    const cpx = (prev.x + pt.x) / 2;
    return `${acc} C ${cpx},${prev.y} ${cpx},${pt.y} ${pt.x},${pt.y}`;
  }, "");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={`${d} L ${pts[pts.length - 1].x},${height} L 0,${height} Z`}
        fill={`url(#sg-${color.replace("#", "")})`}
      />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

// ─── Animated Counter ────────────────────────────────────────────────────────
function AnimatedCounter({ value, prefix = "", suffix = "", decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = display;
    const end = typeof value === "number" ? value : parseFloat(value) || 0;
    const duration = 800;
    const startTime = performance.now();
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span>{prefix}{display.toFixed(decimals)}{suffix}</span>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ data, dataKey = "value", nameKey = "name", colors = DONUT_COLORS, size = 140, innerRadius = 50, outerRadius = 70 }) {
  void innerRadius;
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={size} height={size}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={innerRadius} outerRadius={outerRadius}
            paddingAngle={2} dataKey={dataKey} strokeWidth={0}>
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "rgba(30,41,59,0.95)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              color: "#F8FAFC",
              fontSize: 12,
              padding: "8px 12px",
            }}
            itemStyle={{ color: "#F8FAFC" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1.5">
        {data.map((d, i) => (
          <div key={d[nameKey]} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
            <span className="text-xs text-slate-500 dark:text-[#64748B]">{d[nameKey]}</span>
            <span className="text-xs font-bold text-slate-700 dark:text-[#94A3B8]">{d[dataKey]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Progress Ring ────────────────────────────────────────────────────────────
function ProgressRing({ value = 0, size = 80, strokeWidth = 6, color = CHART_COLORS.brand }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value)) / 100;
  const offset = circ * (1 - pct);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-extrabold text-slate-800 dark:text-[#F8FAFC]">{value}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Area Chart ──────────────────────────────────────────────────────────────
function AreaChartCard({ title, subtitle, data, xKey = "date", lines = [], height = 240, gradientId = "areaGrad" }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 dark:text-[#64748B] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            {lines.map((l) => (
              <linearGradient key={l.key} id={`${gradientId}-${l.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={l.color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={l.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "rgba(30,41,59,0.95)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              color: "#F8FAFC",
              fontSize: 12,
            }}
          />
          {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />}
          {lines.map((l) => (
            <Area key={l.key} type="monotone" dataKey={l.key} stroke={l.color} fill={`url(#${gradientId}-${l.key})`}
              strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────
function BarChartCard({ title, subtitle, data, bars = [], height = 220 }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 dark:text-[#64748B] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={bars.length > 4 ? 12 : 20}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "rgba(30,41,59,0.95)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              color: "#F8FAFC",
              fontSize: 12,
            }}
          />
          {bars.map((b) => (
            <Bar key={b.key} dataKey={b.key} fill={b.color} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Line Chart Card ─────────────────────────────────────────────────────────
function LineChartCard({ title, subtitle, data, xKey = "date", lines = [], height = 220 }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 dark:text-[#64748B] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "rgba(30,41,59,0.95)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              color: "#F8FAFC",
              fontSize: 12,
            }}
          />
          {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />}
          {lines.map((l) => (
            <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color}
              strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, trend, trendValue, sparkData, color = CHART_COLORS.brand, delay = 0 }) {
  const colorMap = {
    [CHART_COLORS.brand]: { bg: "bg-brand-50 dark:bg-brand-500/5", text: "text-brand-600 dark:text-brand-400", glow: "group-hover:shadow-brand-500/20" },
    [CHART_COLORS.emerald]: { bg: "bg-emerald-50 dark:bg-emerald-500/5", text: "text-emerald-600 dark:text-emerald-400", glow: "group-hover:shadow-emerald-500/20" },
    [CHART_COLORS.amber]: { bg: "bg-amber-50 dark:bg-amber-500/5", text: "text-amber-600 dark:text-amber-400", glow: "group-hover:shadow-amber-500/20" },
    [CHART_COLORS.red]: { bg: "bg-red-50 dark:bg-red-500/5", text: "text-red-600 dark:text-red-400", glow: "group-hover:shadow-red-500/20" },
    [CHART_COLORS.purple]: { bg: "bg-purple-50 dark:bg-purple-500/5", text: "text-purple-600 dark:text-purple-400", glow: "group-hover:shadow-purple-500/20" },
  };
  const c = colorMap[color] || colorMap[CHART_COLORS.brand];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.21, 1.02, 0.3, 1] }}
      className="glass-card p-5 group hover:shadow-lg transition-shadow duration-300 cursor-default"
    >
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${c.bg}`}>
          <div className="w-5 h-5 rounded-full" style={{ background: color }} />
        </div>
        {sparkData && <Sparkline data={sparkData} color={color} />}
      </div>
      <div className="mt-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#64748B]">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] mt-1">
          <AnimatedCounter value={value} />
        </p>
        {sub && <p className="text-xs text-slate-400 dark:text-[#64748B] mt-1">{sub}</p>}
        {trend !== undefined && trendValue !== undefined && (
          <div className={`flex items-center gap-1 mt-1 ${trend >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            <svg className={`w-3 h-3 ${trend >= 0 ? "" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span className="text-[10px] font-bold">{trendValue}%</span>
            <span className="text-[10px] text-slate-400 dark:text-[#64748B]">vs last period</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 dark:text-[#64748B] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Export Button ───────────────────────────────────────────────────────────
function ExportMenu({ data, timeRange }) {
  const [open, setOpen] = useState(false);

  const exportCSV = () => {
    if (!data?.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(","), ...data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("SmartTex DPP Analytics Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Time Range: ${timeRange} | Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.autoTable({ startY: 38, head: [["Metric", "Value"]], body: data.map((row) => [row.name || row.label, row.value ?? 0]), theme: "grid" });
    doc.save(`analytics-${timeRange}-${new Date().toISOString().slice(0, 10)}.pdf`);
    setOpen(false);
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.08)] bg-white dark:bg-[#1E293B] px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-[#94A3B8] hover:border-brand-300 dark:hover:border-brand-500/30 transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 top-full mt-2 w-40 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] shadow-xl z-10 overflow-hidden"
          >
            <button onClick={exportCSV} className="w-full px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#111827]/60 text-left transition-colors">
              Export CSV
            </button>
            <button onClick={exportPDF} className="w-full px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#111827]/60 text-left transition-colors border-t border-slate-100 dark:border-[rgba(255,255,255,0.06)]">
              Export PDF
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────
function Skeleton({ className }) {
  return (
    <div className={`animate-pulse bg-slate-100 dark:bg-[#1E293B] rounded-xl ${className}`} />
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState(() => localStorage.getItem("orgId") || "");
  const [timeRange, setTimeRange] = useState("30d");
  const [activeSection, setActiveSection] = useState("overview");
  const [, setOrgs] = useState([]);
  const [productions, setProductions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [scans, setScans] = useState([]);
  const [products, setProducts] = useState([]);

  const range = TIME_RANGES.find((r) => r.key === timeRange) || TIME_RANGES[1];

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const orgList = await getMyOrganizations();
        if (!mounted) return;
        setOrgs(orgList);
        const primaryOrgId = selectedOrgId || (orgList[0]?.id ?? "");
        const [prods, ords, taskList, emps, prodsList] = await Promise.all([
          getProductions(),
          getOrders(),
          getTasks(),
          getEmployees(),
          getProducts(),
        ]);
        let scanList = [];
        try { scanList = await getScansByOrg(primaryOrgId); } catch { /* no scans */ }
        if (mounted) {
          setProductions(Array.isArray(prods) ? prods : []);
          setOrders(Array.isArray(ords) ? ords : []);
          setTasks(Array.isArray(taskList) ? taskList : []);
          setEmployees(Array.isArray(emps) ? emps : []);
          setScans(Array.isArray(scanList) ? scanList : []);
          setProducts(Array.isArray(prodsList) ? prodsList : []);
        }
      } catch (e) {
        if (mounted) setError(e.message || "Failed to load analytics.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [selectedOrgId]);

  // ── Filtered Data ──────────────────────────────────────────────────────────
  const fProds = filterByTimeRange(productions, "createdAt", range.days);
  const fOrders = filterByTimeRange(orders, "createdAt", range.days);
  const fTasks = filterByTimeRange(tasks, "createdAt", range.days);
  const fScans = filterByTimeRange(scans, "scannedAt", range.days);

  // ── Production Metrics ──────────────────────────────────────────────────────
  const prodByStatus = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => ({
    name: s.replace("_", " "),
    value: fProds.filter((p) => p.status === s).length,
  }));
  const prodCompletion = fProds.length
    ? Math.round((fProds.filter((p) => p.status === "COMPLETED").length / fProds.length) * 100)
    : 0;

  // ── Order Metrics ──────────────────────────────────────────────────────────
  const orderByStatus = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"].map((s) => ({
    name: s,
    value: fOrders.filter((o) => o.status === s).length,
  }));
  const orderFulfillment = fOrders.length
    ? Math.round((fOrders.filter((o) => ["COMPLETED", "SHIPPED"].includes(o.status)).length / fOrders.length) * 100)
    : 0;

  // ── Task Metrics ───────────────────────────────────────────────────────────
  const taskByStatus = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"].map((s) => ({
    name: s.replace("_", " "),
    value: fTasks.filter((t) => t.status === s).length,
  }));
  const overdueCount = fTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && !["DONE", "CANCELLED"].includes(t.status)).length;
  const taskCompletion = fTasks.length
    ? Math.round((fTasks.filter((t) => t.status === "DONE").length / fTasks.length) * 100)
    : 0;

  // ── Compliance Metrics ─────────────────────────────────────────────────────
  const aiScores = products.map((p) => p.aiScore).filter((s) => typeof s === "number");
  const avgAiScore = aiScores.length ? Math.round(aiScores.reduce((s, v) => s + v, 0) / aiScores.length) : 0;
  const compliantProducts = aiScores.filter((s) => s >= 80).length;
  const reviewProducts = aiScores.filter((s) => s >= 40 && s < 80).length;
  const nonCompliantProducts = aiScores.filter((s) => s < 40).length;

  // ── Workforce Metrics ──────────────────────────────────────────────────────
  const avgPerf = employees.length
    ? Math.round(employees.reduce((s, e) => s + (e.performanceScore ?? 0), 0) / employees.length)
    : 0;

  // ── Time-series data ───────────────────────────────────────────────────────
  const productionTimeline = useMemo(() => {
    const map = {};
    [...fProds].forEach((p) => {
      const d = (p.createdAt ? new Date(p.createdAt) : new Date()).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!map[d]) map[d] = { date: d, planned: 0, completed: 0, cancelled: 0 };
      if (p.status === "PLANNED") map[d].planned++;
      if (p.status === "COMPLETED") map[d].completed++;
      if (p.status === "CANCELLED") map[d].cancelled++;
    });
    return Object.values(map).slice(-12);
  }, [fProds]);

  const orderTimeline = useMemo(() => {
    const map = {};
    [...fOrders].forEach((o) => {
      const d = (o.createdAt ? new Date(o.createdAt) : new Date()).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!map[d]) map[d] = { date: d, pending: 0, completed: 0 };
      if (o.status === "PENDING" || o.status === "CONFIRMED") map[d].pending++;
      if (o.status === "COMPLETED") map[d].completed++;
    });
    return Object.values(map).slice(-12);
  }, [fOrders]);

  const scanTimeline = useMemo(() => {
    const map = {};
    [...fScans].forEach((s) => {
      const d = (s.scannedAt ? new Date(s.scannedAt) : new Date()).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!map[d]) map[d] = { date: d, scans: 0 };
      map[d].scans++;
    });
    return Object.values(map).slice(-14);
  }, [fScans]);

  // ── Sparkline data ──────────────────────────────────────────────────────────
  const prodSpark = productionTimeline.map((p) => p.planned + p.completed);
  const orderSpark = orderTimeline.map((o) => o.completed);
  const scanSpark = scanTimeline.map((s) => s.scans);

  // ── Export data ─────────────────────────────────────────────────────────────
  const exportData = useMemo(() => [
    { name: "Total Productions", value: fProds.length },
    { name: "Completed Productions", value: fProds.filter((p) => p.status === "COMPLETED").length },
    { name: "Total Orders", value: fOrders.length },
    { name: "Fulfilled Orders", value: fOrders.filter((o) => ["COMPLETED", "SHIPPED"].includes(o.status)).length },
    { name: "Active Tasks", value: fTasks.filter((t) => !["DONE", "CANCELLED"].includes(t.status)).length },
    { name: "Completed Tasks", value: fTasks.filter((t) => t.status === "DONE").length },
    { name: "DPP Scans", value: fScans.length },
    { name: "DPP Compliance Score", value: avgAiScore },
    { name: "Avg Employee Score", value: avgPerf },
  ], [fProds, fOrders, fTasks, fScans, avgAiScore, avgPerf]);

  const taskTimeline = useMemo(() => {
    const map = {};
    [...fTasks].forEach((t) => {
      const d = (t.createdAt ? new Date(t.createdAt) : new Date()).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!map[d]) map[d] = { date: d, total: 0, done: 0 };
      map[d].total++;
      if (t.status === "DONE") map[d].done++;
    });
    return Object.values(map).slice(-12);
  }, [fTasks]);

  // ── Sections ────────────────────────────────────────────────────────────────
  const sections = [
    { key: "overview",    label: "Overview" },
    { key: "production", label: "Production" },
    { key: "orders",     label: "Orders" },
    { key: "compliance", label: "Compliance" },
    { key: "workforce",  label: "Workforce" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">Executive</p>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live</span>
              </div>
            </div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-[#F8FAFC]">Analytics Command Center</h1>
            <p className="mt-1 text-sm text-slate-400 dark:text-[#64748B]">Real-time KPIs, production intelligence, and operational insights.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Time Range Filter */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-[#111827]/60 p-1">
              {TIME_RANGES.map((r) => (
                <button key={r.key} onClick={() => setTimeRange(r.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${timeRange === r.key
                    ? "bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] shadow-sm"
                    : "text-slate-400 dark:text-[#64748B] hover:text-slate-600 dark:hover:text-[#94A3B8]"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <OrgSelector value={selectedOrgId} onChange={setSelectedOrgId} />
            <ExportMenu data={exportData} timeRange={range.label} />
          </div>
        </div>

        {/* ── Section Tabs ───────────────────────────────────────────────── */}
        <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-[#111827]/60 p-1 w-fit">
          {sections.map((s) => (
            <button key={s.key} onClick={() => setActiveSection(s.key)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${activeSection === s.key
                ? "bg-white dark:bg-[#1E293B] text-brand-600 dark:text-brand-400 shadow-sm"
                : "text-slate-400 dark:text-[#64748B] hover:text-slate-600 dark:hover:text-[#94A3B8]"}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </motion.div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeSection} initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}>

              {/* ── Overview ──────────────────────────────────────────────── */}
              {activeSection === "overview" && (
                <div className="space-y-6">

                  {/* KPI Strip */}
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                    <KpiCard label="Productions" value={fProds.length} sub={`${prodCompletion}% completion`} sparkData={prodSpark} color={CHART_COLORS.brand} delay={0} />
                    <KpiCard label="Orders" value={fOrders.length} sub={`${orderFulfillment}% fulfilled`} sparkData={orderSpark} color={CHART_COLORS.emerald} delay={0.05} />
                    <KpiCard label="Active Tasks" value={fTasks.filter((t) => !["DONE","CANCELLED"].includes(t.status)).length} sub={`${overdueCount} overdue`} sparkData={null} color={overdueCount > 0 ? CHART_COLORS.amber : CHART_COLORS.slate} delay={0.1} />
                    <KpiCard label="DPP Scans" value={fScans.length} sub="Scan activity" sparkData={scanSpark} color={CHART_COLORS.purple} delay={0.15} />
                    <KpiCard label="DPP Score" value={avgAiScore} sub={`${compliantProducts} compliant`} sparkData={null} color={avgAiScore >= 80 ? CHART_COLORS.emerald : CHART_COLORS.amber} delay={0.2} />
                    <KpiCard label="Workforce" value={avgPerf} suffix="/100" sub={`${employees.length} employees`} sparkData={null} color={CHART_COLORS.sky} delay={0.25} />
                  </div>

                  {/* Production & Order Trends */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    <AreaChartCard title="Production Trends" subtitle="Planned vs completed over time" data={productionTimeline}
                      lines={[
                        { key: "planned",   color: CHART_COLORS.amber,   name: "Planned" },
                        { key: "completed", color: CHART_COLORS.emerald, name: "Completed" },
                        { key: "cancelled", color: CHART_COLORS.red,    name: "Cancelled" },
                      ]} />
                    <AreaChartCard title="Order Flow" subtitle="Pending vs completed orders" data={orderTimeline}
                      lines={[
                        { key: "pending",   color: CHART_COLORS.amber,   name: "Pending" },
                        { key: "completed", color: CHART_COLORS.emerald, name: "Completed" },
                      ]} />
                  </div>

                  {/* Status Distribution */}
                  <div className="grid gap-6 xl:grid-cols-4">
                    <div className="glass-card p-5">
                      <SectionHeader title="Production Status" />
                      <div className="flex justify-center mt-2">
                        <DonutChart data={prodByStatus} colors={[CHART_COLORS.slate, CHART_COLORS.brand, CHART_COLORS.emerald, CHART_COLORS.red]} size={120} innerRadius={40} outerRadius={58} />
                      </div>
                    </div>
                    <div className="glass-card p-5">
                      <SectionHeader title="Order Pipeline" />
                      <div className="flex justify-center mt-2">
                        <DonutChart data={orderByStatus} size={120} innerRadius={40} outerRadius={58} />
                      </div>
                    </div>
                    <div className="glass-card p-5">
                      <SectionHeader title="Task Status" />
                      <div className="flex justify-center mt-2">
                        <DonutChart data={taskByStatus} colors={[CHART_COLORS.slate, CHART_COLORS.brand, CHART_COLORS.amber, CHART_COLORS.emerald, CHART_COLORS.red]} size={120} innerRadius={40} outerRadius={58} />
                      </div>
                    </div>
                    <div className="glass-card p-5 flex flex-col items-center justify-center">
                      <SectionHeader title="DPP Compliance" />
                      <ProgressRing value={avgAiScore} size={100} strokeWidth={8}
                        color={avgAiScore >= 80 ? CHART_COLORS.emerald : avgAiScore >= 50 ? CHART_COLORS.amber : CHART_COLORS.red} label="Score" />
                      <p className="text-xs text-slate-400 dark:text-[#64748B] mt-3 text-center">{compliantProducts} compliant · {nonCompliantProducts} need work</p>
                    </div>
                  </div>

                  {/* Scan Activity */}
                  <LineChartCard title="Scan Activity" subtitle="DPP scans over time" data={scanTimeline}
                    lines={[{ key: "scans", color: CHART_COLORS.purple }]} />
                </div>
              )}

              {/* ── Production ─────────────────────────────────────────────── */}
              {activeSection === "production" && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <KpiCard label="Total Batches" value={fProds.length} sub={`${prodCompletion}% completion`} color={CHART_COLORS.brand} delay={0} />
                    <KpiCard label="Completed" value={fProds.filter((p) => p.status === "COMPLETED").length} sub="Finished batches" color={CHART_COLORS.emerald} delay={0.05} />
                    <KpiCard label="In Progress" value={fProds.filter((p) => p.status === "IN_PROGRESS").length} sub="Active batches" color={CHART_COLORS.sky} delay={0.1} />
                    <KpiCard label="Cancelled" value={fProds.filter((p) => p.status === "CANCELLED").length} sub="Cancelled batches" color={CHART_COLORS.red} delay={0.15} />
                  </div>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <BarChartCard title="Production by Status" subtitle="Batch count by status" data={prodByStatus}
                      bars={[{ key: "value", color: CHART_COLORS.brand }]} />
                    <AreaChartCard title="Production Timeline" subtitle="Daily production activity" data={productionTimeline}
                      lines={[
                        { key: "planned",   color: CHART_COLORS.amber,   name: "Planned" },
                        { key: "completed", color: CHART_COLORS.emerald, name: "Completed" },
                      ]} />
                  </div>
                  <div className="grid gap-6 xl:grid-cols-3">
                    <div className="glass-card p-5">
                      <SectionHeader title="Completion Rate" />
                      <div className="flex justify-center mt-4">
                        <ProgressRing value={prodCompletion} size={110} strokeWidth={8}
                          color={prodCompletion >= 70 ? CHART_COLORS.emerald : CHART_COLORS.amber} />
                      </div>
                    </div>
                    <div className="glass-card p-5">
                      <SectionHeader title="Status Breakdown" />
                      <div className="flex flex-col gap-2.5 mt-4">
                        {prodByStatus.map((d, i) => (
                          <div key={d.name} className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: DONUT_COLORS[i] }} />
                            <span className="text-xs text-slate-500 dark:text-[#64748B] flex-1">{d.name}</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-[#94A3B8]">{d.value}</span>
                            <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-[#1E293B] overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${fProds.length ? (d.value / fProds.length) * 100 : 0}%`, background: DONUT_COLORS[i] }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="glass-card p-5">
                      <SectionHeader title="Recent Batches" />
                      <div className="flex flex-col gap-2 mt-4">
                        {fProds.slice(0, 4).map((p) => (
                          <div key={p.id} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-[#111827]/40 px-3 py-2">
                            <div>
                              <p className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0] truncate">{p.id}</p>
                              <p className="text-[10px] text-slate-400 dark:text-[#64748B]">{p.productId || "—"}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === "COMPLETED" ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : p.status === "IN_PROGRESS" ? "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" : p.status === "CANCELLED" ? "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400" : "bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400"}`}>
                              {p.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Orders ────────────────────────────────────────────────── */}
              {activeSection === "orders" && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <KpiCard label="Total Orders" value={fOrders.length} sub={`${orderFulfillment}% fulfilled`} color={CHART_COLORS.emerald} delay={0} />
                    <KpiCard label="Completed" value={fOrders.filter((o) => o.status === "COMPLETED").length} sub="Delivered orders" color={CHART_COLORS.emerald} delay={0.05} />
                    <KpiCard label="In Transit" value={fOrders.filter((o) => ["SHIPPED", "PROCESSING"].includes(o.status)).length} sub="Being delivered" color={CHART_COLORS.sky} delay={0.1} />
                    <KpiCard label="Pending" value={fOrders.filter((o) => ["PENDING", "CONFIRMED"].includes(o.status)).length} sub="Awaiting fulfillment" color={CHART_COLORS.amber} delay={0.15} />
                  </div>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <AreaChartCard title="Order Trends" subtitle="Daily order volume" data={orderTimeline}
                      lines={[
                        { key: "pending",   color: CHART_COLORS.amber,   name: "Pending" },
                        { key: "completed", color: CHART_COLORS.emerald, name: "Completed" },
                      ]} />
                    <BarChartCard title="Orders by Status" subtitle="Status distribution" data={orderByStatus}
                      bars={[{ key: "value", color: CHART_COLORS.emerald }]} />
                  </div>
                  <div className="grid gap-6 xl:grid-cols-3">
                    <div className="glass-card p-5">
                      <SectionHeader title="Fulfillment Rate" />
                      <div className="flex justify-center mt-4">
                        <ProgressRing value={orderFulfillment} size={110} strokeWidth={8}
                          color={orderFulfillment >= 60 ? CHART_COLORS.emerald : CHART_COLORS.amber} />
                      </div>
                    </div>
                    <div className="glass-card p-5">
                      <SectionHeader title="Status Distribution" />
                      <div className="flex justify-center mt-2">
                        <DonutChart data={orderByStatus} size={130} innerRadius={45} outerRadius={64} />
                      </div>
                    </div>
                    <div className="glass-card p-5">
                      <SectionHeader title="Top Products" />
                      <div className="flex flex-col gap-2 mt-4">
                        {[...fOrders.reduce((m, o) => { m.set(o.productId, (m.get(o.productId) || 0) + 1); return m; }, new Map())]
                          .sort((a, b) => b[1] - a[1]).slice(0, 4).map(([pid, cnt]) => (
                            <div key={pid} className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-lg bg-brand-50 dark:bg-brand-500/5 flex items-center justify-center shrink-0">
                                <div className="w-2 h-2 rounded-full bg-brand-500" />
                              </div>
                              <span className="text-xs text-slate-600 dark:text-[#94A3B8] flex-1 truncate">{pid || "Unknown"}</span>
                              <span className="text-xs font-bold text-slate-700 dark:text-[#94A3B8]">{cnt}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Compliance ──────────────────────────────────────────────── */}
              {activeSection === "compliance" && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <KpiCard label="Avg Compliance" value={avgAiScore} suffix="%" sub={`${products.length} products`} color={avgAiScore >= 80 ? CHART_COLORS.emerald : CHART_COLORS.amber} delay={0} />
                    <KpiCard label="Certified" value={compliantProducts} sub="Score ≥ 80" color={CHART_COLORS.emerald} delay={0.05} />
                    <KpiCard label="In Review" value={reviewProducts} sub="Score 40–79" color={CHART_COLORS.amber} delay={0.1} />
                    <KpiCard label="Needs Work" value={nonCompliantProducts} sub="Score < 40" color={CHART_COLORS.red} delay={0.15} />
                  </div>
                  <div className="grid gap-6 xl:grid-cols-2">
                    <div className="glass-card p-5">
                      <SectionHeader title="DPP Completeness Score" subtitle="AI-evaluated product compliance" />
                      <div className="flex items-center justify-center gap-8 mt-4">
                        <ProgressRing value={avgAiScore} size={140} strokeWidth={10}
                          color={avgAiScore >= 80 ? CHART_COLORS.emerald : avgAiScore >= 50 ? CHART_COLORS.amber : CHART_COLORS.red} />
                        <div className="flex flex-col gap-3">
                          {[
                            { label: "Certified", count: compliantProducts, color: CHART_COLORS.emerald },
                            { label: "In Review", count: reviewProducts, color: CHART_COLORS.amber },
                            { label: "Needs Work", count: nonCompliantProducts, color: CHART_COLORS.red },
                          ].map((d) => (
                            <div key={d.label} className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                              <span className="text-xs font-semibold text-slate-600 dark:text-[#94A3B8]">{d.label}</span>
                              <span className="text-xs font-bold text-slate-800 dark:text-[#E2E8F0]">{d.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <BarChartCard title="Compliance Distribution" subtitle="Products by score range"
                      data={[
                        { name: "80-100", value: compliantProducts },
                        { name: "40-79",  value: reviewProducts },
                        { name: "<40",    value: nonCompliantProducts },
                      ]}
                      bars={[
                        { key: "value", color: CHART_COLORS.emerald },
                      ]} />
                  </div>
                  <div className="glass-card p-5">
                    <SectionHeader title="Product Compliance Scores" subtitle="Individual product DPP completeness" />
                    <div className="flex flex-col gap-2 mt-4">
                      {products.slice(0, 8).map((p) => {
                        const score = p.aiScore ?? 0;
                        const color = score >= 80 ? CHART_COLORS.emerald : score >= 50 ? CHART_COLORS.amber : CHART_COLORS.red;
                        return (
                          <div key={p.id} className="flex items-center gap-4 rounded-xl bg-slate-50 dark:bg-[#111827]/40 px-4 py-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0] truncate">{p.productName || p.id}</p>
                              <p className="text-[10px] text-slate-400 dark:text-[#64748B]">{p.companyName || "—"}</p>
                            </div>
                            <div className="w-32 h-2 rounded-full bg-slate-100 dark:bg-[#1E293B] overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: color }} />
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-[#94A3B8] w-10 text-right">{score}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Workforce ──────────────────────────────────────────────── */}
              {activeSection === "workforce" && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <KpiCard label="Employees" value={employees.length} sub="Team size" color={CHART_COLORS.brand} delay={0} />
                    <KpiCard label="Avg Score" value={avgPerf} suffix="/100" sub="Performance" color={avgPerf >= 70 ? CHART_COLORS.emerald : CHART_COLORS.amber} delay={0.05} />
                    <KpiCard label="Active Tasks" value={fTasks.filter((t) => !["DONE","CANCELLED"].includes(t.status)).length} sub="Assigned tasks" color={CHART_COLORS.sky} delay={0.1} />
                    <KpiCard label="Task Rate" value={taskCompletion} suffix="%" sub="Completion rate" color={taskCompletion >= 70 ? CHART_COLORS.emerald : CHART_COLORS.amber} delay={0.15} />
                  </div>
                  <div className="grid gap-6 xl:grid-cols-2">
                    <BarChartCard title="Task Status" subtitle="Tasks by current status"
                      data={taskByStatus}
                      bars={[{ key: "value", color: CHART_COLORS.brand }]} />
                    <AreaChartCard title="Task Trends" subtitle="Task completion over time"
                      data={taskTimeline}
                      lines={[
                        { key: "total", color: CHART_COLORS.brand, name: "Total" },
                        { key: "done",  color: CHART_COLORS.emerald, name: "Done" },
                      ]} />
                  </div>
                  <div className="glass-card p-5">
                    <SectionHeader title="Top Performers" subtitle="Employees by performance score" />
                    <div className="grid gap-3 mt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {[...employees]
                        .filter((e) => e.performanceScore != null)
                        .sort((a, b) => b.performanceScore - a.performanceScore)
                        .slice(0, 8).map((emp, i) => (
                          <motion.div key={emp.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-[#111827]/40 px-4 py-3">
                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? "bg-amber-400 text-white" : "bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-[#94A3B8]"}`}>
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0] truncate">{emp.fullName}</p>
                              <p className="text-[10px] text-slate-400 dark:text-[#64748B]">{emp.department || "No dept"}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-extrabold ${emp.performanceScore >= 80 ? "text-emerald-500" : emp.performanceScore >= 60 ? "text-amber-500" : "text-red-500"}`}>
                                {emp.performanceScore}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </DashboardLayout>
  );
}
