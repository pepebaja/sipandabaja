"use client";

// app/(dashboard)/dpa/DpaClient.tsx
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EntityPicker } from "@/components/master-data/EntityPicker";
import { MasterDataForm } from "@/components/master-data/MasterDataForm";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/format/rupiah";
import { buildDpaCreateFields, buildDpaEditFields } from "@/components/dpa/dpa-form-fields";
import { RevisiModal } from "@/components/dpa/RevisiModal";

interface DpaRow {
  id: string;
  uraian_belanja: string;
  pagu_anggaran: number;
  status: string;
  tahun_anggaran_id: string;
  sub_kegiatan_id: string;
  belanja_id: string;
  sumber_dana_id: string | null;
  sub_kegiatan?: { nama: string; kegiatan?: { nama: string; program?: { nama: string } } };
  belanja?: { kode_rekening: string };
  sumber_dana?: { nama: string } | null;
}

export function DpaClient() {
  const toast = useToast();

  const [tahunId, setTahunId] = useState("");
  const [tahapanId, setTahapanId] = useState("");

  const [rows, setRows] = useState<DpaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<DpaRow | null>(null);
  const [revisiRow, setRevisiRow] = useState<DpaRow | null>(null);
  const [archiveRow, setArchiveRow] = useState<DpaRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!tahunId || !tahapanId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tahun_anggaran_id: tahunId,
        tahapan_anggaran_id: tahapanId,
        page: String(page),
        pageSize: "10",
      });
      if (q) params.set("q", q);
      const res = await fetch(`/api/dpa?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Gagal memuat data DPA.");
      setRows(json.data ?? []);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Gagal memuat data DPA.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunId, tahapanId, page, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(values: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/dpa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tahun_anggaran_id: tahunId,
          tahapan_anggaran_id: tahapanId,
          sub_kegiatan_id: values.sub_kegiatan_id,
          belanja_id: values.belanja_id,
          uraian_belanja: values.uraian_belanja,
          pagu_anggaran: Number(values.pagu_anggaran),
          sumber_dana_id: values.sumber_dana_id || null,
          keterangan: values.keterangan || null,
          status: values.status,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Data belum dapat disimpan. Periksa kolom yang ditandai.");
      toast.show("success", "Data berhasil disimpan.");
      setCreateOpen(false);
      load();
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Gagal menyimpan data.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(values: Record<string, unknown>) {
    if (!editRow) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/dpa/${editRow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Gagal memperbarui data.");
      toast.show("success", "Data berhasil diperbarui.");
      setEditRow(null);
      load();
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Gagal memperbarui data.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive() {
    if (!archiveRow) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/dpa/${archiveRow.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Gagal mengarsipkan data.");
      toast.show("success", "Data DPA berhasil diarsipkan.");
      setArchiveRow(null);
      load();
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Gagal mengarsipkan data.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Data DPA</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/dpa/riwayat" className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/5">
            Riwayat Perubahan
          </Link>
          <Link href="/dpa/import" className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/5">
            Import DPA
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <EntityPicker
          label="Tahun Anggaran"
          endpoint="/api/master-data/tahun-anggaran"
          optionLabelKey="tahun"
          value={tahunId}
          onChange={(v) => {
            setTahunId(v);
            setTahapanId("");
          }}
        />
        <EntityPicker
          label="Tahapan Anggaran"
          endpoint="/api/master-data/tahapan-anggaran"
          parentQueryParam="tahun_anggaran_id"
          parentValue={tahunId}
          optionLabelKey="nama"
          value={tahapanId}
          onChange={setTahapanId}
        />
      </div>

      {!tahunId || !tahapanId ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Pilih Tahun Anggaran dan Tahapan Anggaran terlebih dahulu untuk menampilkan data DPA.
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#0F2545]/40 p-4 shadow-lg sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Cari uraian belanja..."
              className="w-full rounded-lg border border-slate-600 bg-[#0B1E3D] px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-[#3FD8FF] sm:max-w-xs"
            />
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="whitespace-nowrap rounded-lg bg-[#3FD8FF] px-4 py-2 text-sm font-semibold text-[#0B1E3D] hover:brightness-95"
            >
              + Tambah DPA
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="px-3 py-2 font-medium">Sub Kegiatan / Belanja</th>
                  <th className="px-3 py-2 font-medium">Uraian</th>
                  <th className="px-3 py-2 text-right font-medium">Pagu</th>
                  <th className="px-3 py-2 font-medium">Sumber Dana</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td colSpan={6} className="px-3 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                      </td>
                    </tr>
                  ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-slate-400">
                      Belum terdapat data DPA pada Tahun/Tahapan yang dipilih.
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-white/5 text-slate-200 hover:bg-white/[0.03]">
                      <td className="px-3 py-3 text-xs text-slate-400">
                        {row.sub_kegiatan?.kegiatan?.program?.nama} / {row.sub_kegiatan?.kegiatan?.nama} /{" "}
                        {row.sub_kegiatan?.nama} ({row.belanja?.kode_rekening})
                      </td>
                      <td className="px-3 py-3">{row.uraian_belanja}</td>
                      <td className="px-3 py-3 text-right font-medium text-[#3FD8FF]">
                        {formatRupiah(row.pagu_anggaran)}
                      </td>
                      <td className="px-3 py-3">{row.sumber_dana?.nama ?? "-"}</td>
                      <td className="px-3 py-3">
                        <StatusBadge active={row.status === "AKTIF"} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setRevisiRow(row)} className="text-sm text-emerald-400 hover:underline">
                            Revisi
                          </button>
                          <button onClick={() => setEditRow(row)} className="text-sm text-[#3FD8FF] hover:underline">
                            Edit
                          </button>
                          <button onClick={() => setArchiveRow(row)} className="text-sm text-red-400 hover:underline">
                            Arsipkan
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-300">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md px-3 py-1.5 hover:bg-white/5 disabled:opacity-40">
                ‹ Sebelumnya
              </button>
              <span>Halaman {page} dari {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md px-3 py-1.5 hover:bg-white/5 disabled:opacity-40">
                Berikutnya ›
              </button>
            </div>
          )}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Tambah Data DPA">
        <MasterDataForm
          fields={buildDpaCreateFields()}
          initialValues={{ tahapan_anggaran_id: tahapanId, status: "AKTIF" }}
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          submitting={submitting}
        />
      </Modal>

      <Modal open={Boolean(editRow)} onClose={() => setEditRow(null)} title="Edit Data DPA">
        {editRow && (
          <MasterDataForm
            fields={buildDpaEditFields()}
            initialValues={editRow}
            onSubmit={handleEdit}
            onCancel={() => setEditRow(null)}
            submitting={submitting}
          />
        )}
      </Modal>

      <RevisiModal open={Boolean(revisiRow)} onClose={() => setRevisiRow(null)} dpaSumber={revisiRow} onSuccess={load} />

      <ConfirmDialog
        open={Boolean(archiveRow)}
        title="Arsipkan data DPA?"
        description={`Data "${archiveRow?.uraian_belanja}" akan diarsipkan dan tidak lagi tampil sebagai data aktif. Riwayat tetap dapat ditelusuri lewat Audit Log.`}
        confirmLabel="Arsipkan"
        loading={submitting}
        onConfirm={handleArchive}
        onCancel={() => setArchiveRow(null)}
      />
    </div>
  );
}
