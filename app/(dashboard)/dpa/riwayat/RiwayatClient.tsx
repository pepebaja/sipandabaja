"use client";

// app/(dashboard)/dpa/riwayat/RiwayatClient.tsx
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EntityPicker } from "@/components/master-data/EntityPicker";
import { formatRupiah, formatTanggal } from "@/lib/format/rupiah";
import { useToast } from "@/components/ui/Toast";

interface RevisionRow {
  id: string;
  tahapan_asal: string | null;
  tahapan_tujuan: string;
  pagu_sebelum: number;
  pagu_sesudah: number;
  selisih: number;
  jenis_perubahan: string;
  catatan: string | null;
  created_at: string;
  dpa?: { uraian_belanja: string; sub_kegiatan?: { nama: string }; belanja?: { kode_rekening: string } };
  user?: { nama_lengkap: string } | null;
}

const JENIS_LABEL: Record<string, string> = {
  PENAMBAHAN_PROGRAM: "Penambahan Program",
  PENAMBAHAN_KEGIATAN: "Penambahan Kegiatan",
  PENAMBAHAN_SUB_KEGIATAN: "Penambahan Sub Kegiatan",
  PENAMBAHAN_BELANJA: "Penambahan Belanja",
  PERUBAHAN_PAGU: "Perubahan Pagu",
  PENGHAPUSAN: "Penghapusan",
  PERUBAHAN_SUMBER_DANA: "Perubahan Sumber Dana",
};

export function RiwayatClient() {
  const toast = useToast();
  const [tahunId, setTahunId] = useState("");
  const [rows, setRows] = useState<RevisionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    if (!tahunId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/dpa/riwayat?tahun_anggaran_id=${tahunId}&page=${page}&pageSize=15`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Gagal memuat riwayat.");
      setRows(json.data ?? []);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Gagal memuat riwayat.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunId, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Riwayat Perubahan Anggaran</h1>
        <Link href="/dpa" className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
          ‹ Kembali ke Data DPA
        </Link>
      </div>

      <EntityPicker
        label="Tahun Anggaran"
        endpoint="/api/master-data/tahun-anggaran"
        optionLabelKey="tahun"
        value={tahunId}
        onChange={setTahunId}
      />

      {!tahunId ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Pilih Tahun Anggaran untuk melihat riwayat perubahan.
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#0F2545]/40 p-4 shadow-lg sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="px-3 py-2 font-medium">Tanggal</th>
                  <th className="px-3 py-2 font-medium">Sub Kegiatan / Belanja</th>
                  <th className="px-3 py-2 font-medium">Tahapan</th>
                  <th className="px-3 py-2 font-medium">Jenis Perubahan</th>
                  <th className="px-3 py-2 text-right font-medium">Pagu Sebelum</th>
                  <th className="px-3 py-2 text-right font-medium">Pagu Sesudah</th>
                  <th className="px-3 py-2 text-right font-medium">Selisih</th>
                  <th className="px-3 py-2 font-medium">User</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td colSpan={8} className="px-3 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                      </td>
                    </tr>
                  ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-slate-400">
                      Belum terdapat data yang tersedia pada periode dan tahapan anggaran yang dipilih.
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-white/5 align-top text-slate-200">
                      <td className="whitespace-nowrap px-3 py-3">{formatTanggal(row.created_at)}</td>
                      <td className="px-3 py-3">
                        {row.dpa?.sub_kegiatan?.nama}
                        <div className="text-xs text-slate-400">
                          {row.dpa?.belanja?.kode_rekening} — {row.dpa?.uraian_belanja}
                        </div>
                        {row.catatan && <div className="mt-1 text-xs italic text-slate-500">{row.catatan}</div>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {row.tahapan_asal ? `${row.tahapan_asal} → ` : "(baru) → "}
                        {row.tahapan_tujuan}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">{JENIS_LABEL[row.jenis_perubahan] ?? row.jenis_perubahan}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">{formatRupiah(row.pagu_sebelum)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">{formatRupiah(row.pagu_sesudah)}</td>
                      <td
                        className={`whitespace-nowrap px-3 py-3 text-right font-medium ${
                          row.selisih > 0 ? "text-emerald-400" : row.selisih < 0 ? "text-red-400" : "text-slate-400"
                        }`}
                      >
                        {row.selisih >= 0 ? "+" : ""}
                        {formatRupiah(row.selisih)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">{row.user?.nama_lengkap ?? "-"}</td>
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
    </div>
  );
}
