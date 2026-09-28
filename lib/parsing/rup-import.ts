// lib/parsing/rup-import.ts
//
// Kolom yang diharapkan (header baris pertama):
//   Kode Program | Kode Kegiatan | Kode Sub Kegiatan | Kode Rekening |
//   Kode RUP | Nama Paket | Jenis RUP (PENYEDIA/SWAKELOLA) |
//   Kode Jenis Pengadaan | Kode Metode Pengadaan | Pagu Paket | Sumber Dana |
//   Lokasi | Volume | Satuan | Jadwal Pemilihan | Jadwal Mulai | Jadwal Selesai | Keterangan
//
// Sama seperti lib/parsing/dpa-import.ts: kode Program→Kegiatan→Sub
// Kegiatan→Kode Rekening dipakai untuk menemukan baris DPA yang menjadi
// acuan pagu paket, bukan cuma kode_rekening sendirian (tidak unik global).

import * as XLSX from "xlsx";
import { supabaseAdmin } from "@/lib/db/supabase-admin";
import { checkPaguRupTerhadapDpa } from "@/lib/rup/pagu-check";

export interface RupImportRowResult {
  rowNumber: number;
  raw: Record<string, unknown>;
  resolved?: {
    tahun_anggaran_id: string;
    tahapan_anggaran_id: string;
    dpa_id: string;
    kode_rup: string;
    nama_paket: string;
    jenis_rup: "PENYEDIA" | "SWAKELOLA";
    jenis_pengadaan_id: string | null;
    metode_pengadaan_id: string | null;
    pagu_paket: number;
    sumber_dana_id: string | null;
    lokasi: string | null;
    volume: number | null;
    satuan: string | null;
    jadwal_pemilihan: string | null;
    jadwal_mulai: string | null;
    jadwal_selesai: string | null;
    spesifikasi: string | null;
  };
  errors: string[];
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}
function getCell(row: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = row[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}
function parseNumber(v: string | undefined): number | null {
  if (!v) return null;
  const cleaned = v.replace(/[^0-9.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
}

export function parseFileToRows(buffer: Buffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return rawRows.map((row) => {
    const normalized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) normalized[normalizeHeader(k)] = v;
    return normalized;
  });
}

export async function validateRupImportRows(
  rows: Record<string, unknown>[],
  context: { tahun_anggaran_id: string; tahapan_anggaran_id: string }
): Promise<RupImportRowResult[]> {
  const results: RupImportRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNumber = i + 2;
    const errors: string[] = [];

    const kodeProgram = getCell(raw, "kode_program");
    const kodeKegiatan = getCell(raw, "kode_kegiatan");
    const kodeSubKegiatan = getCell(raw, "kode_sub_kegiatan");
    const kodeRekening = getCell(raw, "kode_rekening");
    const kodeRup = getCell(raw, "kode_rup");
    const namaPaket = getCell(raw, "nama_paket");
    const jenisRupStr = getCell(raw, "jenis_rup")?.toUpperCase();
    const kodeJenisPengadaan = getCell(raw, "kode_jenis_pengadaan", "jenis_pengadaan");
    const kodeMetodePengadaan = getCell(raw, "kode_metode_pengadaan", "metode_pengadaan");
    const paguStr = getCell(raw, "pagu_paket", "pagu");
    const sumberDanaNama = getCell(raw, "sumber_dana");
    const lokasi = getCell(raw, "lokasi") ?? null;
    const volume = parseNumber(getCell(raw, "volume"));
    const satuan = getCell(raw, "satuan") ?? null;
    const jadwalPemilihan = getCell(raw, "jadwal_pemilihan") ?? null;
    const jadwalMulai = getCell(raw, "jadwal_mulai") ?? null;
    const jadwalSelesai = getCell(raw, "jadwal_selesai") ?? null;
    const keterangan = getCell(raw, "keterangan", "spesifikasi") ?? null;

    if (!kodeProgram) errors.push(`Baris ${rowNumber}: Kode Program belum diisi.`);
    if (!kodeKegiatan) errors.push(`Baris ${rowNumber}: Kode Kegiatan belum diisi.`);
    if (!kodeSubKegiatan) errors.push(`Baris ${rowNumber}: Kode Sub Kegiatan belum diisi.`);
    if (!kodeRekening) errors.push(`Baris ${rowNumber}: Kode Rekening belum diisi.`);
    if (!kodeRup) errors.push(`Baris ${rowNumber}: Kode RUP belum diisi.`);
    if (!namaPaket) errors.push(`Baris ${rowNumber}: Nama Paket belum diisi.`);
    if (!jenisRupStr || !["PENYEDIA", "SWAKELOLA"].includes(jenisRupStr)) {
      errors.push(`Baris ${rowNumber}: Jenis RUP harus 'PENYEDIA' atau 'SWAKELOLA'.`);
    }
    const pagu = parseNumber(paguStr);
    if (!paguStr) errors.push(`Baris ${rowNumber}: Pagu Paket belum diisi.`);
    else if (pagu === null) errors.push(`Baris ${rowNumber}: Format angka Pagu Paket salah.`);
    else if (pagu < 0) errors.push(`Baris ${rowNumber}: Pagu Paket tidak boleh negatif.`);

    if (errors.length > 0) {
      results.push({ rowNumber, raw, errors });
      continue;
    }

    // Resolusi hierarki -> baris DPA (sama seperti dpa-import)
    const { data: program } = await supabaseAdmin
      .from("program")
      .select("id")
      .eq("tahun_anggaran_id", context.tahun_anggaran_id)
      .eq("tahapan_anggaran_id", context.tahapan_anggaran_id)
      .eq("kode", kodeProgram)
      .maybeSingle();
    if (!program) {
      results.push({ rowNumber, raw, errors: [`Baris ${rowNumber}: Kode Program '${kodeProgram}' tidak ditemukan.`] });
      continue;
    }
    const { data: kegiatan } = await supabaseAdmin
      .from("kegiatan").select("id").eq("program_id", program.id).eq("kode", kodeKegiatan).maybeSingle();
    if (!kegiatan) {
      results.push({ rowNumber, raw, errors: [`Baris ${rowNumber}: Kode Kegiatan '${kodeKegiatan}' tidak ditemukan.`] });
      continue;
    }
    const { data: subKegiatan } = await supabaseAdmin
      .from("sub_kegiatan").select("id").eq("kegiatan_id", kegiatan.id).eq("kode", kodeSubKegiatan).maybeSingle();
    if (!subKegiatan) {
      results.push({ rowNumber, raw, errors: [`Baris ${rowNumber}: Kode Sub Kegiatan '${kodeSubKegiatan}' tidak ditemukan.`] });
      continue;
    }
    const { data: belanja } = await supabaseAdmin
      .from("belanja").select("id").eq("sub_kegiatan_id", subKegiatan.id).eq("kode_rekening", kodeRekening).maybeSingle();
    if (!belanja) {
      results.push({ rowNumber, raw, errors: [`Baris ${rowNumber}: Kode Rekening '${kodeRekening}' tidak ditemukan.`] });
      continue;
    }
    const { data: dpa } = await supabaseAdmin
      .from("dpa")
      .select("id")
      .eq("tahun_anggaran_id", context.tahun_anggaran_id)
      .eq("tahapan_anggaran_id", context.tahapan_anggaran_id)
      .eq("belanja_id", belanja.id)
      .maybeSingle();
    if (!dpa) {
      results.push({
        rowNumber, raw,
        errors: [`Baris ${rowNumber}: Belum ada data DPA untuk Kode Rekening '${kodeRekening}' pada Tahun/Tahapan ini. Tambahkan DPA-nya terlebih dahulu.`],
      });
      continue;
    }

    const { data: dupRup } = await supabaseAdmin
      .from("rup")
      .select("id")
      .eq("tahun_anggaran_id", context.tahun_anggaran_id)
      .eq("tahapan_anggaran_id", context.tahapan_anggaran_id)
      .eq("kode_rup", kodeRup)
      .maybeSingle();
    if (dupRup) {
      results.push({ rowNumber, raw, errors: [`Baris ${rowNumber}: Kode RUP '${kodeRup}' sudah ada pada Tahun/Tahapan ini.`] });
      continue;
    }

    let jenisPengadaanId: string | null = null;
    if (kodeJenisPengadaan) {
      const { data } = await supabaseAdmin.from("jenis_pengadaan").select("id").eq("kode", kodeJenisPengadaan).maybeSingle();
      if (!data) errors.push(`Baris ${rowNumber}: Kode Jenis Pengadaan '${kodeJenisPengadaan}' tidak ditemukan.`);
      else jenisPengadaanId = data.id;
    }
    let metodePengadaanId: string | null = null;
    if (kodeMetodePengadaan) {
      const { data } = await supabaseAdmin.from("metode_pengadaan").select("id").eq("kode", kodeMetodePengadaan).maybeSingle();
      if (!data) errors.push(`Baris ${rowNumber}: Kode Metode Pengadaan '${kodeMetodePengadaan}' tidak ditemukan.`);
      else metodePengadaanId = data.id;
    }
    let sumberDanaId: string | null = null;
    if (sumberDanaNama) {
      const { data } = await supabaseAdmin.from("sumber_dana").select("id").ilike("nama", sumberDanaNama).maybeSingle();
      if (!data) errors.push(`Baris ${rowNumber}: Sumber Dana '${sumberDanaNama}' tidak ditemukan.`);
      else sumberDanaId = data.id;
    }

    if (errors.length > 0) {
      results.push({ rowNumber, raw, errors });
      continue;
    }

    const paguCheck = await checkPaguRupTerhadapDpa({ dpaId: dpa.id, paguPaketBaru: pagu! });
    if (paguCheck.diblokir) {
      results.push({ rowNumber, raw, errors: [`Baris ${rowNumber}: ${paguCheck.pesan}`] });
      continue;
    }

    results.push({
      rowNumber,
      raw,
      errors: [],
      resolved: {
        tahun_anggaran_id: context.tahun_anggaran_id,
        tahapan_anggaran_id: context.tahapan_anggaran_id,
        dpa_id: dpa.id,
        kode_rup: kodeRup!,
        nama_paket: namaPaket!,
        jenis_rup: jenisRupStr as "PENYEDIA" | "SWAKELOLA",
        jenis_pengadaan_id: jenisPengadaanId,
        metode_pengadaan_id: metodePengadaanId,
        pagu_paket: pagu!,
        sumber_dana_id: sumberDanaId,
        lokasi,
        volume,
        satuan,
        jadwal_pemilihan: jadwalPemilihan,
        jadwal_mulai: jadwalMulai,
        jadwal_selesai: jadwalSelesai,
        spesifikasi: keterangan,
      },
    });
  }

  return results;
}
