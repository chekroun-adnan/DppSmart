import { useState, useEffect } from "react";
import { getOrders } from "../services/authService";
import { Link } from "react-router-dom";

const READ_KEY = "smartdpp_read_notifications";

function getReadSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveReadSet(set) {
  localStorage.setItem(READ_KEY, JSON.stringify([...set]));
}

const STATUS_META = {
  PENDING:      { label: "Order Received",      color: "text-slate-400",   bg: "bg-slate-500/20",   icon: "📦" },
  IN_PROGRESS:  { label: "In Production",        color: "text-blue-400",    bg: "bg-blue-500/20",    icon: "⚙️" },
  COMPLETED:    { label: "Production Complete",  color: "text-emerald-400", bg: "bg-emerald-500/20", icon: "✅" },
  SHIPPED:      { label: "Shipped",              color: "text-purple-400",  bg: "bg-purple-500/20",  icon: "🚚" },
  DELIVERED:    { label: "Delivered",            color: "text-green-400",   bg: "bg-green-500/20",   icon: "🎉" },
  CANCELLED:    { label: "Cancelled",            color: "text-red-400",     bg: "bg-red-500/20",     icon: "❌" },
};

function notificationsFromOrders(orders) {
  const notifications = [];
  for (const order of orders) {
    const meta = STATUS_META[order.status] || STATUS_META.PENDING;
    notifications.push({
      id: `${order.id}-status`,
      orderId: order.id,
      orderRef: order.referenceNumber || order.id?.slice(-6)?.toUpperCase(),
      type: "status",
      title: meta.label,
      body: `Order #${order.referenceNumber || order.id?.slice(-6)?.toUpperCase()} · ${order.status?.replace("_", " ")}`,
      icon: meta.icon,
      color: meta.color,
      bg: meta.bg,
      time: order.updatedAt || order.createdAt,
      status: order.status,
    });

    if (order.deliveryDate) {
      notifications.push({
        id: `${order.id}-delivery`,
        orderId: order.id,
        orderRef: order.referenceNumber || order.id?.slice(-6)?.toUpperCase(),
        type: "delivery",
        title: "Estimated Delivery",
        body: `Your order is expected on ${new Date(order.deliveryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
        icon: "📅",
        color: "text-amber-400",
        bg: "bg-amber-500/20",
        time: order.createdAt,
        status: order.status,
      });
    }
  }
  return notifications.sort((a, b) => new Date(b.time) - new Date(a.time));
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ClientNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [readSet, setReadSet] = useState(getReadSet);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    getOrders()
      .then((orders) => setNotifications(notificationsFromOrders(orders || [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markRead = (id) => {
    setReadSet((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadSet(next);
      return next;
    });
  };

  const markAllRead = () => {
    const next = new Set(notifications.map((n) => n.id));
    saveReadSet(next);
    setReadSet(next);
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !readSet.has(n.id);
    if (filter === "orders") return n.type === "status";
    if (filter === "delivery") return n.type === "delivery";
    return true;
  });

  const unreadCount = notifications.filter((n) => !readSet.has(n.id)).length;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-sm text-white/50 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-brand-primary hover:text-brand-primary/80 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: "all", label: "All" },
          { key: "unread", label: `Unread${unreadCount ? ` (${unreadCount})` : ""}` },
          { key: "orders", label: "Order Updates" },
          { key: "delivery", label: "Delivery" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === tab.key
                ? "bg-brand-primary text-white shadow"
                : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="flex gap-3 items-start">
                <div className="w-10 h-10 rounded-xl bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-white/10 rounded w-1/3" />
                  <div className="h-3 bg-white/5 rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-white/50 text-sm">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </p>
          <p className="text-white/30 text-xs mt-1">
            Notifications will appear here as your orders progress
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const isUnread = !readSet.has(n.id);
            return (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`glass-card p-4 cursor-pointer transition-all hover:bg-white/10 ${
                  isUnread ? "border-l-2 border-brand-primary" : "opacity-70"
                }`}
              >
                <div className="flex gap-3 items-start">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${n.bg}`}>
                    {n.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-medium ${isUnread ? "text-white" : "text-white/70"}`}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-brand-primary flex-shrink-0" />
                        )}
                        <span className="text-xs text-white/30">{timeAgo(n.time)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-white/50 mt-0.5 truncate">{n.body}</p>
                    {n.orderId && (
                      <Link
                        to="/client-orders"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-brand-primary hover:underline mt-1 inline-block"
                      >
                        View order →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order timeline summary */}
      {notifications.length > 0 && (
        <div className="glass-card mt-6 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Order Activity Timeline</h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />
            <div className="space-y-4 pl-10">
              {notifications
                .filter((n) => n.type === "status")
                .slice(0, 5)
                .map((n) => (
                  <div key={n.id} className="relative">
                    <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-current ${n.color} bg-gray-900`} />
                    <p className={`text-xs font-medium ${n.color}`}>{n.title}</p>
                    <p className="text-xs text-white/40">{n.body} · {timeAgo(n.time)}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
