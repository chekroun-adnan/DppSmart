import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthShell from "../components/AuthShell";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { loginUser, storeAuthSession } from "../services/authService";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

function FormLabel({ children }) {
  return (
    <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-2 block">
      {children}
    </label>
  );
}

function Input({ name, type = "text", placeholder, value, onChange }) {
  return (
    <input
      name={name}
      type={type}
      className="h-12 w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-5 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required
    />
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = () => {
    setError("");
    window.location.href = `${API_URL}/oauth2/authorization/google`;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const authResponse = await loginUser({
        email: form.email.trim(),
        password: form.password,
      });
      storeAuthSession(authResponse);
      const role = authResponse.role;
      if (role === "CLIENT") navigate("/client-orders");
      else if (role === "EMPLOYEE") navigate("/employee-dashboard");
      else navigate("/dashboard");
    } catch (requestError) {
      if (requestError.status === 429) {
        const wait = requestError.retryAfter || 60;
        setError(`Too many login attempts. Please wait ${wait} seconds before trying again.`);
      } else if (requestError.fieldErrors) {
        const msgs = Object.values(requestError.fieldErrors).join(" ");
        setError(msgs || requestError.message);
      } else {
        setError(requestError.message || t("auth.loginFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={t("auth.welcomeBack")}
      subtitle={t("auth.accessDpp")}
      actionLabel={t("auth.loginToWorkspace")}
      alternateLabel={t("auth.noAccount")}
      switchLabel={t("auth.registerOrg")}
      alternateHref="/register"
      sideTitle={t("auth.sideTitle")}
      sideDescription={t("auth.sideDescription")}
      onSubmit={handleSubmit}
      submitDisabled={loading}
      submitLabel={loading ? t("auth.signingIn") : t("auth.loginToWorkspace")}
    >
      
      <div className="flex justify-end -mt-2 mb-1">
        <LanguageSwitcher />
      </div>

      <div className="grid gap-2">
        <FormLabel>{t("auth.emailAddress")}</FormLabel>
        <Input
          name="email"
          type="email"
          placeholder="name@company.com"
          value={form.email}
          onChange={handleChange}
        />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <FormLabel>{t("auth.password")}</FormLabel>
          <button
            type="button"
            className="text-xs font-semibold text-slate-700 transition hover:text-slate-900"
          >
            {t("auth.forgotPassword")}
          </button>
        </div>
        <Input
          name="password"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
        />
      </div>

      
      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium text-slate-400">{t("auth.orContinueWith")}</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {t("auth.continueWithGoogle")}
      </button>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/40 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
        {t("auth.networkStatus")}: <span className="font-semibold text-emerald-700 dark:text-emerald-400">{t("auth.stable")}</span>{" "}
        • {t("auth.dppSyncRate")}: <span className="font-semibold text-slate-900 dark:text-white">99.9%</span>
      </div>

      <p className="text-center text-xs text-slate-500">
        {t("auth.euCompliant")}
      </p>

      <Link
        to="/"
        className="mt-3 inline-flex items-center justify-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 transition hover:text-slate-900"
      >
        {t("auth.backToLanding")}
      </Link>
    </AuthShell>
  );
}

export default LoginPage;
