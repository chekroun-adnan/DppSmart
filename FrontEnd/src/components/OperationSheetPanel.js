import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { createTsOperation } from "../services/authService";

const PREDEFINED_OPERATIONS = [
  "Fabric Preparation", "Cutting", "Screen Printing", "Embroidery",
  "Sewing", "Quality Control", "Ironing", "Packaging", "Finished Stock", "Delivery"
];

function Badge({ label, color = "blue" }) {
  const colors = {
    blue: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300",
    emerald: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
    purple: "bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300",
    slate: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
    red: "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[color] || colors.slate}`}>
      {label}
    </span>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div className="grid gap-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", ...rest }) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      className="h-9 w-full rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-800/80 focus:ring-4 focus:ring-brand-500/10"
      {...rest}
    />
  );
}

function Select({ value, onChange, children, ...rest }) {
  return (
    <select
      value={value ?? ""}
      onChange={onChange}
      className="h-9 w-full appearance-none rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 pl-3 pr-10 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 cursor-pointer bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzY0NzQ4YiIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_0.75rem_center] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzk0YTNiOCIvPjwvc3ZnPg==')] dark:bg-[right_0.75rem_center]"
      {...rest}
    >
      {children}
    </select>
  );
}

function Checkbox({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked || false}
        onChange={onChange}
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      <span className="text-xs text-slate-600 dark:text-slate-300">{label}</span>
    </label>
  );
}

function IconButton({ onClick, children, title, className = "" }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

export default function OperationSheetPanel({
  sheet,
  operations = [],
  initialItems = [],
  onSave,
  orgId,
  onRefreshOperations,
}) {
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [showNewOpForm, setShowNewOpForm] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [newOp, setNewOp] = useState({ name: "", description: "", defaultDuration: "" });
  const [createSaving, setCreateSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const dragItem = useRef(null);

  useEffect(() => {
    setItems(initialItems.length > 0 ? initialItems : []);
  }, [initialItems]);

  const filteredOps = useMemo(() => {
    if (!searchQuery) return operations;
    const q = searchQuery.toLowerCase();
    return operations.filter(op =>
      op.name.toLowerCase().includes(q) ||
      (op.description || "").toLowerCase().includes(q)
    );
  }, [operations, searchQuery]);

  const predefinedFiltered = useMemo(() => {
    if (!searchQuery) return PREDEFINED_OPERATIONS;
    const q = searchQuery.toLowerCase();
    return PREDEFINED_OPERATIONS.filter(n => n.toLowerCase().includes(q));
  }, [searchQuery]);

  function addOperation(opId) {
    if (!opId) return;
    if (items.some(item => item.operationId === opId)) return;
    const op = operations.find(o => o.id === opId);
    setItems(prev => [...prev, {
      operationId: opId,
      operationName: op?.name || "—",
      userId: "",
      stepOrder: prev.length + 1,
      durationEstimate: op?.defaultDuration || null,
      notes: "",
      instructions: "",
      qualityCheckRequired: false,
      canRunInParallel: false,
      overrideDefaultDuration: null,
      overrideExecutionCost: null,
      assignedDepartment: "",
    }]);
    setShowSelector(false);
    setSearchQuery("");
  }

  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx).map((item, i) => ({ ...item, stepOrder: i + 1 })));
    if (expandedRow === idx) setExpandedRow(null);
    if (expandedRow > idx) setExpandedRow(prev => prev - 1);
  }

  function handleDragStart(idx) {
    dragItem.current = idx;
  }

  function handleDragOver(e, idx) {
    e.preventDefault();
    setDragOverIdx(idx);
  }

  function handleDrop(idx) {
    const from = dragItem.current;
    if (from === null || from === idx) {
      setDragOverIdx(null);
      dragItem.current = null;
      return;
    }
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      return next.map((item, i) => ({ ...item, stepOrder: i + 1 }));
    });
    if (expandedRow === from) setExpandedRow(idx);
    else if (expandedRow === idx) setExpandedRow(from);
    setDragOverIdx(null);
    dragItem.current = null;
  }

  function handleDragEnd() {
    setDragOverIdx(null);
    dragItem.current = null;
  }

  function updateItem(idx, field, value) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  async function handleCreateOperation() {
    if (!newOp.name.trim() || !orgId) return;
    setCreateSaving(true);
    setError("");
    try {
      const created = await createTsOperation({
        name: newOp.name,
        description: newOp.description,
        defaultDuration: parseFloat(newOp.defaultDuration) || null,
        organizationId: orgId,
      });
      if (onRefreshOperations) onRefreshOperations();
      setItems(prev => [...prev, {
        operationId: created.id,
        operationName: created.name || newOp.name,
        userId: "",
        stepOrder: prev.length + 1,
        durationEstimate: created.defaultDuration || null,
        notes: "",
        instructions: "",
        qualityCheckRequired: false,
        canRunInParallel: false,
        overrideDefaultDuration: null,
        overrideExecutionCost: null,
        assignedDepartment: "",
      }]);
      setNewOp({ name: "", description: "", defaultDuration: "" });
      setShowNewOpForm(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreateSaving(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await onSave(items);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const totalDuration = useMemo(() =>
    items.reduce((sum, item) => sum + (parseFloat(item.durationEstimate) || 0), 0), [items]);

  const parallelCount = useMemo(() =>
    items.filter(item => item.canRunInParallel).length, [items]);

  const qualityCheckCount = useMemo(() =>
    items.filter(item => item.qualityCheckRequired).length, [items]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Production Routing
          </span>
          <Badge label={`${items.length} step${items.length !== 1 ? "s" : ""}`} color="blue" />
          {totalDuration > 0 && (
            <Badge label={`~${totalDuration} min`} color="amber" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 dark:border-white/[0.08] overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === "list" ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("flow")}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === "flow" ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
            >
              Flow
            </button>
          </div>
          <button
            onClick={() => setShowSelector(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Operation
          </button>
        </div>
      </div>

      {viewMode === "flow" && items.length > 0 && (
        <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-slate-800 p-4 overflow-x-auto">
          <div className="flex items-start gap-0 min-w-max">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-start">
                <div className="flex flex-col items-center">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    item.qualityCheckRequired
                      ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 ring-2 ring-amber-300"
                      : "bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300"
                  }`}>
                    {item.stepOrder}
                  </div>
                  <div className="mt-1 text-center max-w-[100px]">
                    <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 truncate">{item.operationName}</p>
                    {item.durationEstimate && (
                      <p className="text-[9px] text-slate-400">{item.durationEstimate} min/pc</p>
                    )}
                  </div>
                  {item.canRunInParallel && (
                    <span className="mt-0.5 text-[8px] font-bold text-purple-600 dark:text-purple-400 uppercase">Parallel</span>
                  )}
                </div>
                {idx < items.length - 1 && (
                  <div className="flex items-center pt-4 mx-2">
                    <div className={`h-0.5 w-8 ${item.canRunInParallel ? "bg-purple-300 dark:bg-purple-500/50" : "bg-slate-300 dark:bg-slate-600"}`} />
                    <svg className={`w-3 h-3 -ml-1 ${item.canRunInParallel ? "text-purple-400" : "text-slate-400"}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === "list" && items.length > 0 && (
        <div className="hidden md:block rounded-xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2 w-10 text-center">#</th>
                <th className="px-3 py-2 text-left">Operation</th>
                          <th className="px-3 py-2 text-left w-24">Duration / unit</th>
                <th className="px-3 py-2 text-left w-16">Parallel</th>
                <th className="px-3 py-2 text-left w-16">QC</th>
                <th className="px-3 py-2 text-left">Instructions / Notes</th>
                <th className="px-3 py-2 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/[0.05]">
              {items.map((item, idx) => (
                <tr
                  key={idx}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  className={`transition-colors cursor-grab active:cursor-grabbing ${
                    dragOverIdx === idx
                      ? "bg-brand-50 dark:bg-brand-500/10 ring-2 ring-brand-300 dark:ring-brand-600"
                      : "hover:bg-slate-50 dark:hover:bg-slate-700/30"
                  }`}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-slate-300 dark:text-slate-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                      </svg>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-xs font-bold text-brand-700 dark:text-brand-300">
                        {item.stepOrder}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.operationName}</span>
                  </td>
                  <td className="px-3 py-2">
                              <Input
                                type="number" min="0" step="0.5"
                                value={item.durationEstimate ?? ""}
                                onChange={e => updateItem(idx, "durationEstimate", e.target.value ? parseFloat(e.target.value) : null)}
                                placeholder="min/pc"
                              />
                  </td>
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={item.canRunInParallel}
                      onChange={e => updateItem(idx, "canRunInParallel", e.target.checked)}
                      label=""
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={item.qualityCheckRequired}
                      onChange={e => updateItem(idx, "qualityCheckRequired", e.target.checked)}
                      label=""
                    />
                  </td>
                  <td className="px-3 py-2 max-w-[200px]">
                    {expandedRow === idx ? (
                      <div className="space-y-1">
                        <Input
                          value={item.instructions || ""}
                          onChange={e => updateItem(idx, "instructions", e.target.value)}
                          placeholder="Instructions"
                        />
                        <Input
                          value={item.notes || ""}
                          onChange={e => updateItem(idx, "notes", e.target.value)}
                          placeholder="Notes"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
                        {item.instructions || item.notes || "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-0.5">
                      <IconButton onClick={() => setExpandedRow(expandedRow === idx ? null : idx)} title="Toggle details">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </IconButton>
                      <IconButton onClick={() => removeItem(idx)} title="Remove" className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === "list" && items.map((item, idx) => (
        <div
          key={idx}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={e => handleDragOver(e, idx)}
          onDrop={() => handleDrop(idx)}
          onDragEnd={handleDragEnd}
          className={`md:hidden rounded-xl border p-3 space-y-2 cursor-grab active:cursor-grabbing transition-all ${
            dragOverIdx === idx
              ? "border-brand-300 bg-brand-50 dark:border-brand-600 dark:bg-brand-500/10 ring-2 ring-brand-300"
              : "border-blue-100 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <svg className="w-3.5 h-3.5 text-slate-300 dark:text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
              </svg>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20 text-xs font-bold text-blue-700 dark:text-blue-300">
                {item.stepOrder}
              </span>
            </div>
            <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{item.operationName}</span>
            <IconButton onClick={() => removeItem(idx)} title="Remove" className="hover:text-red-500">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </IconButton>
          </div>
          <div className="grid grid-cols-2 gap-2 pl-8">
                      <FieldGroup label="Duration / unit">
                        <Input type="number" min="0" step="0.5" value={item.durationEstimate ?? ""}
                          onChange={e => updateItem(idx, "durationEstimate", e.target.value ? parseFloat(e.target.value) : null)} placeholder="min/pc" />
                      </FieldGroup>
            <FieldGroup label="Instructions">
              <Input
                value={item.instructions || ""}
                onChange={e => updateItem(idx, "instructions", e.target.value)}
                placeholder="Instructions"
              />
            </FieldGroup>
          </div>
          <div className="flex items-center gap-4 pl-8">
            <Checkbox
              checked={item.canRunInParallel}
              onChange={e => updateItem(idx, "canRunInParallel", e.target.checked)}
              label="Parallel"
            />
            <Checkbox
              checked={item.qualityCheckRequired}
              onChange={e => updateItem(idx, "qualityCheckRequired", e.target.checked)}
              label="QC Required"
            />
          </div>
          <div className="pl-8">
            <FieldGroup label="Notes">
              <Input
                value={item.notes || ""}
                onChange={e => updateItem(idx, "notes", e.target.value)}
                placeholder="Additional notes"
              />
            </FieldGroup>
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08] py-10 text-slate-400 dark:text-slate-500">
          <svg className="w-10 h-10 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="text-sm font-medium">No operations added yet</p>
          <p className="text-xs text-slate-400 mt-1">Click "Add Operation" to build your production routing</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-slate-800 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Steps</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{items.length}</p>
        </div>
  <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-slate-800 p-3">
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Duration</p>
    <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
      {totalDuration > 0
        ? `${totalDuration} min`
        : "—"}
    </p>
    {totalDuration > 0 && (
      <p className="text-[10px] text-slate-400 mt-0.5">
        {totalDuration >= 60
          ? `${Math.floor(totalDuration / 60)}h ${Math.round(totalDuration % 60)}m`
          : `${totalDuration} min`}
        {" total"}
      </p>
    )}
  </div>
        <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-slate-800 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Parallel Steps</p>
          <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">{parallelCount}</p>
        </div>
        <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-slate-800 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">QC Checks</p>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{qualityCheckCount}</p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-10 rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Operation Sheet"}
        </button>
      </div>

      {showSelector && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => { setShowSelector(false); setSearchQuery(""); setShowNewOpForm(false); }}
        >
          <div
            className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] px-6 py-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Add Operation</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowNewOpForm(!showNewOpForm); setSearchQuery(""); }}
                  className={`text-xs font-semibold transition-colors ${showNewOpForm ? "text-brand-600 underline" : "text-slate-500 hover:text-brand-600"}`}
                >
                  {showNewOpForm ? "Browse Steps" : "+ New Custom"}
                </button>
                <button
                  onClick={() => { setShowSelector(false); setSearchQuery(""); setShowNewOpForm(false); }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[calc(90vh-80px)] overflow-y-auto">
              {showNewOpForm ? (
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Create New Operation</p>
                  <FieldGroup label="Operation Name">
                    <Select value={newOp.name} onChange={e => setNewOp(p => ({ ...p, name: e.target.value }))}>
                      <option value="">— Select a predefined step —</option>
                      {PREDEFINED_OPERATIONS.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </Select>
                  </FieldGroup>
                  <FieldGroup label="Description">
                    <Input
                      value={newOp.description}
                      onChange={e => setNewOp(p => ({ ...p, description: e.target.value }))}
                      placeholder="Short description"
                    />
                  </FieldGroup>
                  <FieldGroup label="Default Duration (minutes)">
                    <Input
                      type="number" min="0" step="0.5"
                      value={newOp.defaultDuration}
                      onChange={e => setNewOp(p => ({ ...p, defaultDuration: e.target.value }))}
                      placeholder="e.g. 30"
                    />
                  </FieldGroup>
                  <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                    <button
                      onClick={() => { setShowNewOpForm(false); setNewOp({ name: "", description: "", defaultDuration: "" }); }}
                      className="h-9 rounded-xl border border-slate-200 dark:border-white/[0.08] px-4 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateOperation}
                      disabled={createSaving || !newOp.name.trim()}
                      className="h-9 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      {createSaving ? "Creating..." : "Create & Add to Sheet"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search predefined steps or library..."
                      className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 pl-10 pr-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-800/80 focus:ring-4 focus:ring-brand-500/10"
                      autoFocus
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Predefined Steps</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {PREDEFINED_OPERATIONS.filter(n => !searchQuery || n.toLowerCase().includes(searchQuery.toLowerCase())).map((name, i) => {
                        const existing = operations.find(o => o.name === name);
                        const alreadyAdded = existing ? items.some(item => item.operationId === existing.id) : false;
                        return (
                          <button
                            key={name}
                            onClick={async () => {
                              if (!orgId) { setError("No organization context"); return; }
                              if (existing) {
                                addOperation(existing.id);
                              } else {
                                setCreateSaving(true);
                                try {
                                  const created = await createTsOperation({ name, description: "", defaultDuration: null, organizationId: orgId });
                                  if (onRefreshOperations) onRefreshOperations();
                                  setItems(prev => [...prev, {
                                    operationId: created.id,
                                    operationName: name,
                                    userId: "", stepOrder: prev.length + 1,
                                    durationEstimate: null, notes: "", instructions: "",
                                    qualityCheckRequired: false, canRunInParallel: false,
                                    overrideDefaultDuration: null, overrideExecutionCost: null,
                                    assignedDepartment: "",
                                  }]);
                                } catch (e) { setError(e.message); }
                                finally { setCreateSaving(false); }
                              }
                            }}
                            disabled={alreadyAdded || createSaving}
                            className={`flex flex-col items-center justify-center rounded-xl border-2 px-3 py-3 text-center transition-all ${
                              alreadyAdded
                                ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 opacity-60"
                                : "border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-800 hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:shadow-sm"
                            }`}
                          >
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold mb-1 ${
                              alreadyAdded
                                ? "bg-emerald-200 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                : "bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300"
                            }`}>
                              {i + 1}
                            </span>
                            <span className={`text-[11px] font-semibold leading-tight ${
                              alreadyAdded ? "text-emerald-700 dark:text-emerald-300" : "text-slate-700 dark:text-slate-200"
                            }`}>
                              {name}
                            </span>
                            {alreadyAdded && (
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">Added</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-slate-100 dark:bg-white/[0.06]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Or from Library</span>
                    <div className="flex-1 h-px bg-slate-100 dark:bg-white/[0.06]" />
                  </div>

                  {filteredOps.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-slate-400">No matching operations in library</p>
                      <button
                        onClick={() => { setShowNewOpForm(true); setSearchQuery(""); }}
                        className="mt-2 text-xs font-semibold text-brand-600 hover:underline"
                      >
                        + Create New Operation
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {filteredOps.map(op => {
                        const alreadyAdded = items.some(item => item.operationId === op.id);
                        return (
                          <button
                            key={op.id}
                            onClick={() => addOperation(op.id)}
                            disabled={alreadyAdded}
                            className={`w-full flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition-colors ${
                              alreadyAdded
                                ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 opacity-60"
                                : "border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-700/50 hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{op.name}</p>
                              {(op.description || op.defaultDuration) && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {op.description ? `${op.description} · ` : ""}
                                  {op.defaultDuration ? `${op.defaultDuration} min` : ""}
                                </p>
                              )}
                            </div>
                            {alreadyAdded ? (
                              <Badge label="Added" color="emerald" />
                            ) : (
                              <svg className="w-4 h-4 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
      {showNewOpForm && !showSelector && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => { setShowNewOpForm(false); setNewOp({ name: "", description: "", defaultDuration: "" }); }}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] px-6 py-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">New Operation</h2>
              <button
                onClick={() => { setShowNewOpForm(false); setNewOp({ name: "", description: "", defaultDuration: "" }); }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <FieldGroup label="Operation Name">
                <Select value={newOp.name} onChange={e => setNewOp(p => ({ ...p, name: e.target.value }))}>
                  <option value="">— Select or type —</option>
                  {PREDEFINED_OPERATIONS.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup label="Description">
                <Input
                  value={newOp.description}
                  onChange={e => setNewOp(p => ({ ...p, description: e.target.value }))}
                  placeholder="Short description"
                />
              </FieldGroup>
              <FieldGroup label="Default Duration (minutes)">
                <Input
                  type="number" min="0" step="0.5"
                  value={newOp.defaultDuration}
                  onChange={e => setNewOp(p => ({ ...p, defaultDuration: e.target.value }))}
                  placeholder="e.g. 30"
                />
              </FieldGroup>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => { setShowNewOpForm(false); setNewOp({ name: "", description: "", defaultDuration: "" }); }}
                  className="h-9 rounded-xl border border-slate-200 dark:border-white/[0.08] px-4 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOperation}
                  disabled={createSaving || !newOp.name.trim()}
                  className="h-9 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {createSaving ? "Creating..." : "Create & Add"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}