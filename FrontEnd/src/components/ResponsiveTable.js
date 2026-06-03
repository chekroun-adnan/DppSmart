import { useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

export function ResponsiveTable({
  columns,
  data,
  keyExtractor = (row, i) => i,
  renderCard,
  searchable = false,
  searchPlaceholder = "Search...",
  searchKeys = [],
  emptyMessage = "No data available.",
  className = "",
  cardClassName = "",
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const filtered = searchable && searchTerm
    ? data.filter((row) =>
        searchKeys.some((k) => {
          const val = typeof k === "function" ? k(row) : row[k];
          return String(val ?? "").toLowerCase().includes(searchTerm.toLowerCase());
        })
      )
    : data;

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const va = a[sortKey] ?? "";
        const vb = b[sortKey] ?? "";
        const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
        return sortDir === "asc" ? cmp : -cmp;
      })
    : filtered;

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className={className}>
      {searchable && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/60 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
          />
        </div>
      )}

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full premium-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 ${
                    col.sortable ? "cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none" : ""
                  } ${col.align === "right" ? "text-right" : ""}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={col.width ? { width: col.width } : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr key={keyExtractor(row, i)} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-slate-700 dark:text-slate-300 ${
                        col.align === "right" ? "text-right" : ""
                      }`}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {sorted.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">{emptyMessage}</div>
        ) : (
          sorted.map((row, i) => (
            renderCard ? (
              <div key={keyExtractor(row, i)} className={cardClassName}>
                {renderCard(row)}
              </div>
            ) : (
              <div key={keyExtractor(row, i)} className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/60 p-4 space-y-2">
                {columns.map((col) => (
                  <div key={col.key} className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                      {col.label}
                    </span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 text-right truncate max-w-[60%]">
                      {col.render ? col.render(row) : row[col.key] ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            )
          ))
        )}
      </div>
    </div>
  );
}
