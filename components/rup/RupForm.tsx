"use client";

// components/rup/RupForm.tsx
//
// Mode TAMBAH: user memilih Program→Kegiatan→Sub Kegiatan→Belanja; setelah
// Belanja terpilih, form otomatis mencari baris DPA yang cocok (Tahun+Tahapan
// aktif) dan menampilkan pagu DPA serta SISA pagu yang masih bisa dipakai.
// Mode EDIT: dpa_id sudah tetap (tidak bisa dipindah), hanya info DPA yang
// ditampilkan. Input pagu paket divalidasi langsung terhadap sisa pagu —
// ini pemeriksaan kenyamanan; penegakan sesungguhnya ada di server
// (lib/rup/pagu-check.ts).

import { useEffect, useState } from "react";
import { DependentSelect } from "@/components/master-data/DependentSelect";
import { AsyncSelect } from "@/components/master-data/AsyncSelect";
import { formatRupiah } from "@/lib/format/rupiah";

interface DpaInfo {
  id: string;
  uraian_belanja: string;
  pagu_anggaran: number;
  total_pagu_rup_terpakai: number;
  sisa_pagu: number;
}

type Values = Record<string, any>;

const INPUT =
  "w-full rounded-lg border border-slate-600 bg-[#0B1E3D] px-3 py-2 text-sm text-white outline-none focus:border-[#3FD8FF]";
const LABEL = "mb-1.5 block text-sm font-medium text-slate-200";

export function RupForm({
  mode,
  tahunId,
  tahapanId,
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  mode: "create" | "edit";
  tahunId: string;
  tahapanId: string;
  initial?: Values; // baris RUP saat edit
  onSubmit: (values: Values) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [programId, setProgramId] = useState("");
  const [kegiatanId, setKegiatanId] = useState("");
  const [subKegiatanId, setSubKegiatanId] = useState("");
  const [belanjaId, setBelanjaId] = useState("");
  const [dpa, setDpa] = useState<DpaInfo | null>(null);
  const [dpaMessage, setDpaMessage] = useState<string | null>(null);

  const [v, setV] = useState<Values>({
    kode_rup: initial?.kode_rup ?? "",
    nama_paket: initial?.nama_paket ?? "",
    jenis_rup: initial?.jenis_rup ?? "PENYEDIA",
    jenis_pengadaan_id: initial?.jenis_pengadaan_id ?? "",
    metode_pengadaan_id: initial?.metode_pengadaan_id ?? "",
    pagu_paket: initial?.pagu_paket ?? 0,
    sumber_dana_id: initial?.sumber_dana_id ?? "",
    lokasi: initial?.lokasi ?? "",
    volume: initial?.volume ?? "",
    satuan: initial?.satuan ?? "",
    jadwal_pemilihan: initial?.jadwal_pemilihan ?? "",
    jadwal_mulai: initial?.jadwal_mulai ?? "",
    jadwal_selesai: initial?.jadwal_selesai ?? "",
    spesifikasi: initial?.spesifikasi ?? "",
    status_rup: initial?.status_rup ?? "AKTIF",
  });
  const set = (name: string, value: unknown) => setV((prev) => ({ ...prev, [name]: value }));

  // Lookup DPA — mode tambah lewat belanja, mode edit lewat dpa_id
  useEffect(() => {
    let cancelled = false;
    setDpa(null);
    setDpaMessage(null);

    let url: string | null = null;
    if (mode === "edit" && initial?.dpa_id) {
      url = `/api/rup/dpa-lookup?dpa_id=${initial.dpa_id}&exclude_rup_id=${initial.id}`;
    } else if (mode === "create" && belanjaId) {
      url = `/api/rup/dpa-lookup?tahun_anggaran_id=${tahunId}&tahapan_anggaran_id=${tahapanId}&belanja_id=${belanjaId}`;
    }
    if (!url) return;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.data) setDpa(json.data);
        else setDpaMessage(json.message ?? "Data DPA tidak ditemukan.");
      })
      .catch(() => !cancelled && setDpaMessage("Gagal memuat data DPA."));
    return () => {
      cancelled = true;
    };
  }, [mode, belanjaId, tahunId, tahapanId, initial?.dpa_id, initial?.id]);

  const pagu = Number(v.pagu_paket) || 0;
  const melebihi = dpa ? pagu > dpa.sisa_pagu : false;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Values = {
      kode_rup: v.kode_rup,
      nama_paket: v.nama_paket,
      jenis_rup: v.jenis_rup,
      jenis_pengadaan_id: v.jenis_pengadaan_id || null,
      metode_pengadaan_id: v.metode_pengadaan_id || null,
      pagu_paket: pagu,
      sumber_dana_id: v.sumber_dana_id || null,
      lokasi: v.lokasi || null,
      volume: v.volume === "" ? null : Number(v.volume),
      satuan: v.satuan || null,
      jadwal_pemilihan: v.jadwal_pemilihan || null,
      jadwal_mulai: v.jadwal_mulai || null,
      jadwal_selesai: v.jadwal_selesai || null,
      spesifikasi: v.spesifikasi || null,
      status_rup: v.status_rup,
    };
    if (mode === "create") {
      payload.tahun_anggaran_id = tahunId;
      payload.tahapan_anggaran_id = tahapanId;
      payload.dpa_id = dpa?.id;
    }
    onSubmit(payload);
  }

  const canSubmit = mode === "edit" || Boolean(dpa);

  return (
    <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
      {mode === "create" && (
        <fieldset className="space-y-4 rounded-lg border border-white/10 p-4">
          <legend className="px-2 text-xs uppercase tracking-wide text-slate-400">Acuan Anggaran (DPA)</legend>
          <DependentSelect
            label="Program" value={programId} onChange={setProgramId} parentValue={tahapanId}
            endpoint="/api/master-data/program" parentQueryParam="tahapan_anggaran_id" optionLabelKey="nama" required
          />
          <DependentSelect
            label="Kegiatan" value={kegiatanId} onChange={setKegiatanId} parentValue={programId}
            endpoint="/api/master-data/kegiatan" parentQueryParam="program_id" optionLabelKey="nama" required
          />
          <DependentSelect
            label="Sub Kegiatan" value={subKegiatanId} onChange={setSubKegiatanId} parentValue={kegiatanId}
            endpoint="/api/master-data/sub-kegiatan" parentQueryParam="kegiatan_id" optionLabelKey="nama" required
          />
          <DependentSelect
            label="Belanja (Kode Rekening)" value={belanjaId} onChange={setBelanjaId} parentValue={subKegiatanId}
            endpoint="/api/master-data/belanja" parentQueryParam="sub_kegiatan_id" optionLabelKey="uraian_belanja" required
          />
        </fieldset>
      )}

      {dpaMessage && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {dpaMessage}
        </div>
      )}
      {dpa && (
        <div className="rounded-lg border border-white/10 bg-[#0B1E3D] px-4 py-3 text-sm text-slate-300">
          <p className="mb-1 font-medium text-white">{dpa.uraian_belanja}</p>
          <p>Pagu DPA: <span className="text-[#3FD8FF]">{formatRupiah(dpa.pagu_anggaran)}</span></p>
          <p>Sudah dipakai paket RUP lain: {formatRupiah(dpa.total_pagu_rup_terpakai)}</p>
          <p>Sisa pagu: <span className={dpa.sisa_pagu < 0 ? "text-red-400" : "text-emerald-400"}>{formatRupiah(dpa.sisa_pagu)}</span></p>
        </div>
      )}

      <div>
        <label className={LABEL}>Kode RUP <span className="text-red-400">*</span></label>
        <input className={INPUT} required value={v.kode_rup} onChange={(e) => set("kode_rup", e.target.value)} />
      </div>
      <div>
        <label className={LABEL}>Nama Paket <span className="text-red-400">*</span></label>
        <input className={INPUT} required value={v.nama_paket} onChange={(e) => set("nama_paket", e.target.value)} />
      </div>
      <div>
        <label className={LABEL}>Jenis RUP <span className="text-red-400">*</span></label>
        <select className={INPUT} value={v.jenis_rup} onChange={(e) => set("jenis_rup", e.target.value)}>
          <option value="PENYEDIA">RUP Penyedia</option>
          <option value="SWAKELOLA">RUP Swakelola</option>
        </select>
      </div>
      <AsyncSelect label="Jenis Pengadaan" value={v.jenis_pengadaan_id} onChange={(x) => set("jenis_pengadaan_id", x)}
        endpoint="/api/master-data/jenis-pengadaan" optionLabelKey="nama" />
      <AsyncSelect label="Metode Pengadaan" value={v.metode_pengadaan_id} onChange={(x) => set("metode_pengadaan_id", x)}
        endpoint="/api/master-data/metode-pengadaan" optionLabelKey="nama" />

      <div>
        <label className={LABEL}>Pagu Paket (Rp) <span className="text-red-400">*</span></label>
        <input className={INPUT} type="number" min={0} required value={v.pagu_paket}
          onChange={(e) => set("pagu_paket", e.target.value)} />
        {melebihi && dpa && (
          <p className="mt-1 text-xs text-red-400">
            Pagu paket melebihi sisa pagu DPA ({formatRupiah(dpa.sisa_pagu)}). Server dapat menolak atau
            memberi peringatan sesuai konfigurasi validasi.
          </p>
        )}
      </div>

      <AsyncSelect label="Sumber Dana" value={v.sumber_dana_id} onChange={(x) => set("sumber_dana_id", x)}
        endpoint="/api/master-data/sumber-dana" optionLabelKey="nama" />
      <div>
        <label className={LABEL}>Lokasi</label>
        <input className={INPUT} value={v.lokasi} onChange={(e) => set("lokasi", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Volume</label>
          <input className={INPUT} type="number" min={0} value={v.volume} onChange={(e) => set("volume", e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Satuan</label>
          <input className={INPUT} value={v.satuan} onChange={(e) => set("satuan", e.target.value)} />
        </div>
      </div>
      <div>
        <label className={LABEL}>Jadwal Pemilihan</label>
        <input className={INPUT} type="date" value={v.jadwal_pemilihan} onChange={(e) => set("jadwal_pemilihan", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Mulai Pelaksanaan</label>
          <input className={INPUT} type="date" value={v.jadwal_mulai} onChange={(e) => set("jadwal_mulai", e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Selesai Pelaksanaan</label>
          <input className={INPUT} type="date" value={v.jadwal_selesai} onChange={(e) => set("jadwal_selesai", e.target.value)} />
        </div>
      </div>
      <div>
        <label className={LABEL}>Spesifikasi / Keterangan</label>
        <textarea className={INPUT} rows={3} value={v.spesifikasi} onChange={(e) => set("spesifikasi", e.target.value)} />
      </div>
      <div>
        <label className={LABEL}>Status RUP</label>
        <select className={INPUT} value={v.status_rup} onChange={(e) => set("status_rup", e.target.value)}>
          <option value="DRAFT">Draft</option>
          <option value="AKTIF">Aktif</option>
          <option value="NONAKTIF">Nonaktif</option>
        </select>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} disabled={submitting}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5">
          Batal
        </button>
        <button type="submit" disabled={submitting || !canSubmit}
          className="rounded-lg bg-[#3FD8FF] px-4 py-2 text-sm font-semibold text-[#0B1E3D] hover:brightness-95 disabled:opacity-60">
          {submitting ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </form>
  );
}
