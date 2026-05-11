import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getUnreadNotifications, markNotificationRead, markAllNotificationsRead } from "../services/authService";

const NotificationContext = createContext(null);

export function useNotifications() {
  return useContext(NotificationContext);
}

function ToastItem({ toast, onRemove }) {
  const icons = {
    info:    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    success: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    warning: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
    error:   <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  };
  const styles = {
    info:    "bg-brand-500/10 border-brand-500/20",
    success: "bg-emerald-500/10 border-emerald-500/20",
    warning: "bg-amber-500/10 border-amber-500/20",
    error:   "bg-red-500/10 border-red-500/20",
  };
  return (
    <motion.div
      initial={{ opacity: 0, x: 48, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 48, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`flex items-center gap-3 rounded-2xl border backdrop-blur-xl shadow-2xl px-4 py-3 min-w-[320px] max-w-[400px] ${styles[toast.type] || styles.info}`}
    >
      <div className="shrink-0">{icons[toast.type] || icons.info}</div>
      <div className="flex-1 min-w-0">
        {toast.title && <p className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">{toast.title}</p>}
        <p className="text-xs font-medium text-slate-600 dark:text-[#94A3B8]">{toast.message}</p>
      </div>
      <button onClick={() => onRemove(toast.id)} className="shrink-0 w-5 h-5 rounded-lg flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity text-slate-400">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </motion.div>
  );
}

function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function NotificationBell({ unread, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-9 w-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-[rgba(255,255,255,0.04)] border border-slate-200 dark:border-[rgba(255,255,255,0.06)] text-slate-500 dark:text-[#94A3B8] hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-200 dark:hover:border-brand-500/30 transition-all"
      aria-label="Notifications"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2 2 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
      </svg>
      <AnimatePresence>
        {unread > 0 && (
          <motion.span
            key={unread}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-extrabold px-1 shadow-lg shadow-rose-500/40"
          >
            {unread > 99 ? "99+" : unread}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

function NotificationPanel({ notifications, onClose, onMarkRead, onMarkAllRead, loading }) {
  const [filter, setFilter] = useState("all");

  const filters = [
    { key: "all",        label: "All" },
    { key: "unread",     label: "Unread" },
    { key: "ORDER",      label: "Orders" },
    { key: "PRODUCTION", label: "Production" },
    { key: "TASK",       label: "Tasks" },
  ];

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter !== "all")    return n.type === filter;
    return true;
  });

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const typeConfig = {
    ORDER:      { bg: "bg-brand-500/10",    icon: "text-brand-500",    label: "Order" },
    DELIVERY:   { bg: "bg-emerald-500/10",  icon: "text-emerald-500",  label: "Delivery" },
    PRODUCTION: { bg: "bg-sky-500/10",      icon: "text-sky-500",      label: "Production" },
    TASK:       { bg: "bg-purple-500/10",   icon: "text-purple-500",   label: "Task" },
    SYSTEM:     { bg: "bg-amber-500/10",    icon: "text-amber-500",    label: "System" },
    ALERT:      { bg: "bg-rose-500/10",     icon: "text-rose-500",     label: "Alert" },
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, x: 24, scale: 0.97 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 24, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed right-4 top-16 z-50 w-[400px] max-h-[560px] rounded-2xl glass-card shadow-2xl shadow-black/20 flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">Notifications</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
              {notifications.filter((n) => !n.read).length} unread
            </span>
          </div>
          <button onClick={onMarkAllRead} className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 hover:underline">
            Mark all read
          </button>
        </div>

        <div className="flex gap-1 px-4 py-2 border-b border-slate-100 dark:border-[rgba(255,255,255,0.04)] overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all ${
                filter === f.key
                  ? "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                  : "text-slate-400 dark:text-[#64748B] hover:text-slate-600 dark:hover:text-[#94A3B8]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-2 p-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1E293B]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-100 dark:bg-[#1E293B] rounded w-3/4" />
                    <div className="h-2.5 bg-slate-100 dark:bg-[#1E293B] rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#1E293B] flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2 2 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
              </div>
              <p className="text-xs font-semibold text-slate-400 dark:text-[#64748B]">All caught up!</p>
              <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">No notifications here</p>
            </div>
          ) : (
            filtered.map((n, idx) => {
              const c = typeConfig[n.type] || typeConfig.SYSTEM;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  onClick={() => !n.read && onMarkRead(n.id)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#111827]/40 transition-colors border-b border-slate-50 dark:border-[rgba(255,255,255,0.04)] ${
                    !n.read ? "bg-brand-500/5 dark:bg-brand-500/5" : ""
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${c.bg}`}>
                    <svg className={`w-4 h-4 ${c.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-[#E2E8F0] leading-tight">{n.title}</p>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-[#64748B] mt-0.5 leading-snug">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${c.bg} ${c.icon}`}>{c.label}</span>
                      <span className="text-[10px] text-slate-300 dark:text-slate-600">{timeAgo(n.createdAt)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>
    </>
  );
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts]               = useState([]);
  const [panelOpen, setPanelOpen]         = useState(false);
  const [loading, setLoading]             = useState(false);
  const [unreadCount, setUnreadCount]      = useState(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUnreadNotifications();
      setNotifications(Array.isArray(data) ? data : []);
      setUnreadCount(Array.isArray(data) ? data.filter((n) => !n.read).length : 0);
    } catch (e) {
      console.warn("Failed to load notifications:", e.message);
      setNotifications([]);
      setUnreadCount(0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const addToast = useCallback(({ title, message, type = "info", duration = 4000 }) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleMarkRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
    try { await markNotificationRead(id); } catch {}
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try { await markAllNotificationsRead(); } catch {}
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, addToast, removeToast, openPanel: () => setPanelOpen(true) }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <AnimatePresence>
        {panelOpen && (
          <NotificationPanel
            notifications={notifications}
            onClose={() => setPanelOpen(false)}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            loading={loading}
          />
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
}

export { NotificationBell };