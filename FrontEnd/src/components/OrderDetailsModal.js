import { useState } from "react";
import { Package, X, Edit, ExternalLink } from "lucide-react";

export default function OrderDetailsModal({
  selectedOrder,
  setSelectedOrder,
  orderLoading,
  handleUpdateUnitsPerBox,
  statusColor,
  navigate
}) {
  const [editingUnits, setEditingUnits] = useState(false);
  const [newUnitsPerBox, setNewUnitsPerBox] = useState("");

  if (!selectedOrder && !orderLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedOrder(null)}>
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/[0.06] p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Package size={18} className="text-blue-500" />
            Order Details
          </h2>
          <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {orderLoading ? (
          <div className="text-center py-8 text-sm text-slate-400">Loading order...</div>
        ) : selectedOrder && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500">Reference</span>
                <p className="font-medium text-slate-900 dark:text-white">{selectedOrder.orderReference || "—"}</p>
              </div>
              <div>
                <span className="text-slate-500">Status</span>
                <p className="font-medium">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(selectedOrder.expedition?.status)}`}>
                    {selectedOrder.expedition?.status?.replace(/_/g, " ") || selectedOrder.status}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-slate-500">Total Quantity</span>
                <p className="font-medium text-slate-900 dark:text-white">{selectedOrder.totalQuantity ?? selectedOrder.expedition?.totalQuantity ?? "—"}</p>
              </div>
              <div>
                <span className="text-slate-500">Packed</span>
                <p className="font-medium text-slate-900 dark:text-white">{selectedOrder.expedition?.packedQuantity ?? 0} / {selectedOrder.expedition?.totalQuantity ?? 0}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Boxes</span>
                <p className="font-medium text-slate-900 dark:text-white">
                  {selectedOrder.expedition?.filledBoxes ?? 0}/{selectedOrder.expedition?.requiredBoxes ?? 0}
                  {selectedOrder.expedition?.partialBoxes > 0 && <span className="text-amber-500 ml-1">(+{selectedOrder.expedition.partialBoxes} partial)</span>}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Units/Box</span>
                <p className="font-medium text-slate-900 dark:text-white flex items-center gap-1">
                  {selectedOrder.expedition?.unitsPerBox ?? "—"}
                  {selectedOrder.expedition?.status !== "SHIPPED" && selectedOrder.expedition?.status !== "DELIVERED" && selectedOrder.expedition?.packedQuantity === 0 && (
                    <button
                      onClick={() => { setNewUnitsPerBox(String(selectedOrder.expedition?.unitsPerBox || "")); setEditingUnits(true); }}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit size={12} />
                    </button>
                  )}
                </p>
              </div>
            </div>

            {editingUnits && (
              <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-200 dark:border-purple-800">
                <input
                  type="number"
                  min="1"
                  value={newUnitsPerBox}
                  onChange={(e) => setNewUnitsPerBox(e.target.value)}
                  placeholder="New units per box"
                  className="flex-1 min-w-[80px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                />
                <button
                  onClick={async () => {
                    await handleUpdateUnitsPerBox(newUnitsPerBox);
                    setEditingUnits(false);
                    setNewUnitsPerBox("");
                  }}
                  disabled={orderLoading || !newUnitsPerBox || parseInt(newUnitsPerBox) <= 0}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingUnits(false)}
                  className="px-3 py-2 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] rounded-lg text-sm text-slate-600"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="border-t border-slate-200 dark:border-white/[0.06] pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">Expedition Progress</span>
                <span className="text-xs text-slate-500">
                  {selectedOrder.expedition?.packedQuantity ?? 0}/{selectedOrder.expedition?.totalQuantity ?? 0}
                </span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round(((selectedOrder.expedition?.packedQuantity ?? 0) / (selectedOrder.expedition?.totalQuantity || 1)) * 100))}%` }}
                />
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
