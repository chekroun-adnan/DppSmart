import { useEffect, useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import OrgSelector from "../components/OrgSelector";
import { getScansByOrg } from "../services/authService";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";

function fmt(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const TAB_ALL = "all";
const TAB_MAP = "map";
const TAB_PRODUCTS = "products";
const TAB_GEO = "geo";
const TAB_TREND = "trend";

export default function ScansPage() {
  const { t } = useTranslation();
  const [selectedOrgId, setSelectedOrgId] = useState(() => localStorage.getItem("orgId") || "");
  const [scans, setScans] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(TAB_ALL);
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);

  useEffect(() => {
    if (!selectedOrgId) { setScans([]); return; }
    let mounted = true;
    setScans([]);
    setError("");
    getScansByOrg(selectedOrgId)
      .then((data) => { if (mounted) setScans(Array.isArray(data) ? data : []); })
      .catch((e) => { if (mounted) setError(e.message || t("errors.serverError", "Failed to load scans.")); })
      .finally(() => { mounted = false; });
    return () => { mounted = false; };
  }, [selectedOrgId, t]);

  const filtered = scans.filter((s) => {
    const q = search.toLowerCase();
    return !q || [s.productId, s.scannedByUserEmail, s.ip, s.locationText].some((f) => f?.toLowerCase().includes(q));
  });

  const geoStats = useMemo(() => {
    const map = {};
    scans.forEach(s => {
      const key = s.locationText || (s.latitude != null ? `${s.latitude.toFixed(2)},${s.longitude.toFixed(2)}` : "Unknown");
      if (!map[key]) map[key] = { name: key, count: 0, scans: [] };
      map[key].count++;
      map[key].scans.push(s);
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [scans]);

  const productStats = useMemo(() => {
    const map = {};
    scans.forEach(s => {
      if (!s.productId) return;
      if (!map[s.productId]) map[s.productId] = { name: s.productId, count: 0 };
      map[s.productId].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [scans]);

  const trendStats = useMemo(() => {
    const map = {};
    scans.forEach(s => {
      if (!s.scannedAt) return;
      const date = new Date(s.scannedAt).toISOString().split("T")[0];
      if (!map[date]) map[date] = { date, scans: 0, users: new Set(), products: new Set() };
      map[date].scans++;
      if (s.scannedByUserEmail) map[date].users.add(s.scannedByUserEmail);
      if (s.productId) map[date].products.add(s.productId);
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [scans]);

  const scanLocations = useMemo(() =>
    scans.filter(s => s.latitude != null && s.longitude != null)
  , [scans]);

  const heatmapData = useMemo(() => {
    const grid = {};
    scanLocations.forEach(s => {
      const lat = Math.round(s.latitude * 10) / 10;
      const lng = Math.round(s.longitude * 10) / 10;
      const key = `${lat},${lng}`;
      if (!grid[key]) grid[key] = { lat, lng, count: 0 };
      grid[key].count++;
    });
    return Object.values(grid).sort((a, b) => b.count - a.count);
  }, [scanLocations]);

  useEffect(() => {
    if (activeTab !== TAB_MAP || !mapContainerRef.current || scanLocations.length === 0) return;

    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors"
            }
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }]
        },
        center: [scanLocations[0].longitude, scanLocations[0].latitude],
        zoom: 3
      });

      mapRef.current = map;

      map.on("load", () => {
        if (heatmapData.length > 0) {
          map.addSource("scan-heat", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: scanLocations.map(s => ({
                type: "Feature",
                geometry: { type: "Point", coordinates: [s.longitude, s.latitude] },
                properties: { count: 1 }
              }))
            }
          });

          map.addLayer({
            id: "scan-heat-layer",
            type: "heatmap",
            source: "scan-heat",
            paint: {
              "heatmap-weight": ["interpolate", ["linear"], ["get", "count"], 0, 0, 10, 1],
              "heatmap-intensity": 1,
              "heatmap-color": [
                "interpolate", ["linear"], ["heatmap-density"],
                0, "rgba(14,165,233,0)",
                0.2, "rgba(14,165,233,0.3)",
                0.4, "rgba(6,182,212,0.5)",
                0.6, "rgba(16,185,129,0.7)",
                0.8, "rgba(245,158,11,0.9)",
                1, "rgba(239,68,68,1)"
              ],
              "heatmap-radius": 40,
              "heatmap-opacity": 0.8
            }
          });
        }

        scanLocations.forEach((s) => {
          const el = document.createElement("div");
          el.className = "scan-marker";
          el.style.cssText = `
            width: 28px; height: 28px; background: #6366f1; border: 3px solid #fff;
            border-radius: 50%; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center;
          `;
          const inner = document.createElement("div");
          inner.style.cssText = "width: 10px; height: 10px; background: #fff; border-radius: 50%;";
          el.appendChild(inner);

          const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
            .setHTML(`
              <div style="padding: 8px; font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.5;">
                <b style="font-size: 13px;">${s.productId || "Unknown Product"}</b><br/>
                ${s.locationText ? `<span>${s.locationText}</span><br/>` : ""}
                <span style="color: #666; font-size: 11px;">${fmt(s.scannedAt)}</span><br/>
                <span style="color: #888; font-size: 11px;">${s.scannedByUserEmail || "anonymous"}</span>
              </div>
            `);

          new maplibregl.Marker(el)
            .setLngLat([s.longitude, s.latitude])
            .setPopup(popup)
            .addTo(map);
        });

        if (scanLocations.length > 1) {
          const bounds = new maplibregl.LngLatBounds();
          scanLocations.forEach(s => bounds.extend([s.longitude, s.latitude]));
          map.fitBounds(bounds, { padding: 60, maxZoom: 12 });
        }
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [activeTab, scanLocations, heatmapData]);

  const tabs = [
    { id: TAB_ALL, label: t("scans.tabAll", "All Scans") },
    { id: TAB_MAP, label: t("scans.tabMap", "Scan Map") },
    { id: TAB_PRODUCTS, label: t("scans.tabProducts", "Top Products") },
    { id: TAB_GEO, label: t("scans.tabGeo", "Geography") },
    { id: TAB_TREND, label: t("scans.tabTrend", "Trends") },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">{t("scans.analytics", "Analytics")}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{t("scans.qrScanEvents", "QR Scan Events")}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("scans.subtitle", "Track every product passport scan across your organizations.")}</p>
          </div>
          {scans.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">
              <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
              {scans.length} scans
            </span>
          )}
        </div>

        <OrgSelector value={selectedOrgId} onChange={setSelectedOrgId} />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label={t("scans.totalScans", "Total Scans")} value={scans.length} icon={
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          } t={t} />
          <StatCard label={t("scans.uniqueProducts", "Products")} value={new Set(scans.map(s => s.productId).filter(Boolean)).size} icon={
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          } t={t} />
          <StatCard label={t("scans.uniqueUsers", "Users")} value={new Set(scans.map(s => s.scannedByUserEmail).filter(Boolean)).size} icon={
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
          } t={t} />
          <StatCard label={t("scans.withLocation", "Geo-tagged")} value={scanLocations.length} icon={
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          } t={t} />
        </div>

        {selectedOrgId && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/50 pl-9 pr-4 text-sm text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10" placeholder="Product ID, user, IP..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        {activeTab === TAB_ALL && (
          <AllScansTable filtered={filtered} search={search} fmt={fmt} t={t} />
        )}

        {activeTab === TAB_MAP && (
          <div className="space-y-4">
            {scanLocations.length === 0 ? (
              <div className="glass-card py-16 text-center">
                <svg className="mx-auto w-10 h-10 text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                <p className="text-sm font-semibold text-slate-500">No geo-tagged scans available.</p>
              </div>
            ) : (
              <>
                <div className="glass-card overflow-hidden p-0">
                  <div ref={mapContainerRef} className="w-full h-[420px]" />
                </div>
                <div className="glass-card p-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">{t("scans.scanLocations", "Scan Locations")} ({scanLocations.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {scanLocations.slice(0, 20).map((s, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-none mt-0.5">
                          <span className="text-[10px] font-bold text-brand-600">{i + 1}</span>
                        </div>
                        <div>
                          <p className="text-xs font-mono text-slate-700 dark:text-slate-300">{s.productId || "—"}</p>
                          <p className="text-xs text-slate-500">{s.locationText || `${s.latitude?.toFixed(4)}, ${s.longitude?.toFixed(4)}`}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{fmt(s.scannedAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {heatmapData.length > 0 && (
                  <div className="glass-card p-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">{t("scans.scanHeatmap", "Scan Heatmap — Hotspots")}</h3>
                    <ResponsiveContainer width="100%" height={200} minWidth={1} minHeight={1}>
                      <BarChart data={heatmapData.slice(0, 8)} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" darkStroke="#1e293b" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={100} />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12 }}
                          itemStyle={{ color: "#6366f1" }}
                        />
                        <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === TAB_PRODUCTS && (
          <div className="space-y-4">
            {productStats.length === 0 ? (
              <div className="glass-card py-16 text-center">
                <p className="text-sm font-semibold text-slate-500">No product scan data available.</p>
              </div>
            ) : (
              <>
                <div className="glass-card p-5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">{t("scans.mostScannedProducts", "Most Scanned Products")}</h3>
                  <ResponsiveContainer width="100%" height={Math.max(300, productStats.length * 40)} minWidth={1} minHeight={1}>
                    <BarChart data={productStats} layout="vertical" margin={{ left: 20, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" darkStroke="#1e293b" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={80}
                        tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + "…" : v} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12 }}
                        formatter={(v) => [`${v} scans`, "Scan Count"]}
                      />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={22}>
                        {productStats.map((_, i) => (
                          <Cell key={i} fill={["#8b5cf6", "#6366f1", "#a78bfa", "#7c3aed", "#4f46e5", "#6d28d9", "#c4b5fd", "#7c3aed", "#5b21b6", "#818cf8"][i % 10]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="glass-card p-5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">{t("scans.scanDistribution", "Scan Distribution")}</h3>
                  <ResponsiveContainer width="100%" height={220} minWidth={1} minHeight={1}>
                    <PieChart>
                      <Pie data={productStats.slice(0, 5)} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}
                        label={({ name, percent }) => `${name.slice(0, 8)}… ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {productStats.slice(0, 5).map((_, i) => (
                          <Cell key={i} fill={["#6366f1", "#8b5cf6", "#a78bfa", "#7c3aed", "#4f46e5"][i]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === TAB_GEO && (
          <div className="space-y-4">
            {geoStats.length === 0 ? (
              <div className="glass-card py-16 text-center">
                <p className="text-sm font-semibold text-slate-500">No geographic data available.</p>
              </div>
            ) : (
              <>
                <div className="glass-card p-5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">{t("scans.scanByLocation", "Scans by Location")}</h3>
                  <div className="space-y-2">
                    {geoStats.slice(0, 15).map((g, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-6 text-center">
                          <span className="text-xs font-bold text-slate-400">{i + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{g.name}</span>
                            <span className="text-xs font-bold text-brand-600">{g.count} scans</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-indigo-500"
                              style={{ width: `${(g.count / geoStats[0].count) * 100}%`, transition: "width 0.6s ease" }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="glass-card p-5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">{t("scans.locationBreakdown", "Location Breakdown")}</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-[0.18em] text-slate-400 border-b border-slate-100 dark:border-white/[0.06]">
                          <th className="pb-3 pr-4 font-bold">#</th>
                          <th className="pb-3 pr-4 font-bold">{t("scans.location", "Location")}</th>
                          <th className="pb-3 pr-4 font-bold text-right">{t("scans.scans", "Scans")}</th>
                          <th className="pb-3 pr-4 font-bold text-right">{t("scans.uniqueProducts", "Products")}</th>
                          <th className="pb-3 font-bold text-right">{t("scans.uniqueUsers", "Users")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                        {geoStats.slice(0, 10).map((g, i) => (
                          <tr key={i}>
                            <td className="py-3 pr-4 text-slate-300">{i + 1}</td>
                            <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">{g.name}</td>
                            <td className="py-3 pr-4 text-right font-bold text-brand-600">{g.count}</td>
                            <td className="py-3 pr-4 text-right">{new Set(g.scans.map(s => s.productId)).size}</td>
                            <td className="py-3 text-right">{new Set(g.scans.map(s => s.scannedByUserEmail).filter(Boolean)).size}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === TAB_TREND && (
          <div className="space-y-4">
            {trendStats.length === 0 ? (
              <div className="glass-card py-16 text-center">
                <p className="text-sm font-semibold text-slate-500">No trend data available.</p>
              </div>
            ) : (
              <>
                <div className="glass-card p-5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">{t("scans.scanTrend", "Scan Trend Over Time")}</h3>
                  <ResponsiveContainer width="100%" height={240} minWidth={1} minHeight={1}>
                    <AreaChart data={trendStats} margin={{ left: 10, right: 20 }}>
                      <defs>
                        <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" darkStroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                        tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12 }}
                        labelFormatter={(v) => new Date(v).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        formatter={(v) => [v, "Scans"]}
                      />
                      <Area type="monotone" dataKey="scans" stroke="#6366f1" strokeWidth={2.5} fill="url(#scanGrad)" dot={{ r: 3, fill: "#6366f1" }} activeDot={{ r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="glass-card p-5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">{t("scans.dailyStats", "Daily Statistics")}</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-brand-50 to-indigo-50 dark:from-brand-900/20 dark:to-indigo-900/20 text-center">
                      <p className="text-2xl font-extrabold text-brand-700 dark:text-brand-400">{scans.length}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-500 mt-1">Total Scans</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 text-center">
                      <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-400">{trendStats.length > 0 ? Math.round(scans.length / trendStats.length) : 0}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mt-1">Avg/Day</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 text-center">
                      <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">{trendStats.length}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mt-1">Active Days</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function AllScansTable({ filtered, search, fmt, t }) {
  return (
    <div className="glass-card overflow-hidden border-slate-200">
      {!filtered || filtered.length === 0 ? (
        <div className="py-16 text-center">
          <svg className="mx-auto w-10 h-10 text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
          <p className="text-sm font-semibold text-slate-500">{search ? "No results for your search." : "No scan events yet for this organization."}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.18em] text-slate-400 border-b border-slate-100 dark:border-white/[0.06]">
                <th className="px-6 py-4 font-bold">Product ID</th>
                <th className="px-6 py-4 font-bold">Scanned By</th>
                <th className="px-6 py-4 font-bold">Location</th>
                <th className="px-6 py-4 font-bold">IP</th>
                <th className="px-6 py-4 font-bold">Date & Time</th>
                <th className="px-6 py-4 font-bold">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
              {filtered.map((scan) => (
                <tr key={scan.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-lg">{scan.productId || "—"}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{scan.scannedByUserEmail || <span className="text-slate-300 italic text-xs">anonymous</span>}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {scan.locationText ? <span>{scan.locationText}</span> : scan.latitude != null ? (
                      <span className="font-mono text-xs">{scan.latitude.toFixed(4)}, {scan.longitude.toFixed(4)}</span>
                    ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{scan.ip || "—"}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmt(scan.scannedAt)}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-400 max-w-[180px] truncate block" title={scan.userAgent || ""}>
                      {scan.userAgent ? scan.userAgent.split(" ")[0] : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, t }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 flex-none rounded-xl bg-brand-50 flex items-center justify-center">
          <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
        </div>
        <div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{value}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}