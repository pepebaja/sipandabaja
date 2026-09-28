"use client";

// app/(dashboard)/rup/RupClient.tsx
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EntityPicker } from "@/components/master-data/EntityPicker";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/format/rupiah";
import { RupForm } from "@/components/rup/RupForm";

type Tab = "ALL" | "PENYEDIA" | "SWAKELOLA";

interface RupRow {
  id: string;
  dpa_id: string;
  kode_rup: string;
  nama_paket: string;
  jenis_rup: "PENYEDIA" | "SWAKELOLA";
  pagu_paket: number;
  status_rup: string;
  metode_pengadaan?: { nama: string; kategori_metode: string } | null;
  paket_pengadaan?: { status_paket?: { nama: string } | null }[];
  [key: string]: any;
}

const TAB_LABEL: Record<Tab, string> = { ALL: "Semua", PENYEDIA: "RUP Penyedia", SWAKELOLA: "RUP Swakelola" };

export function RupClient({ initialTab = "ALL" }: { initialTab?: Tab }) {
  const toast = useToast();

  const [tahunId, setTahunId] = useState("");
  const [tahapanId, setTahapanId] = useState("");
  const [tab, setTab] = useState<Tab>(initialTab);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rows, setRows] = useState<RupRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<RupRow | null>(null);
  const [archiveRow, setArchiveRow] = useState<RupRow | null>(null);
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
      if (tab !== "ALL") params.set("jenis_rup", tab);
      if (q) params.set("q", q);
      const res = await fetch(`/api/rup?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Gagal memuat data RUP.");
      setRows(json.data ?? []);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Gagal memuat data RUP.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunId, tahapanId, tab, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(url: string, method: "POST" | "PUT", values: Record<string, unknown>, okMsg: string) {
    setSubmitting(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Data belum dapat disimpan. Periksa kolom yang ditandai.");
      toast.show("success", okMsg);
      if (json.peringatanPagu) toast.show("info", json.peringatanPagu);
      setCreateOpen(false);
      setEditRow(null);
      load();
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Gagal menyimpan data.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive() {
    if (!archiveRow) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rup/${archiveRow.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Gagal mengarsipkan data.");
      toast.show("success", "Data RUP berhasil diarsipkan.");
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-white">Data RUP</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/rup/monitoring" className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/5">
            Monitoring RUP
          </Link>
          <Link href="/rup/import" className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/5">
            Import RUP
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <EntityPicker label="Tahun Anggaran" endpoint="/api/master-data/tahun-anggaran" optionLabelKey="tahun"
          value={tahunId} onChange={(v) => { setTahunId(v); setTahapanId(""); }} />
        <EntityPicker label="Tahapan Anggaran" endpoint="/api/master-data/tahapan-anggaran"
          parentQueryParam="tahun_anggaran_id" parentValue={tahunId} optionLabelKey="nama"
          value={tahapanId} onChange={setTahapanId} />
      </div>

      {!tahunId || !tahapanId ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Pilih Tahun Anggaran dan Tahapan Anggaran terlebih dahulu untuk menampilkan data RUP.
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#0F2545]/40 p-4 shadow-lg sm:p-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
              <button key={t} onClick={() => { setTab(t); setPage(1); }}
                className={`rounded-full px-4 py-1.5 text-sm ${tab === t ? "bg-[#3FD8FF] font-semibold text-[#0B1E3D]" : "text-slate-300 hover:bg-white/5"}`}>
                {TAB_LABEL[t]}
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input type="text" value={q} placeholder="Cari kode RUP / nama paket..."
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-slate-600 bg-[#0B1E3D] px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-[#3FD8FF] sm:max-w-xs" />
            <button onClick={() => setCreateOpen(true)}
              className="whitespace-nowrap rounded-lg bg-[#3FD8FF] px-4 py-2 text-sm font-semibold text-[#0B1E3D] hover:brightness-95">
              + Tambah RUP
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="px-3 py-2 font-medium">Kode RUP</th>
                  <th className="px-3 py-2 font-medium">Nama Paket</th>
                  <th className="px-3 py-2 font-medium">Jenis</th>
                  <th className="px-3 py-2 font-medium">Metode</th>
                  <th className="px-3 py-2 text-right font-medium">Pagu</th>
                  <th className="px-3 py-2 font-medium">Status Paket</th>
                  <th className="px-3 py-2 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td colSpan={7} className="px-3 py-3"><div className="h-4 w-full animate-pulse rounded bg-white/10" /></td>
                  </tr>
                ))}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-slate-400">
                    Belum terdapat data RUP pada Tahun/Tahapan yang dipilih.
                  </td></tr>
                )}
                {!loading && rows.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 text-slate-200 hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap px-3 py-3">{row.kode_rup}</td>
                    <td className="px-3 py-3">{row.nama_paket}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${row.jenis_rup === "PENYEDIA" ? "bg-sky-500/15 text-sky-300" : "bg-violet-500/15 text-violet-300"}`}>
                        {row.jenis_rup === "PENYEDIA" ? "Penyedia" : "Swakelola"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {row.metode_pengadaan?.nama ?? "-"}
                      {row.metode_pengadaan && (
                        <div className="text-slate-500">{row.metode_pengadaan.kategori_metode === "E_KATALOG" ? "E-Katalog" : "Non E-Katalog"}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-[#3FD8FF]">{formatRupiah(row.pagu_paket)}</td>
                    <td className="whitespace-nowrap px-3 py-3">{row.paket_pengadaan?.[0]?.status_paket?.nama ?? "-"}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => setEditRow(row)} className="text-sm text-[#3FD8FF] hover:underline">Edit</button>
                        <button onClick={() => setArchiveRow(row)} className="text-sm text-red-400 hover:underline">Arsipkan</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-300">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md px-3 py-1.5 hover:bg-white/5 disabled:opacity-40">‹ Sebelumnya</button>
              <span>Halaman {page} dari {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md px-3 py-1.5 hover:bg-white/5 disabled:opacity-40">Berikutnya ›</button>
            </div>
          )}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Tambah Data RUP">
        <RupForm mode="create" tahunId={tahunId} tahapanId={tahapanId} submitting={submitting}
          onCancel={() => setCreateOpen(false)}
          onSubmit={(values) => submit("/api/rup", "POST", values, "Data berhasil disimpan.")} />
      </Modal>

      <Modal open={Boolean(editRow)} onClose={() => setEditRow(null)} title="Edit Data RUP">
        {editRow && (
          <RupForm mode="edit" tahunId={tahunId} tahapanId={tahapanId} initial={editRow} submitting={submitting}
            onCancel={() => setEditRow(null)}
            onSubmit={(values) => submit(`/api/rup/${editRow.id}`, "PUT", values, "Data berhasil diperbarui.")} />
        )}
      </Modal>

      <ConfirmDialog open={Boolean(archiveRow)} title="Arsipkan data RUP?"
        description={`Paket "${archiveRow?.nama_paket}" akan diarsipkan dan tidak dihitung lagi di dashboard maupun sisa pagu DPA. Riwayat tetap dapat ditelusuri lewat Audit Log.`}
        confirmLabel="Arsipkan" loading={submitting} onConfirm={handleArchive} onCancel={() => setArchiveRow(null)} />
    </div>
  );
}
