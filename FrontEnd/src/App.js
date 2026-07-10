import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./i18n";
import { RTL_LANGUAGES } from "./i18n";
import { ThemeProvider } from "./context/ThemeContext";
import AboutSection from "./components/AboutSection";
import ContactSection from "./components/ContactSection";
import DigitalTransformationSection from "./components/DigitalTransformationSection";
import Footer from "./components/Footer";
import HeroSection from "./components/HeroSection";
import Navbar from "./components/Navbar";
import ServicesSection from "./components/ServicesSection";
import StatsSection from "./components/StatsSection";
import WhyChooseSection from "./components/WhyChooseSection";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import RegisterPage from "./pages/RegisterPage";
import SettingsPage from "./pages/SettingsPage";
import ProductsPage from "./pages/ProductsPage";
import OrdersPage from "./pages/OrdersPage";
import EmployeesPage from "./pages/EmployeesPage";
import ProductionPage from "./pages/ProductionPage";
import BillingPage from "./pages/BillingPage";
import StockPage from "./pages/StockPage";
import OrganizationsPage from "./pages/OrganizationsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import ScansPage from "./pages/ScansPage";
import PassportPage from "./pages/PassportPage";
import TasksPage from "./pages/TasksPage";
import TechnicalSheetsPage from "./pages/TechnicalSheetsPage";
import OAuth2CallbackPage from "./pages/OAuth2CallbackPage";
import QualityControlPage from "./pages/QualityControlPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AuditLogPage from "./pages/AuditLogPage";
import ClientOrdersPage from "./pages/ClientOrdersPage";
import QuoteDetailPage from "./pages/QuoteDetailPage";
import ClientSupportPage from "./pages/ClientSupportPage";
import ClientNotificationsPage from "./pages/ClientNotificationsPage";
import ClientPaymentPage from "./pages/ClientPaymentPage";
import PaymentDetailsPage from "./pages/PaymentDetailsPage";
import AdminPaymentsPage from "./pages/AdminPaymentsPage";
import SupplyChainPage from "./pages/SupplyChainPage";
import PredictiveAnalyticsPage from "./pages/PredictiveAnalyticsPage";
import ReorderPage from "./pages/ReorderPage";
import AllocationReviewPage from "./pages/AllocationReviewPage";
import SecuritySessionPage from "./pages/SecuritySessionPage";
import EmployeeDashboardPage from "./pages/EmployeeDashboardPage";
import MyTasksPage from "./pages/MyTasksPage";
import MyOperationsPage from "./pages/MyOperationsPage";
import TodaySchedulePage from "./pages/TodaySchedulePage";
import ProductionQueuePage from "./pages/ProductionQueuePage";
import IssueReportingPage from "./pages/IssueReportingPage";
import PerformancePage from "./pages/PerformancePage";
import MyAttendancePage from "./pages/MyAttendancePage";
import MyLeavesPage from "./pages/MyLeavesPage";
import MyProfilePage from "./pages/MyProfilePage";
import InvoicesPage from "./pages/InvoicesPage";
import ClientInvoicesPage from "./pages/ClientInvoicesPage";
import OperationsPage from "./pages/OperationsPage";
import { isAuthenticated } from "./services/authService";
import ChatbotWidget from "./components/ChatbotWidget";
import { NotificationProvider } from "./context/NotificationContext";

function roleHome() {
  const role = (localStorage.getItem("userRole") || "").toUpperCase();
  if (role === "CLIENT") return "/client-orders";
  if (role === "EMPLOYEE") return "/employee-dashboard";
  return "/dashboard";
}

function PublicRoute({ children }) {
  return isAuthenticated() ? <Navigate to={roleHome()} replace /> : children;
}

function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function NonClientRoute({ children }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  const role = (localStorage.getItem("userRole") || "").toUpperCase();
  return role === "CLIENT" ? <Navigate to="/client-orders" replace /> : children;
}

function EmployeeRoute({ children }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  const role = (localStorage.getItem("userRole") || "").toUpperCase();
  if (role !== "EMPLOYEE") return <Navigate to="/dashboard" replace />;
  return children;
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-slate-900 focus:shadow"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <HeroSection />
        <AboutSection />
        <StatsSection />
        <ServicesSection />
        <DigitalTransformationSection />
        <WhyChooseSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}

function RtlProvider({ children }) {
  const { i18n } = useTranslation();
  useEffect(() => {
    const dir = RTL_LANGUAGES.has(i18n.language) ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);
  return children;
}

function App() {
  return (
    <ThemeProvider>
    <NotificationProvider>
    <BrowserRouter>
      <RtlProvider>
      <Routes>
        <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route path="/dashboard" element={<NonClientRoute><DashboardPage /></NonClientRoute>} />
        <Route path="/products" element={<PrivateRoute><ProductsPage /></PrivateRoute>} />
        <Route path="/orders" element={<PrivateRoute><OrdersPage /></PrivateRoute>} />
        <Route path="/client-orders" element={<PrivateRoute><ClientOrdersPage /></PrivateRoute>} />
        <Route path="/payments" element={<PrivateRoute><ClientPaymentPage /></PrivateRoute>} />
        <Route path="/payments/success" element={<PrivateRoute><ClientPaymentPage /></PrivateRoute>} />
        <Route path="/payments/return" element={<PrivateRoute><ClientPaymentPage /></PrivateRoute>} />
        <Route path="/payment" element={<PrivateRoute><PaymentDetailsPage /></PrivateRoute>} />
        <Route path="/admin/payments" element={<PrivateRoute><AdminPaymentsPage /></PrivateRoute>} />
        <Route path="/quote" element={<PrivateRoute><QuoteDetailPage /></PrivateRoute>} />
        <Route path="/quote/:id" element={<PrivateRoute><QuoteDetailPage /></PrivateRoute>} />
        <Route path="/employees" element={<PrivateRoute><EmployeesPage /></PrivateRoute>} />
        <Route path="/workforce"  element={<Navigate to="/employees?tab=workforce"  replace />} />
        <Route path="/attendance" element={<Navigate to="/employees?tab=attendance" replace />} />
        <Route path="/leaves"     element={<Navigate to="/employees?tab=leaves"     replace />} />
        <Route path="/production" element={<PrivateRoute><ProductionPage /></PrivateRoute>} />
        <Route path="/billing" element={<PrivateRoute><BillingPage /></PrivateRoute>} />
        <Route path="/stock" element={<PrivateRoute><StockPage /></PrivateRoute>} />
        <Route path="/organizations" element={<PrivateRoute><OrganizationsPage /></PrivateRoute>} />
        <Route path="/admin/users" element={<PrivateRoute><AdminUsersPage /></PrivateRoute>} />
        <Route path="/scans" element={<PrivateRoute><ScansPage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
        <Route path="/passport/:productId" element={<PassportPage />} />
        <Route path="/tasks" element={<PrivateRoute><TasksPage /></PrivateRoute>} />
        <Route path="/technical-sheets" element={<PrivateRoute><TechnicalSheetsPage /></PrivateRoute>} />
        <Route path="/operations" element={<PrivateRoute><OperationsPage /></PrivateRoute>} />
        <Route path="/supply-chain" element={<PrivateRoute><SupplyChainPage /></PrivateRoute>} />
        <Route path="/quality-control" element={<PrivateRoute><QualityControlPage /></PrivateRoute>} />
        <Route path="/analytics" element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
        <Route path="/audit-log" element={<PrivateRoute><AuditLogPage /></PrivateRoute>} />
        <Route path="/support" element={<PrivateRoute><ClientSupportPage /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><ClientNotificationsPage /></PrivateRoute>} />
        <Route path="/predictive-analytics" element={<PrivateRoute><PredictiveAnalyticsPage /></PrivateRoute>} />
        <Route path="/reorder" element={<PrivateRoute><ReorderPage /></PrivateRoute>} />
        <Route path="/allocation-review" element={<NonClientRoute><AllocationReviewPage /></NonClientRoute>} />

        <Route path="/security" element={<NonClientRoute><SecuritySessionPage /></NonClientRoute>} />
        <Route path="/oauth2/callback" element={<OAuth2CallbackPage />} />

        {/* Employee-only routes */}
        <Route path="/employee-dashboard" element={<EmployeeRoute><EmployeeDashboardPage /></EmployeeRoute>} />
        <Route path="/my-tasks"      element={<EmployeeRoute><MyTasksPage /></EmployeeRoute>} />
        <Route path="/my-operations" element={<EmployeeRoute><MyOperationsPage /></EmployeeRoute>} />
        <Route path="/today-schedule" element={<EmployeeRoute><TodaySchedulePage /></EmployeeRoute>} />
        <Route path="/production-queue" element={<EmployeeRoute><ProductionQueuePage /></EmployeeRoute>} />
        <Route path="/report-issue"  element={<EmployeeRoute><IssueReportingPage /></EmployeeRoute>} />
        <Route path="/performance"   element={<EmployeeRoute><PerformancePage /></EmployeeRoute>} />
        <Route path="/my-attendance" element={<EmployeeRoute><MyAttendancePage /></EmployeeRoute>} />
        <Route path="/my-leaves"     element={<EmployeeRoute><MyLeavesPage /></EmployeeRoute>} />
        <Route path="/my-profile"    element={<EmployeeRoute><MyProfilePage /></EmployeeRoute>} />
        <Route path="/invoices" element={<PrivateRoute><InvoicesPage /></PrivateRoute>} />
        <Route path="/client-invoices" element={<PrivateRoute><ClientInvoicesPage /></PrivateRoute>} />
      </Routes>
      <ChatbotWidget />
      </RtlProvider>
    </BrowserRouter>
    </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
