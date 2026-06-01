import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { registerUser, storeAuthSession } from "../services/authService";

function FormLabel({ children }) {
  return (
    <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-2 block">
      {children}
    </label>
  );
}

function Input({ name, type = "text", placeholder, value, onChange }) {
  return (
    <input
      name={name}
      type={type}
      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required
    />
  );
}

function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError(t("errors.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const authResponse = await registerUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      storeAuthSession(authResponse);
      navigate(authResponse.role === "CLIENT" ? "/client-orders" : "/dashboard");
    } catch (requestError) {
      if (requestError.status === 429) {
        const wait = requestError.retryAfter || 60;
        setError(`Too many registration attempts. Please wait ${wait} seconds before trying again.`);
      } else if (requestError.fieldErrors) {
        const msgs = Object.values(requestError.fieldErrors).join(" ");
        setError(msgs || requestError.message);
      } else {
        setError(requestError.message || t("auth.registerFailed", "Registration failed. Please try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={t("auth.createAccount")}
      subtitle={t("auth.joinEcosystem")}
      actionLabel={t("auth.createAccount")}
      alternateLabel={t("auth.alreadyHaveAccount")}
      switchLabel={t("auth.signIn")}
      alternateHref="/login"
      sideTitle={t("auth.sideTitle")}
      sideDescription={t("auth.sideDescription")}
      onSubmit={handleSubmit}
      submitDisabled={loading}
      submitLabel={loading ? t("auth.registering", "Registering...") : t("auth.createAccount")}
    >
      <div className="grid gap-2">
        <FormLabel>{t("auth.fullName", "Full name")}</FormLabel>
        <Input
          name="name"
          placeholder="Alex Rivera"
          value={form.name}
          onChange={handleChange}
        />
      </div>
      <div className="grid gap-2">
        <FormLabel>{t("auth.emailAddress")}</FormLabel>
        <Input
          name="email"
          type="email"
          placeholder="alex@industry.com"
          value={form.email}
          onChange={handleChange}
        />
      </div>
      <div className="grid gap-2">
        <FormLabel>{t("auth.password")}</FormLabel>
        <Input
          name="password"
          type="password"
          placeholder="••••••••••••"
          value={form.password}
          onChange={handleChange}
        />
      </div>
      <div className="grid gap-2">
        <FormLabel>{t("auth.confirmPassword")}</FormLabel>
        <Input
          name="confirmPassword"
          type="password"
          placeholder="••••••••••••"
          value={form.confirmPassword}
          onChange={handleChange}
        />
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <p className="text-center text-xs text-slate-500">
        {t("register.agreement", "By creating an account, you agree to the Digital Product Passport protocols.")}
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

export default RegisterPage;
