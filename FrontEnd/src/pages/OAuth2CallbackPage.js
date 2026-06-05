import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { storeAuthSession } from "../services/authService";

export default function OAuth2CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token        = params.get("token");
    const refreshToken = params.get("refreshToken");
    const userId       = params.get("userId");
    const email        = params.get("email");
    const role         = params.get("role");

    if (!token) {
      
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: "OAUTH2_FAILURE" }, window.location.origin);
        window.close();
      } else {
        navigate("/login?error=oauth_failed", { replace: true });
      }
      return;
    }

    
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: "OAUTH2_SUCCESS", token, refreshToken, userId, email, role },
        window.location.origin
      );
      window.close();
      return;
    }

    
    storeAuthSession({ accessToken: token, refreshToken, userId, email, role });
    if (role === "CLIENT") navigate("/client-orders", { replace: true });
    else if (role === "EMPLOYEE") navigate("/employee-dashboard", { replace: true });
    else navigate("/dashboard", { replace: true });
  }, [navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#0B1120]">
      <div className="flex flex-col items-center gap-4">
        <svg className="h-10 w-10 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Signing you in…</p>
      </div>
    </div>
  );
}
