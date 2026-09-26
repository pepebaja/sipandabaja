"use client";

// components/master-data/MasterDataManager.tsx
import { useCallback, useEffect, useState } from "react";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { MasterDataForm } from "./MasterDataForm";
import type { FieldDef } from "./field-types";

interface Row {
  id: string;
  [key: string]: unknown;
}

export function MasterDataManager({
  title,
  endpoint, // mis. '/api/master-data/program'
  columns,
  fields, // dipakai untuk form create/edit — lihat field-types.ts
  defaultValues,
  parentQueryParam, // opsional: jika halaman ini sendiri adalah dependent list (mis. Kegiatan per Program terpilih)
  parentValue,
}: {
  title: string;
  endpoint: string;
  columns: ColumnDef<Row>[];
  fields: FieldDef[];
  defaultValues?: Record<string, unknown>;
  parentQueryParam?: string;
  parentValue?: string;
}) {
  const toast = useToast();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("nama");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [confirmDeleteRow, setConfirmDeleteRow] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "10",
        sortBy,
        sortDir,
      });
      if (q) params.set("q", q);
      if (parentQueryParam && parentValue) params.set(parentQueryParam, parentValue);

      const res = await fetch(`${endpoint}?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Gagal memuat data.");
      setRows(json.data ?? []);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, page, sortBy, sortDir, q, parentQueryParam, parentValue]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingRow(null);
    setModalOpen(true);
  }

  function openEdit(row: Row) {
    setEditingRow(row);
    setModalOpen(true);
  }

  async function handleSubmit(values: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const isEdit = Boolean(editingRow);
      const url = isEdit ? `${endpoint}/${editingRow!.id}` : endpoint;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Gagal menyimpan data.");

      toast.show("success", isEdit ? "Data berhasil diperbarui." : "Data berhasil disimpan.");
      setModalOpen(false);
      load();
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Data belum dapat disimpan. Periksa kolom yang ditandai.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirmDeleteRow) return;
    setDeleting(true);
    try {
      const res = await fetch(`${endpoint}/${confirmDeleteRow.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Gagal menghapus data.");
      toast.show("success", "Data berhasil dihapus.");
      setConfirmDeleteRow(null);
      load();
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Gagal menghapus data.");
    } finally {
      setDeleting(false);
    }
  }

  function handleSort(col: string) {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  }

  const disabledByMissingParent = Boolean(parentQueryParam) && !parentValue;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-white">{title}</h1>

      {disabledByMissingParent ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Pilih data induk terlebih dahulu untuk menampilkan daftar ini.
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          q={q}
          onQChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          sortBy={sortBy}
          sortDir={sortDir}
          onSortChange={handleSort}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onAdd={openCreate}
          renderActions={(row) => (
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => openEdit(row)} className="text-sm text-[#3FD8FF] hover:underline">
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteRow(row)}
                className="text-sm text-red-400 hover:underline"
              >
                Hapus
              </button>
            </div>
          )}
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingRow ? `Edit ${title}` : `Tambah ${title}`}>
        <MasterDataForm
          fields={fields}
          initialValues={editingRow ?? { status_aktif: true, ...defaultValues, ...(parentQueryParam ? { [parentQueryParam]: parentValue } : {}) }}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          submitting={submitting}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDeleteRow)}
        title="Hapus data?"
        description={`Data "${confirmDeleteRow?.nama ?? confirmDeleteRow?.nama_penyedia ?? confirmDeleteRow?.id}" akan dinonaktifkan dan tidak lagi muncul di daftar aktif. Tindakan ini dapat ditelusuri kembali lewat Audit Log.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteRow(null)}
      />
    </div>
  );
}
