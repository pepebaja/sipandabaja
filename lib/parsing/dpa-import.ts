// lib/parsing/dpa-import.ts
//
// Alur Section R: Upload → Validasi → Preview → Cek Error → Konfirmasi →
// Import. Modul ini menangani parsing + validasi (tanpa menulis ke DB —
// lihat app/api/dpa/import/preview/route.ts). Commit sesungguhnya ada di
// app/api/dpa/import/commit/route.ts, hanya untuk baris yang lolos validasi.
//
// Kolom yang diharapkan di file (header baris pertama, tidak case-sensitive):
//   Kode Program | Kode Kegiatan | Kode Sub Kegiatan | Kode Rekening |
//   Uraian Belanja | Pagu Anggaran | Sumber Dana | Keterangan
//
// Kode Program/Kegiatan/Sub Kegiatan dipakai untuk menelusuri hierarki
// hingga menemukan baris `belanja` yang tepat — karena kode_rekening hanya
// unik DI DALAM satu sub kegiatan, bukan unik global (lihat skema 002).

import * as XLSX from "xlsx";
import { supabaseAdmin } from "@/lib/db/supabase-admin";

export interface DpaImportRowResult {
  rowNumber: number; // baris di file (mulai dari 2, karena baris 1 = header)
  raw: Record<string, unknown>;
  resolved?: {
    tahun_anggaran_id: string;
    tahapan_anggaran_id: string;
    sub_kegiatan_id: string;
    belanja_id: string;
    uraian_belanja: string;
    pagu_anggaran: number;
    sumber_dana_id: string | null;
    keterangan: string | null;
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

/**
 * Validasi seluruh baris terhadap master data yang sudah ada. Tidak menulis
 * apa pun ke database — murni SELECT untuk resolusi kode → id.
 */
export async function validateDpaImportRows(
  rows: Record<string, unknown>[],
  context: { tahun_anggaran_id: string; tahapan_anggaran_id: string }
): Promise<DpaImportRowResult[]> {
  const results: DpaImportRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNumber = i + 2;
    const errors: string[] = [];

    const kodeProgram = getCell(raw, "kode_program");
    const kodeKegiatan = getCell(raw, "kode_kegiatan");
    const kodeSubKegiatan = getCell(raw, "kode_sub_kegiatan");
    const kodeRekening = getCell(raw, "kode_rekening");
    const uraianBelanja = getCell(raw, "uraian_belanja");
    const paguStr = getCell(raw, "pagu_anggaran", "pagu");
    const sumberDanaNama = getCell(raw, "sumber_dana");
    const keterangan = getCell(raw, "keterangan") ?? null;

    if (!kodeProgram) errors.push(`Baris ${rowNumber}: Kode Program belum diisi.`);
    if (!kodeKegiatan) errors.push(`Baris ${rowNumber}: Kode Kegiatan belum diisi.`);
    if (!kodeSubKegiatan) errors.push(`Baris ${rowNumber}: Kode Sub Kegiatan belum diisi.`);
    if (!kodeRekening) errors.push(`Baris ${rowNumber}: Kode Rekening belum diisi.`);
    if (!uraianBelanja) errors.push(`Baris ${rowNumber}: Uraian Belanja belum diisi.`);

    let pagu: number | null = null;
    if (!paguStr) {
      errors.push(`Baris ${rowNumber}: Pagu Anggaran belum diisi.`);
    } else {
      const cleaned = paguStr.replace(/[^0-9.,-]/g, "").replace(/\./g, "").replace(",", ".");
      pagu = Number(cleaned);
      if (Number.isNaN(pagu)) errors.push(`Baris ${rowNumber}: Format angka Pagu Anggaran salah.`);
      else if (pagu < 0) errors.push(`Baris ${rowNumber}: Pagu Anggaran tidak boleh negatif.`);
    }

    // Hentikan penelusuran hierarki bila kode dasar sudah tidak lengkap.
    if (errors.length > 0) {
      results.push({ rowNumber, raw, errors });
      continue;
    }

    const { data: program } = await supabaseAdmin
      .from("program")
      .select("id")
      .eq("tahun_anggaran_id", context.tahun_anggaran_id)
      .eq("tahapan_anggaran_id", context.tahapan_anggaran_id)
      .eq("kode", kodeProgram)
      .maybeSingle();
    if (!program) {
      errors.push(`Baris ${rowNumber}: Kode Program '${kodeProgram}' tidak ditemukan pada Tahun/Tahapan terpilih.`);
      results.push({ rowNumber, raw, errors });
      continue;
    }

    const { data: kegiatan } = await supabaseAdmin
      .from("kegiatan")
      .select("id")
      .eq("program_id", program.id)
      .eq("kode", kodeKegiatan)
      .maybeSingle();
    if (!kegiatan) {
      errors.push(`Baris ${rowNumber}: Kode Kegiatan '${kodeKegiatan}' tidak ditemukan di bawah Program '${kodeProgram}'.`);
      results.push({ rowNumber, raw, errors });
      continue;
    }

    const { data: subKegiatan } = await supabaseAdmin
      .from("sub_kegiatan")
      .select("id")
      .eq("kegiatan_id", kegiatan.id)
      .eq("kode", kodeSubKegiatan)
      .maybeSingle();
    if (!subKegiatan) {
      errors.push(`Baris ${rowNumber}: Kode Sub Kegiatan '${kodeSubKegiatan}' tidak ditemukan di bawah Kegiatan '${kodeKegiatan}'.`);
      results.push({ rowNumber, raw, errors });
      continue;
    }

    const { data: belanja } = await supabaseAdmin
      .from("belanja")
      .select("id")
      .eq("sub_kegiatan_id", subKegiatan.id)
      .eq("kode_rekening", kodeRekening)
      .maybeSingle();
    if (!belanja) {
      errors.push(`Baris ${rowNumber}: Kode Rekening '${kodeRekening}' tidak ditemukan di bawah Sub Kegiatan '${kodeSubKegiatan}'.`);
      results.push({ rowNumber, raw, errors });
      continue;
    }

    let sumberDanaId: string | null = null;
    if (sumberDanaNama) {
      const { data: sumberDana } = await supabaseAdmin
        .from("sumber_dana")
        .select("id")
        .ilike("nama", sumberDanaNama)
        .maybeSingle();
      if (!sumberDana) {
        errors.push(`Baris ${rowNumber}: Sumber Dana '${sumberDanaNama}' tidak ditemukan di Master Data.`);
      } else {
        sumberDanaId = sumberDana.id;
      }
    }

    const { data: dpaExisting } = await supabaseAdmin
      .from("dpa")
      .select("id")
      .eq("tahun_anggaran_id", context.tahun_anggaran_id)
      .eq("tahapan_anggaran_id", context.tahapan_anggaran_id)
      .eq("belanja_id", belanja.id)
      .maybeSingle();
    if (dpaExisting) {
      errors.push(
        `Baris ${rowNumber}: Data DPA untuk kombinasi ini sudah ada pada tahapan terpilih. Gunakan menu Revisi untuk mengubah pagu, bukan import ulang.`
      );
    }

    if (errors.length > 0) {
      results.push({ rowNumber, raw, errors });
      continue;
    }

    results.push({
      rowNumber,
      raw,
      errors: [],
      resolved: {
        tahun_anggaran_id: context.tahun_anggaran_id,
        tahapan_anggaran_id: context.tahapan_anggaran_id,
        sub_kegiatan_id: subKegiatan.id,
        belanja_id: belanja.id,
        uraian_belanja: uraianBelanja!,
        pagu_anggaran: pagu!,
        sumber_dana_id: sumberDanaId,
        keterangan,
      },
    });
  }

  return results;
}
