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
import ClientSupportPage from "./pages/ClientSupportPage";
import ClientNotificationsPage from "./pages/ClientNotificationsPage";
import SupplyChainPage from "./pages/SupplyChainPage";
import PredictiveAnalyticsPage from "./pages/PredictiveAnalyticsPage";
import ReorderPage from "./pages/ReorderPage";
import AllocationReviewPage from "./pages/AllocationReviewPage";
import OrderWorkflowPage from "./pages/OrderWorkflowPage";
import SecuritySessionPage from "./pages/SecuritySessionPage";
import { isAuthenticated } from "./services/authService";
import ChatbotWidget from "./components/ChatbotWidget";
import { NotificationProvider } from "./context/NotificationContext";

function PublicRoute({ children }) {
  return isAuthenticated() ? <Navigate to="/dashboard" replace /> : children;
}

function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function NonClientRoute({ children }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  const role = (localStorage.getItem("userRole") || "").toUpperCase();
  return role === "CLIENT" ? <Navigate to="/client-orders" replace /> : children;
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
        <Route path="/employees" element={<PrivateRoute><EmployeesPage /></PrivateRoute>} />
        <Route path="/production" element={<PrivateRoute><ProductionPage /></PrivateRoute>} />
        <Route path="/stock" element={<PrivateRoute><StockPage /></PrivateRoute>} />
        <Route path="/organizations" element={<PrivateRoute><OrganizationsPage /></PrivateRoute>} />
        <Route path="/admin/users" element={<PrivateRoute><AdminUsersPage /></PrivateRoute>} />
        <Route path="/scans" element={<PrivateRoute><ScansPage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
        <Route path="/passport/:productId" element={<PassportPage />} />
        <Route path="/tasks" element={<PrivateRoute><TasksPage /></PrivateRoute>} />
        <Route path="/technical-sheets" element={<PrivateRoute><TechnicalSheetsPage /></PrivateRoute>} />
        <Route path="/supply-chain" element={<PrivateRoute><SupplyChainPage /></PrivateRoute>} />
        <Route path="/quality-control" element={<PrivateRoute><QualityControlPage /></PrivateRoute>} />
        <Route path="/analytics" element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
        <Route path="/audit-log" element={<PrivateRoute><AuditLogPage /></PrivateRoute>} />
        <Route path="/support" element={<PrivateRoute><ClientSupportPage /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><ClientNotificationsPage /></PrivateRoute>} />
        <Route path="/predictive-analytics" element={<PrivateRoute><PredictiveAnalyticsPage /></PrivateRoute>} />
        <Route path="/reorder" element={<PrivateRoute><ReorderPage /></PrivateRoute>} />
        <Route path="/allocation-review" element={<NonClientRoute><AllocationReviewPage /></NonClientRoute>} />
        <Route path="/order-workflow" element={<NonClientRoute><OrderWorkflowPage /></NonClientRoute>} />
        <Route path="/security" element={<PrivateRoute><SecuritySessionPage /></PrivateRoute>} />
        <Route path="/oauth2/callback" element={<OAuth2CallbackPage />} />
      </Routes>
      <ChatbotWidget />
      </RtlProvider>
    </BrowserRouter>
    </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
