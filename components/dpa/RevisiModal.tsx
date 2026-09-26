"use client";

// components/dpa/RevisiModal.tsx
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatRupiah } from "@/lib/format/rupiah";
import { useToast } from "@/components/ui/Toast";

interface SelectOption {
  value: string;
  label: string;
}

const JENIS_PERUBAHAN_OPTIONS: SelectOption[] = [
  { value: "PERUBAHAN_PAGU", label: "Perubahan Pagu" },
  { value: "PENAMBAHAN_SUB_KEGIATAN", label: "Penambahan Sub Kegiatan" },
  { value: "PENAMBAHAN_BELANJA", label: "Penambahan Belanja" },
  { value: "PERUBAHAN_SUMBER_DANA", label: "Perubahan Sumber Dana" },
  { value: "PENGHAPUSAN", label: "Penghapusan" },
];

export function RevisiModal({
  open,
  onClose,
  dpaSumber,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  dpaSumber: {
    id: string;
    tahun_anggaran_id: string;
    sub_kegiatan_id: string;
    belanja_id: string;
    uraian_belanja: string;
    pagu_anggaran: number;
    sumber_dana_id: string | null;
  } | null;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [tahapanOptions, setTahapanOptions] = useState<SelectOption[]>([]);
  const [tahapanTujuanId, setTahapanTujuanId] = useState("");
  const [paguBaru, setPaguBaru] = useState<number>(0);
  const [jenisPerubahan, setJenisPerubahan] = useState("PERUBAHAN_PAGU");
  const [catatan, setCatatan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !dpaSumber) return;
    setPaguBaru(dpaSumber.pagu_anggaran);
    setTahapanTujuanId("");
    setCatatan("");
    setJenisPerubahan("PERUBAHAN_PAGU");

    fetch(`/api/master-data/tahapan-anggaran?tahun_anggaran_id=${dpaSumber.tahun_anggaran_id}&pageSize=10`)
      .then((res) => res.json())
      .then((json) => {
        setTahapanOptions(
          (json.data ?? []).map((row: any) => ({ value: row.id, label: row.nama }))
        );
      });
  }, [open, dpaSumber]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dpaSumber) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/dpa/revisi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dpa_asal_id: dpaSumber.id,
          tahun_anggaran_id: dpaSumber.tahun_anggaran_id,
          tahapan_tujuan_id: tahapanTujuanId,
          sub_kegiatan_id: dpaSumber.sub_kegiatan_id,
          belanja_id: dpaSumber.belanja_id,
          uraian_belanja: dpaSumber.uraian_belanja,
          pagu_baru: paguBaru,
          sumber_dana_id: dpaSumber.sumber_dana_id,
          jenis_perubahan: jenisPerubahan,
          catatan: catatan || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Gagal menyimpan revisi.");
      toast.show("success", json.message ?? "Revisi berhasil disimpan.");
      onSuccess();
      onClose();
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Gagal menyimpan revisi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!dpaSumber) return null;

  const selisih = paguBaru - dpaSumber.pagu_anggaran;

  return (
    <Modal open={open} onClose={onClose} title="Buat Revisi Anggaran">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border border-white/10 bg-[#0B1E3D] px-4 py-3 text-sm text-slate-300">
          <p className="mb-1 font-medium text-white">{dpaSumber.uraian_belanja}</p>
          <p>Pagu saat ini: <span className="text-[#3FD8FF]">{formatRupiah(dpaSumber.pagu_anggaran)}</span></p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-200">
            Tahapan Tujuan <span className="text-red-400">*</span>
          </label>
          <select
            required
            value={tahapanTujuanId}
            onChange={(e) => setTahapanTujuanId(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-[#0B1E3D] px-3 py-2 text-sm text-white outline-none focus:border-[#3FD8FF]"
          >
            <option value="">— Pilih tahapan tujuan —</option>
            {tahapanOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-200">
            Pagu Baru (Rp) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            required
            min={0}
            value={paguBaru}
            onChange={(e) => setPaguBaru(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-600 bg-[#0B1E3D] px-3 py-2 text-sm text-white outline-none focus:border-[#3FD8FF]"
          />
          <p className={`mt-1 text-xs ${selisih > 0 ? "text-emerald-400" : selisih < 0 ? "text-red-400" : "text-slate-400"}`}>
            Selisih: {selisih >= 0 ? "+" : ""}
            {formatRupiah(selisih)}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-200">Jenis Perubahan</label>
          <select
            value={jenisPerubahan}
            onChange={(e) => setJenisPerubahan(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-[#0B1E3D] px-3 py-2 text-sm text-white outline-none focus:border-[#3FD8FF]"
          >
            {JENIS_PERUBAHAN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-200">Catatan</label>
          <textarea
            rows={2}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="mis. Penyesuaian sesuai hasil pembahasan pergeseran anggaran"
            className="w-full rounded-lg border border-slate-600 bg-[#0B1E3D] px-3 py-2 text-sm text-white outline-none focus:border-[#3FD8FF]"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#3FD8FF] px-4 py-2 text-sm font-semibold text-[#0B1E3D] hover:brightness-95 disabled:opacity-60"
          >
            {submitting ? "Menyimpan..." : "Simpan Revisi"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
