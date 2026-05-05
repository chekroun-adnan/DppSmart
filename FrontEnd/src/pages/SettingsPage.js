import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import { getCurrentUserProfile } from "../services/authService";

const SETTINGS_KEY = "smartdpp_user_settings";

function readSavedSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return {
        displayName: "",
        notifyEmail: true,
        notifyInApp: true,
        darkMode: false,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      displayName: parsed.displayName || "",
      notifyEmail: Boolean(parsed.notifyEmail),
      notifyInApp: Boolean(parsed.notifyInApp),
      darkMode: Boolean(parsed.darkMode),
    };
  } catch {
    return {
      displayName: "",
      notifyEmail: true,
      notifyInApp: true,
      darkMode: false,
    };
  }
}

function SettingsPage() {
  const { t } = useTranslation();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [settings, setSettings] = useState(readSavedSettings);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const profile = await getCurrentUserProfile();
        if (!mounted) return;

        setEmail(profile?.email || localStorage.getItem("userEmail") || "");
        setRole(profile?.role || localStorage.getItem("userRole") || "MEMBER");
        setSettings((current) => ({
          ...current,
          displayName: current.displayName || profile?.name || "",
        }));
      } catch (requestError) {
        if (mounted) {
          setError(requestError.message || t("errors.serverError", "Unable to load user profile."));
          setEmail(localStorage.getItem("userEmail") || "");
          setRole(localStorage.getItem("userRole") || "MEMBER");
        }
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    }

    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = () => {
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      setSuccess(t("settings.languageChanged", "Settings saved successfully."));
    } catch {
      setError(t("settings.saveFailed", "Unable to save settings right now."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl animate-fade-in">
        <header className="mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">{t("settings.accountPreferences", "Account Preferences")}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{t("settings.title")}</h1>
          <p className="mt-2 text-sm text-slate-500">{t("settings.subtitle", "Configure your workspace and notification preferences.")}</p>
        </header>

        <div className="space-y-6">
          <section className="glass-card p-8 border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-6">{t("settings.profileSnapshot", "Profile Snapshot")}</h3>
            {loadingProfile ? (
              <div className="flex items-center gap-3 text-slate-400">
                <div className="w-5 h-5 border-2 border-slate-200 border-t-brand-600 rounded-full animate-spin"></div>
                <span className="text-sm font-medium">{t("settings.fetchingProfile", "Fetching profile...")}</span>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("settings.registeredEmail", "Registered Email")}</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{email || t("settings.notAvailable", "Not available")}</p>
                </div>
                <div className="p-4 rounded-2xl bg-brand-50 border border-brand-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">{t("settings.accessRole", "Access Role")}</p>
                  <p className="mt-1 text-sm font-bold text-brand-700">{role || t("settings.member", "Member")}</p>
                </div>
              </div>
            )}
          </section>

          <section className="glass-card p-8 border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-6">{t("settings.personalization", "Personalization")}</h3>
            <div className="space-y-6">
              <div>
                <label htmlFor="displayName" className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  {t("settings.displayName", "Display name")}
                </label>
                <input
                  id="displayName"
                  value={settings.displayName}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, displayName: event.target.value }))
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm text-slate-900 outline-none transition-all focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  placeholder={t("settings.displayNamePlaceholder", "Your full name")}
                />
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("settings.systemPreferences", "System Preferences")}</p>
                
                {[
                  { id: 'notifyEmail', label: t("settings.emailNotifications", "Email Notifications"), desc: t("settings.emailNotificationsDesc", "Receive daily digests and system alerts via email."), value: settings.notifyEmail },
                  { id: 'notifyInApp', label: t("settings.inAppAlerts", "In-App Alerts"), desc: t("settings.inAppAlertsDesc", "Real-time updates on DPP status and compliance changes."), value: settings.notifyInApp },
                  { id: 'darkMode', label: t("settings.adaptiveInterface", "Adaptive Interface"), desc: t("settings.adaptiveInterfaceDesc", "Automatically switch between light and dark themes."), value: settings.darkMode }
                ].map((item) => (
                  <label key={item.id} className="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="relative flex items-center h-6">
                      <input
                        type="checkbox"
                        checked={item.value}
                        onChange={(event) =>
                          setSettings((current) => ({ ...current, [item.id]: event.target.checked }))
                        }
                        className="h-5 w-5 rounded-lg border-slate-300 text-brand-600 focus:ring-brand-500 transition-all cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold animate-shake">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold animate-fade-in">
                {success}
              </div>
            )}

            <div className="mt-10 pt-8 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary py-3 px-8 shadow-lg shadow-brand-500/20"
              >
                {saving ? t("settings.savingChanges", "Saving Changes...") : t("settings.applySettings", "Apply Settings")}
              </button>
            </div>
          </section>

          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            {t("settings.footer", "SmartTex DPP Platform • Secure Enterprise Access")}
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default SettingsPage;
