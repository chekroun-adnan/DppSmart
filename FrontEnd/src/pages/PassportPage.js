import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { getOrganizationById, getProductById, getProductDpp, isAuthenticated } from "../services/authService";

function ScoreMeter({ score }) {
  const pct = typeof score === "number" ? Math.min(Math.max(score, 0), 100) : 0;
  const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-2xl font-extrabold text-white leading-none">{typeof score === "number" ? score : "—"}</span>
        <span className="block text-[9px] font-bold uppercase tracking-wider text-white/60 mt-0.5">AI Score</span>
      </div>
    </div>
  );
}

function InfoCard({ label, value, icon }) {
  if (!value) return null;
  return (
    <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900 break-words">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StepBadge({ step, index, total }) {
  const statusColor = {
    COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
    PENDING: "bg-slate-100 text-slate-500 border-slate-200",
  };
  const dotColor = {
    COMPLETED: "bg-emerald-500",
    IN_PROGRESS: "bg-blue-500 animate-pulse",
    PENDING: "bg-slate-300",
  };
  const status = step.status || "PENDING";
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${dotColor[status] || dotColor.PENDING}`} />
        {index < total - 1 && <div className="w-0.5 flex-1 bg-slate-100 mt-1" />}
      </div>
      <div className="pb-5 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-900">{step.stepName || `Step ${index + 1}`}</span>
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColor[status] || statusColor.PENDING}`}>
            {status.replace("_", " ")}
          </span>
        </div>
        {step.description && <p className="mt-1 text-xs text-slate-500">{step.description}</p>}
      </div>
    </div>
  );
}

export default function PassportPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [product, setProduct] = useState(null);
  const [orgName, setOrgName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loggedIn = isAuthenticated();
  const isClient = (localStorage.getItem("userRole") || "").toUpperCase() === "CLIENT";
  const isPublic = !loggedIn;

  useEffect(() => {
    if (!productId) return;
    let mounted = true;
    const fetch = (isClient || isPublic) ? getProductDpp(productId) : getProductById(productId);
    fetch
      .then((data) => { if (mounted) setProduct(data); })
      .catch((e) => { if (mounted) setError(e.message || "Failed to load product."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [productId, isClient, isPublic]);

  useEffect(() => {
    if (!product?.organizationId || isClient || isPublic) return;
    let mounted = true;
    getOrganizationById(product.organizationId)
      .then((org) => { if (mounted) setOrgName(org?.name || null); })
      .catch(() => { if (mounted) setOrgName(null); });
    return () => { mounted = false; };
  }, [product?.organizationId, isClient, isPublic]); // eslint-disable-line

  const imageUrl = product?.imageUrl || product?.extraFields?.imageUrl || product?.additionalInfo?.imageUrl || null;
  const suppEntries = Object.entries(product?.extraFields || product?.additionalInfo || {})
    .filter(([k]) => k !== "imageUrl" && product?.extraFields?.[k] !== null && product?.additionalInfo?.[k] !== null);

  const inner = (
      <div className="space-y-0">
        
        {loggedIn && (
          <button
            type="button"
            onClick={() => navigate("/products")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("products.backToProducts")}
          </button>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">{t("passport.loadingPassport")}</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>
        ) : product ? (
          <div className="space-y-6">

            
            <div className="rounded-3xl overflow-hidden shadow-xl">
              
              <div className="relative bg-gradient-to-br from-brand-600 via-brand-700 to-slate-900 px-8 pt-10 pb-10">
                
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4 pointer-events-none" />

                <div className="relative flex flex-col sm:flex-row items-start gap-7">
                  
                  <div className="shrink-0">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.productName}
                        className="h-36 w-36 rounded-2xl object-cover ring-4 ring-white/20 shadow-2xl"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : (
                      <div className="h-36 w-36 rounded-2xl bg-white/10 ring-2 ring-white/20 flex items-center justify-center">
                        <svg className="w-14 h-14 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                  </div>

                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 flex-wrap">
                      <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                        Digital Product Passport
                      </span>
                      {product.sku && (
                        <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold text-white/80">
                          SKU: {product.sku}
                        </span>
                      )}
                    </div>
                    <h1 className="mt-3 text-3xl font-extrabold text-white leading-tight">
                      {product.productName || "Unnamed Product"}
                    </h1>
                    {!isClient && <p className="mt-1 text-sm text-brand-200 font-mono">{product.id}</p>}
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      {product.variantName && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">{product.variantName}</span>
                      )}
                      {Array.isArray(product.materialsComposition) && product.materialsComposition.length > 0 && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                          {product.materialsComposition.map(m => m.materialName).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  
                  {!isClient && (
                    <div className="shrink-0">
                      <ScoreMeter score={product.aiScore} />
                    </div>
                  )}
                </div>

                
                {!isClient && product.aiSummary && (
                  <div className="relative mt-6 rounded-2xl bg-white/10 border border-white/10 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-200 mb-1">AI Summary</p>
                    <p className="text-sm text-white/85 leading-relaxed">{product.aiSummary}</p>
                  </div>
                )}
              </div>

              
              <div className="bg-slate-900 px-8 py-4 grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/5">
                {[
                  { label: t("passport.variant"), value: product.variantName || "—" },
                  { label: "SKU", value: product.sku || "—" },
                  { label: t("passport.materials"), value: Array.isArray(product.materialsComposition) && product.materialsComposition.length > 0 ? product.materialsComposition.length.toString() : "—" },
                  !isClient && { label: t("passport.aiAssessment"), value: typeof product.aiScore === "number" ? `${product.aiScore}/100` : "—" },
                ].filter(Boolean).map(({ label, value }) => (
                  <div key={label} className="px-5 first:pl-0 last:pr-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
                    <p className="mt-0.5 text-sm font-bold text-white truncate">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            
            <div className="grid gap-6 lg:grid-cols-3">

              
              <div className="lg:col-span-2 space-y-6">

                
                <div className="glass-card p-6">
                  <h2 className="text-sm font-extrabold uppercase tracking-[0.15em] text-slate-400 mb-4">{t("passport.productDetails")}</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <InfoCard label={t("passport.productName")} value={product.productName}
                      icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    <InfoCard label={t("passport.variantName")} value={product.variantName}
                      icon="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                    <InfoCard label="SKU" value={product.sku}
                      icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    {orgName && (
                      <InfoCard label={t("passport.organization")} value={orgName}
                        icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    )}
                  </div>
                </div>

                
                {Array.isArray(product.materialsComposition) && product.materialsComposition.length > 0 && (
                  <div className="glass-card p-6">
                    <div className="flex flex-col sm:flex-row sm:gap-10">
                      <div className="shrink-0 mb-4 sm:mb-0 sm:w-44">
                        <h2 className="text-base font-bold text-slate-800">{t("passport.materialsComposition")}</h2>
                      </div>
                      <div className="flex-1 space-y-3">
                        {product.materialsComposition.map((mat, idx) => (
                          <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-1.5">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm text-slate-500 w-36 shrink-0">{t("passport.materialName")}:</span>
                              <span className="text-sm font-semibold text-slate-900">{mat.materialName}</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm text-slate-500 w-36 shrink-0">{t("passport.percentage")}:</span>
                              <span className="text-sm font-semibold text-slate-900">{mat.percentage}</span>
                            </div>
                            {mat.recycledContent && (
                              <>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-sm text-slate-500 w-36 shrink-0">{t("passport.recycledContent")}:</span>
                                  <span className="text-sm font-semibold text-emerald-600">{t("common.yes")}</span>
                                </div>
                                {mat.recycledPercentage != null && mat.recycledPercentage > 0 && (
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-sm text-slate-500 w-36 shrink-0">{t("passport.recycledPercentage")}:</span>
                                    <span className="text-sm font-semibold text-slate-900">{mat.recycledPercentage}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                
                {product.endOfLifeInstructions && (
                  <div className="glass-card p-6">
                    <h2 className="text-sm font-extrabold uppercase tracking-[0.15em] text-slate-400 mb-4">{t("passport.endOfLife")}</h2>
                    <p className="text-sm text-slate-700 leading-relaxed">{product.endOfLifeInstructions}</p>
                  </div>
                )}

                
                {suppEntries.length > 0 && (
                  <div className="glass-card p-6">
                    <h2 className="text-sm font-extrabold uppercase tracking-[0.15em] text-slate-400 mb-4">{t("passport.extraFields")}</h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {suppEntries.map(([key, value]) => (
                        <div key={key} className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">{key}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900 break-words">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                
                {Array.isArray(product.productionSteps) && product.productionSteps.length > 0 && (
                  <div className="glass-card p-6">
                    <h2 className="text-sm font-extrabold uppercase tracking-[0.15em] text-slate-400 mb-5">{t("passport.productionSteps")}</h2>
                    <div>
                      {product.productionSteps.map((step, i) => (
                        <StepBadge key={i} step={step} index={i} total={product.productionSteps.length} />
                      ))}
                    </div>
                  </div>
                )}

                
                {!isClient && Array.isArray(product.aiMissingFields) && product.aiMissingFields.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-xs font-bold uppercase tracking-widest text-amber-700">{t("passport.incompleteFields")}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {product.aiMissingFields.map((f) => (
                        <span key={f} className="rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">{f}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              
              <div className="space-y-4">

                
                {product.qrUrl && (
                  <div className="glass-card p-6 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">{t("passport.qrCode")}</p>
                    <div className="inline-flex items-center justify-center bg-white rounded-2xl p-4 ring-1 ring-slate-100 shadow-sm">
                      <img src={product.qrUrl} alt="QR Code" className="w-40 h-40 object-contain" />
                    </div>
                    <p className="mt-3 text-xs text-slate-400">{t("passport.scanToAccess")}</p>
                    <a
                      href={product.qrUrl}
                      download={`${product.productName || product.id}-qr.png`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {t("passport.downloadQr")}
                    </a>
                  </div>
                )}

                
                {product.id && (
                  <div className="glass-card p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{t("passport.passportUrl")}</p>
                    <p className="text-[11px] font-mono text-slate-500 break-all leading-relaxed mb-3">
                      {`${window.location.origin}/passport/${product.id}`}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/passport/${product.id}`)}
                      className="w-full h-9 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      {t("common.copyUrl")}
                    </button>
                  </div>
                )}

                
                {!isClient && (
                  <div className="glass-card p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{t("passport.productIdentifier")}</p>
                    <p className="text-xs font-mono text-slate-700 break-all bg-slate-50 rounded-xl p-3 border border-slate-100">{product.id}</p>
                  </div>
                )}

                
                {!isClient && typeof product.aiScore === "number" && (
                  <div className="glass-card p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">{t("passport.aiAssessment")}</p>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-2xl font-extrabold ${product.aiScore >= 80 ? "text-emerald-600" : product.aiScore >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                        {product.aiScore}
                      </span>
                      <span className="text-sm text-slate-400 font-medium">/ 100</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${product.aiScore >= 80 ? "bg-emerald-500" : product.aiScore >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                        style={{ width: `${product.aiScore}%` }}
                      />
                    </div>
                    <p className={`mt-2 text-xs font-semibold ${product.aiScore >= 80 ? "text-emerald-600" : product.aiScore >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                      {product.aiScore >= 80 ? t("passport.excellentScore") : product.aiScore >= 50 ? t("passport.moderateScore") : t("passport.lowScore")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
  );

  if (isPublic) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-slate-900 px-6 py-4 flex items-center justify-between">
          <span className="text-white font-bold text-lg tracking-tight">SmartTex DPP</span>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <a href="/login" className="text-sm font-semibold text-white/70 hover:text-white transition-colors">
              {t("auth.signIn")}
            </a>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          {inner}
        </main>
      </div>
    );
  }

  return <DashboardLayout>{inner}</DashboardLayout>;
}
