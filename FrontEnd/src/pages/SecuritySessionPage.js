import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useNotifications } from "../context/NotificationContext";
import {
  getActiveSessions,
  revokeSession,
  revokeAllOtherSessions,
  logoutAllDevices,
  getSuspiciousSessions,
  getRecentFailedAttempts,
} from "../services/authService";



function timeAgo(dt) {
  if (!dt) return "—";
  const diff = Math.floor((Date.now() - new Date(dt).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_PILL = {
  ACTIVE:  "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  REVOKED: "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400",
  EXPIRED: "bg-slate-100 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400",
};



function IconMonitor() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function IconWarn() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function IconX() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconRefresh({ spinning }) {
  return (
    <svg className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}



function SessionCard({ session, onRevoke, revoking }) {
  const status = session.sessionStatus || "ACTIVE";
  const canRevoke = status === "ACTIVE" && !session.current;

  return (
    <div className={`glass-card p-5 space-y-3 transition-all
      ${session.current ? "ring-2 ring-brand-500/40" : ""}
      ${session.suspicious ? "ring-2 ring-amber-400/50 dark:ring-amber-500/30" : ""}`}>

      
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-xl p-2
            ${session.current
              ? "bg-brand-100 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400"
              : "bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400"}`}>
            <IconMonitor />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {session.deviceName || "Unknown Device"}
              </p>
              {session.current && (
                <span className="rounded-full bg-brand-100 dark:bg-brand-500/15 text-brand-700 dark:text-brand-400
                  px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                  This device
                </span>
              )}
              {session.suspicious && (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/15
                  text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                  <IconWarn /> Suspicious
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {session.browser} · {session.os}
            </p>
          </div>
        </div>

        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase
          ${STATUS_PILL[status] || STATUS_PILL.EXPIRED}`}>
          {status}
        </span>
      </div>

      
      {session.suspicious && session.suspicionReason && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20
          px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
          <IconWarn />
          <span>{session.suspicionReason}</span>
        </div>
      )}

      
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div>
          <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide text-[10px]">IP</span>
          <p className="text-slate-700 dark:text-slate-300 mt-0.5 font-mono">{session.ipAddress || "—"}</p>
        </div>
        <div>
          <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide text-[10px]">Location</span>
          <p className="text-slate-700 dark:text-slate-300 mt-0.5">
            {[session.city, session.country].filter(Boolean).join(", ") || "Unknown"}
          </p>
        </div>
        <div>
          <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide text-[10px]">Signed in</span>
          <p className="text-slate-700 dark:text-slate-300 mt-0.5">{formatDate(session.loginTime)}</p>
        </div>
        <div>
          <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide text-[10px]">Last active</span>
          <p className="text-slate-700 dark:text-slate-300 mt-0.5">{timeAgo(session.lastActivity)}</p>
        </div>
      </div>

      
      {canRevoke && (
        <div className="pt-1">
          <button
            onClick={() => onRevoke(session.id)}
            disabled={revoking === session.id}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400
              hover:text-rose-700 dark:hover:text-rose-300 disabled:opacity-50 transition-colors">
            {revoking === session.id
              ? <IconRefresh spinning />
              : <IconX />}
            {revoking === session.id ? "Revoking…" : "Revoke session"}
          </button>
        </div>
      )}
    </div>
  );
}



function StatTile({ label, value, color = "slate" }) {
  const colors = {
    slate:   "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300",
    emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    rose:    "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400",
    amber:   "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
  };
  return (
    <div className={`rounded-2xl p-4 ${colors[color] || colors.slate}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">{label}</p>
      <p className="text-2xl font-black mt-1">{value}</p>
    </div>
  );
}



function ConfirmDialog({ message, onConfirm, onCancel, busy }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md mx-4 p-6 space-y-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-rose-100 dark:bg-rose-500/15 p-2 text-rose-600 dark:text-rose-400 mt-0.5">
            <IconWarn />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Are you sure?</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 btn-secondary py-2.5 rounded-xl text-sm">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700
              text-white disabled:opacity-50 transition-colors">
            {busy ? "Processing…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}



export default function SecuritySessionPage() {
  const { addToast } = useNotifications();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const [failedAttempts, setFailedAttempts] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const [sess, attempts] = await Promise.all([
        getActiveSessions(),
        getRecentFailedAttempts().catch(() => null),
      ]);
      setSessions(sess);
      if (attempts) setFailedAttempts(attempts.recentFailedAttempts ?? 0);
    } catch (e) {
      setError(e.message || "Failed to load session data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  

  const handleRevoke = (sessionId) => {
    setConfirm({ type: "one", sessionId });
  };

  const confirmRevoke = async () => {
    const sessionId = confirm.sessionId;
    setConfirmBusy(true);
    try {
      await revokeSession(sessionId);
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, sessionStatus: "REVOKED" } : s
      ));
      addToast({ type: "success", title: "Session Revoked", message: "The session has been terminated." });
    } catch (e) {
      addToast({ type: "error", title: "Error", message: e.message || "Failed to revoke session." });
    } finally {
      setConfirmBusy(false);
      setConfirm(null);
    }
  };

  

  const handleRevokeAll = () => setConfirm({ type: "all" });

  const confirmRevokeAll = async () => {
    setConfirmBusy(true);
    try {
      await revokeAllOtherSessions();
      setSessions(prev => prev.map(s =>
        s.current ? s : { ...s, sessionStatus: "REVOKED" }
      ));
      addToast({ type: "success", title: "All Sessions Revoked", message: "All other devices have been signed out." });
    } catch (e) {
      addToast({ type: "error", title: "Error", message: e.message || "Failed to revoke sessions." });
    } finally {
      setConfirmBusy(false);
      setConfirm(null);
    }
  };

  

  const onConfirmAction = () => {
    if (confirm?.type === "one") confirmRevoke();
    else if (confirm?.type === "all") confirmRevokeAll();
  };

  const confirmMessage = confirm?.type === "all"
    ? "This will sign you out from all other devices. Your current session will remain active."
    : "This will immediately terminate the selected session. The device will need to log in again.";

  

  const activeSessions    = sessions.filter(s => s.sessionStatus === "ACTIVE");
  const suspiciousSessions = sessions.filter(s => s.suspicious);
  const displayedSessions = activeTab === "suspicious" ? suspiciousSessions : sessions;
  const hasOtherActive    = activeSessions.some(s => !s.current);

  

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">

        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-brand-100 dark:bg-brand-500/15 p-2 text-brand-600 dark:text-brand-400">
                <IconShield />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Security &amp; Sessions
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-11">
              Manage active sessions, detect suspicious activity, and protect your account.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800
                text-slate-700 dark:text-slate-200 text-sm font-medium border border-slate-200
                dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm
                disabled:opacity-50">
              <IconRefresh spinning={refreshing} />
              Refresh
            </button>
            {hasOtherActive && (
              <button
                onClick={handleRevokeAll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700
                  text-white text-sm font-semibold transition-colors shadow-sm">
                <IconX />
                Sign out all other devices
              </button>
            )}
          </div>
        </div>

        
        {error && (
          <div className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50
            dark:bg-rose-500/5 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Total Sessions"  value={sessions.length}           color="slate"   />
            <StatTile label="Active"          value={activeSessions.length}     color="emerald" />
            <StatTile label="Suspicious"      value={suspiciousSessions.length} color={suspiciousSessions.length > 0 ? "amber" : "slate"} />
            <StatTile label="Failed Logins (15 min)" value={failedAttempts ?? "—"}
              color={failedAttempts > 3 ? "rose" : "slate"} />
          </div>
        )}

        
        {!loading && failedAttempts > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-500/20
            bg-amber-50 dark:bg-amber-500/5 px-4 py-3">
            <span className="text-amber-500 mt-0.5 shrink-0"><IconWarn /></span>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {failedAttempts} failed login attempt{failedAttempts !== 1 ? "s" : ""} in the last 15 minutes
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                If this wasn't you, consider changing your password and revoking all sessions.
              </p>
            </div>
          </div>
        )}

        
        {!loading && suspiciousSessions.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 dark:border-rose-500/20
            bg-rose-50 dark:bg-rose-500/5 px-4 py-3">
            <span className="text-rose-500 mt-0.5 shrink-0"><IconShield /></span>
            <div>
              <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">
                {suspiciousSessions.length} suspicious session{suspiciousSessions.length !== 1 ? "s" : ""} detected
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">
                Review the flagged sessions below and revoke any you don't recognise.
              </p>
            </div>
          </div>
        )}

        
        <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 p-1 w-fit">
          {[
            { key: "all",        label: `All Sessions (${sessions.length})` },
            { key: "suspicious", label: `Suspicious (${suspiciousSessions.length})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all
                ${activeTab === tab.key
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading sessions…</p>
          </div>
        ) : displayedSessions.length === 0 ? (
          <div className="glass-card py-16 text-center">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {activeTab === "suspicious" ? "No suspicious sessions detected." : "No sessions found."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {displayedSessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                onRevoke={handleRevoke}
                revoking={revoking}
              />
            ))}
          </div>
        )}

      </div>

      
      {confirm && (
        <ConfirmDialog
          message={confirmMessage}
          onConfirm={onConfirmAction}
          onCancel={() => setConfirm(null)}
          busy={confirmBusy}
        />
      )}
    </DashboardLayout>
  );
}
