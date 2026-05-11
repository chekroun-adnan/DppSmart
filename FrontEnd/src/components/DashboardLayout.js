import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { clearAuthSession, logoutUser } from "../services/authService";
import { useTheme } from "../context/ThemeContext";
import LanguageSwitcher from "./LanguageSwitcher";
import { NotificationBell } from "../context/NotificationContext";
import { useNotifications } from "../context/NotificationContext";
import {
  LayoutDashboard, Package, ClipboardList, Factory, Archive,
  Users, Building2, CheckSquare, FileText, Truck, QrCode,
  ShieldCheck, UserCog, ScrollText, Settings, BarChart2,
  ChevronLeft, Sun, Moon, LogOut, SlidersHorizontal,
  Menu,
} from "lucide-react";

const NAV_GROUPS = [
  {
    groupLabel: "Overview",
    items: [
      { key: "dashboard",  path: "/dashboard",  roles: ["ADMIN","SUBADMIN","EMPLOYEE"], Icon: LayoutDashboard },
      { key: "analytics",  path: "/analytics",  roles: ["ADMIN","SUBADMIN"],            Icon: BarChart2 },
    ],
  },
  {
    groupLabel: "Operations",
    items: [
      { key: "production",  path: "/production",   roles: ["ADMIN","SUBADMIN"], Icon: Factory },
      { key: "orders",      path: "/orders",        roles: ["ADMIN","SUBADMIN"], Icon: ClipboardList },
      { key: "stock",       path: "/stock",         roles: ["ADMIN","SUBADMIN"], Icon: Archive },
      { key: "tasks",       path: "/tasks",         roles: ["ADMIN","SUBADMIN","EMPLOYEE"], Icon: CheckSquare },
      { key: "supplyChain", path: "/supply-chain",  roles: ["ADMIN","SUBADMIN"], Icon: Truck },
    ],
  },
  {
    groupLabel: "Products & DPP",
    items: [
      { key: "products",        path: "/products",         roles: ["ADMIN","SUBADMIN","EMPLOYEE","CLIENT"], Icon: Package },
      { key: "technicalSheets", path: "/technical-sheets", roles: ["ADMIN","SUBADMIN"], Icon: FileText },
      { key: "scans",           path: "/scans",            roles: ["ADMIN","SUBADMIN"], Icon: QrCode },
    ],
  },
  {
    groupLabel: "Management",
    items: [
      { key: "employees",     path: "/employees",    roles: ["ADMIN","SUBADMIN"], Icon: Users },
      { key: "organizations", path: "/organizations",roles: ["ADMIN","SUBADMIN"], Icon: Building2 },
      { key: "qualityControl",path: "/quality-control", roles: ["ADMIN","SUBADMIN"], Icon: ShieldCheck },
      { key: "users",         path: "/admin/users",  roles: ["ADMIN"],            Icon: UserCog },
      { key: "auditLog",      path: "/audit-log",    roles: ["ADMIN","SUBADMIN"], Icon: ScrollText },
    ],
  },
  {
    groupLabel: "Account",
    items: [
      { key: "settings", path: "/settings", roles: ["ADMIN","SUBADMIN","EMPLOYEE","CLIENT"], Icon: Settings },
    ],
  },
];

function NavLabel({ navKey, t }) {
  if (navKey === "technicalSheets") return t("technicalSheets.title", "Technical Sheets");
  if (navKey === "supplyChain")     return "Supply Chain";
  if (navKey === "qualityControl")  return "Quality Control";
  if (navKey === "auditLog")        return "Audit Log";
  if (navKey === "analytics")       return "Analytics";
  return t(`nav.${navKey}`, navKey);
}

function DashboardLayout({ children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { t }     = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [collapsed, setCollapsed]         = useState(
    () => localStorage.getItem("sidebar-collapsed") === "true"
  );
  const [logoutLoading, setLogoutLoading] = useState(false);

  const rawRole    = (localStorage.getItem("userRole") || "MEMBER").toUpperCase();
  const userName   = localStorage.getItem("userEmail") || "User";
  const displayName = localStorage.getItem("userDisplayName") || userName.split("@")[0] || "User";

  const visibleGroups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((item) => item.roles.includes(rawRole)) }))
    .filter((g) => g.items.length > 0);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try { await logoutUser(); } catch {}
    finally { clearAuthSession(); navigate("/", { replace: true }); }
  };

  const sidebarWidth = collapsed ? "w-[68px]" : "w-64";

  const { unreadCount, openPanel } = useNotifications();

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0B1120] transition-colors duration-300">
      <div className="flex min-h-screen overflow-hidden">

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-[width,transform] duration-300 ease-in-out
            lg:static lg:translate-x-0 lg:shrink-0
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
            ${sidebarWidth}
            bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl
            border-r border-slate-200/60 dark:border-[rgba(255,255,255,0.06)]`}
        >
          {/* Logo */}
          <div className={`flex items-center gap-3 border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)] ${collapsed ? "justify-center px-3 py-5" : "px-5 py-5"}`}>
            <div className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/25">
              <span className="text-xs font-extrabold tracking-tighter">IKS</span>
            </div>
            {!collapsed && (
              <div>
                <p className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-[#F8FAFC]">SmartTex</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#64748B]">DPP Ecosystem</p>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5">
            {visibleGroups.map((group, gIdx) => (
              <div key={group.groupLabel}>
                {/* Group label */}
                {collapsed ? (
                  gIdx > 0 && <div className="my-2 mx-3 h-px bg-slate-100 dark:bg-white/[0.05]" />
                ) : (
                  <p className="px-4 pt-4 pb-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600 select-none">
                    {group.groupLabel}
                  </p>
                )}
                <div className={`space-y-0.5 ${collapsed ? "px-2" : "px-2"}`}>
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    const label = <NavLabel navKey={item.key} t={t} />;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsSidebarOpen(false)}
                        title={collapsed ? String(label) : undefined}
                        className={`group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200
                          ${collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"}
                          ${isActive
                            ? "bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-400 shadow-sm ring-1 ring-brand-100 dark:ring-brand-500/20"
                            : "text-slate-500 dark:text-[#64748B] hover:bg-slate-50 dark:hover:bg-[rgba(255,255,255,0.04)] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
                          }`}
                      >
                        <item.Icon
                          className={`shrink-0 transition-all ${collapsed ? "w-5 h-5" : "w-[18px] h-[18px]"}
                            ${isActive ? "text-brand-600 dark:text-brand-400" : "opacity-60 group-hover:opacity-100"}`}
                          strokeWidth={isActive ? 2.5 : 1.75}
                        />
                        {!collapsed && (
                          <>
                            <span className="truncate flex-1">{label}</span>
                            {isActive && (
                              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 dark:bg-brand-400 shrink-0" />
                            )}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Collapse toggle */}
          <button
            type="button"
            onClick={toggleCollapse}
            className={`hidden lg:flex items-center gap-2 px-4 py-3 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors border-t border-slate-100 dark:border-white/[0.05]
              ${collapsed ? "justify-center" : "justify-end"}`}
          >
            <ChevronLeft
              className={`w-4 h-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
            {!collapsed && <span className="text-[10px] font-bold uppercase tracking-widest">Collapse</span>}
          </button>

          {/* User card */}
          <div className={`border-t border-slate-100 dark:border-[rgba(255,255,255,0.06)] ${collapsed ? "p-2" : "px-3 py-3"}`}>
            {collapsed ? (
              <div className="flex justify-center">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-brand-500/20">
                  {displayName[0]?.toUpperCase() || "U"}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50/80 dark:bg-[rgba(255,255,255,0.03)] border border-slate-100 dark:border-[rgba(255,255,255,0.04)]">
                <div className="h-8 w-8 flex-none rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-brand-500/20">
                  {displayName[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] truncate">{displayName}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#64748B]">{rawRole}</p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Header */}
          <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-[rgba(255,255,255,0.06)] px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <button
                  className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                  onClick={() => setIsSidebarOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5" strokeWidth={1.75} />
                </button>
                <div className="text-sm font-semibold text-slate-500 dark:text-[#64748B] capitalize hidden sm:block">
                  {location.pathname.replace("/", "").replace(/-/g, " ").replace(/\//g, " / ") || "Dashboard"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Theme toggle */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-[rgba(255,255,255,0.04)] border border-slate-200 dark:border-[rgba(255,255,255,0.06)] text-slate-500 dark:text-[#94A3B8] hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-200 dark:hover:border-brand-500/30 transition-all"
                  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {theme === "dark"
                    ? <Sun className="w-4 h-4" strokeWidth={1.75} />
                    : <Moon className="w-4 h-4" strokeWidth={1.75} />
                  }
                </button>

                <NotificationBell unread={unreadCount} onClick={openPanel} />

                <LanguageSwitcher />

                {/* Settings link */}
                <Link
                  to="/settings"
                  className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 dark:bg-[rgba(255,255,255,0.04)] border border-slate-200 dark:border-[rgba(255,255,255,0.06)] text-slate-500 dark:text-[#94A3B8] hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-200 dark:hover:border-brand-500/30 transition-all"
                  aria-label="Settings"
                >
                  <SlidersHorizontal className="w-4 h-4" strokeWidth={1.75} />
                </Link>

                {/* Logout */}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={logoutLoading}
                  className="hidden sm:flex items-center gap-1.5 h-9 px-4 rounded-xl bg-slate-50 dark:bg-[rgba(255,255,255,0.04)] border border-slate-200 dark:border-[rgba(255,255,255,0.06)] text-sm font-semibold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[rgba(255,255,255,0.08)] hover:text-slate-900 dark:hover:text-slate-100 transition-all disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
                  {logoutLoading ? t("nav.loggingOut") : t("nav.logout")}
                </button>

                {/* Mobile logout icon-only */}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={logoutLoading}
                  className="sm:hidden h-9 w-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-[rgba(255,255,255,0.04)] border border-slate-200 dark:border-[rgba(255,255,255,0.06)] text-slate-500 dark:text-[#94A3B8] transition-all"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;
