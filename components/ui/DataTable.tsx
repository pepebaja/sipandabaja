"use client";

// components/ui/DataTable.tsx
import type { ReactNode } from "react";

export interface ColumnDef<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  q,
  onQChange,
  sortBy,
  sortDir,
  onSortChange,
  page,
  totalPages,
  onPageChange,
  onAdd,
  addLabel = "Tambah Data",
  renderActions,
}: {
  columns: ColumnDef<T>[];
  rows: T[];
  loading: boolean;
  q: string;
  onQChange: (v: string) => void;
  sortBy: string;
  sortDir: "asc" | "desc";
  onSortChange: (col: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onAdd?: () => void;
  addLabel?: string;
  renderActions?: (row: T) => ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0F2545]/40 p-4 shadow-lg sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="Cari..."
          className="w-full rounded-lg border border-slate-600 bg-[#0B1E3D] px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-[#3FD8FF] sm:max-w-xs"
        />
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="whitespace-nowrap rounded-lg bg-[#3FD8FF] px-4 py-2 text-sm font-semibold text-[#0B1E3D] hover:brightness-95"
          >
            + {addLabel}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-slate-400">
              {columns.map((col) => (
                <th key={col.key} className="whitespace-nowrap px-3 py-2 font-medium">
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(col.key)}
                      className="flex items-center gap-1 hover:text-white"
                    >
                      {col.label}
                      {sortBy === col.key && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
              {renderActions && <th className="px-3 py-2 text-right font-medium">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-white/5">
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-3">
                      <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                    </td>
                  ))}
                  {renderActions && (
                    <td className="px-3 py-3">
                      <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
                    </td>
                  )}
                </tr>
              ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (renderActions ? 1 : 0)} className="px-3 py-10 text-center text-slate-400">
                  Tidak ada data yang ditemukan.
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 text-slate-200 hover:bg-white/[0.03]">
                  {columns.map((col) => (
                    <td key={col.key} className="whitespace-nowrap px-3 py-3">
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "-")}
                    </td>
                  ))}
                  {renderActions && (
                    <td className="whitespace-nowrap px-3 py-3 text-right">{renderActions(row)}</td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-300">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-md px-3 py-1.5 hover:bg-white/5 disabled:opacity-40"
          >
            ‹ Sebelumnya
          </button>
          <span>
            Halaman {page} dari {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-md px-3 py-1.5 hover:bg-white/5 disabled:opacity-40"
          >
            Berikutnya ›
          </button>
        </div>
      )}
    </div>
  );
}
