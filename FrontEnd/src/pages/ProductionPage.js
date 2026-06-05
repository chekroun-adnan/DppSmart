import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import ProductionOrdersView from "../components/ProductionOrdersView";

export default function ProductionPage() {
  const { t } = useTranslation();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">{t("production.manufacturing", "Manufacturing")}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{t("production.title")}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("production.subtitle", "Manage production workflow steps.")}</p>
          </div>
        </div>

        {/* Orders in Production */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Orders in Production</h2>
            <span className="text-[10px] text-slate-400">From linked orders</span>
          </div>
          <ProductionOrdersView />
        </div>
      </div>
    </DashboardLayout>
  );
}
