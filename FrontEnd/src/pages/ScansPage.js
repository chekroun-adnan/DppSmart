import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import OrgSelector from "../components/OrgSelector";
import { getScansByOrg } from "../services/authService";

function fmt(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function ScansPage() {
  const { t } = useTranslation();
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [scans, setScans] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!selectedOrgId) { setScans([]); return; }
    let mounted = true;
    setScanning(true);
    setScans([]);
    setError("");
    getScansByOrg(selectedOrgId)
      .then((data) => { if (mounted) setScans(Array.isArray(data) ? data : []); })
      .catch((e) => { if (mounted) setError(e.message || t("errors.serverError", "Failed to load scans.")); })
      .finally(() => { if (mounted) setScanning(false); });
    return () => { mounted = false; };
  }, [selectedOrgId]);

  const filtered = scans.filter((s) => {
    const q = search.toLowerCase();
    return !q || [s.productId, s.scannedByUserEmail, s.ip, s.locationText].some((f) => f?.toLowerCase().includes(q));
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">{t("scans.analytics", "Analytics")}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{t("scans.qrScanEvents", "QR Scan Events")}</h1>
            <p className="mt-1 text-sm text-slate-500">{t("scans.subtitle", "Track every product passport scan across your organizations.")}</p>
          </div>
          {scans.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">
              <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
              {scans.length} {scans.length !== 1 ? t("scans.scans", "scans") : t("scans.scan", "scan")}
            </span>
          )}
        </div>

        <OrgSelector value={selectedOrgId} onChange={setSelectedOrgId} />

        {selectedOrgId && (
          <div className="relative max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10" placeholder={t("scans.searchPlaceholder", "Product ID, user, IP...")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        )}

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        <div className="glass-card overflow-hidden border-slate-200">
          {!selectedOrgId ? (
            <div className="py-16 text-center">
              <svg className="mx-auto w-10 h-10 text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
              <p className="text-sm font-semibold text-slate-500">{t("scans.selectOrg", "Select an organization above to view scan events.")}</p>
            </div>
          ) : scanning ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              <p className="text-sm text-slate-500">{t("scans.loading", "Loading scan events...")}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="mx-auto w-10 h-10 text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
              <p className="text-sm font-semibold text-slate-500">{search ? t("scans.noResults", "No results for your search.") : t("scans.noScansForOrg", "No scan events yet for this organization.")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.18em] text-slate-400 border-b border-slate-100">
                    <th className="px-6 py-4 font-bold">{t("scans.productId", "Product ID")}</th>
                    <th className="px-6 py-4 font-bold">{t("scans.scannedBy", "Scanned By")}</th>
                    <th className="px-6 py-4 font-bold">{t("scans.location", "Location")}</th>
                    <th className="px-6 py-4 font-bold">{t("scans.ipAddress", "IP")}</th>
                    <th className="px-6 py-4 font-bold">{t("scans.dateTime", "Date & Time")}</th>
                    <th className="px-6 py-4 font-bold">{t("scans.device", "Device")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((scan) => (
                    <tr key={scan.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">{scan.productId || "—"}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{scan.scannedByUserEmail || <span className="text-slate-300 italic text-xs">{t("scans.anonymous", "anonymous")}</span>}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {scan.locationText ? (
                          <span>{scan.locationText}</span>
                        ) : scan.latitude != null && scan.longitude != null ? (
                          <span className="font-mono text-xs">{scan.latitude.toFixed(4)}, {scan.longitude.toFixed(4)}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-slate-500">{scan.ip || "—"}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">{fmt(scan.scannedAt)}</td>
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

        {filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label={t("scans.totalScans", "Total Scans")} value={scans.length} icon={
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            } t={t} />
            <StatCard label={t("scans.uniqueProducts", "Unique Products")} value={new Set(scans.map((s) => s.productId).filter(Boolean)).size} icon={
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            } t={t} />
            <StatCard label={t("scans.uniqueUsers", "Unique Users")} value={new Set(scans.map((s) => s.scannedByUserEmail).filter(Boolean)).size} icon={
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
            } t={t} />
            <StatCard label={t("scans.withLocation", "With Location")} value={scans.filter((s) => s.locationText || s.latitude != null).length} icon={
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            } t={t} />
          </div>
        )}
      </div>
    </DashboardLayout>
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
          <p className="text-2xl font-extrabold text-slate-900">{value}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
