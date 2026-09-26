// lib/validation/dpa.ts
import { z } from "zod";

export const dpaCreateSchema = z.object({
  tahun_anggaran_id: z.string().uuid(),
  tahapan_anggaran_id: z.string().uuid(),
  sub_kegiatan_id: z.string().uuid(),
  belanja_id: z.string().uuid(),
  uraian_belanja: z.string().trim().min(1).max(300),
  pagu_anggaran: z.number().nonnegative("Pagu tidak boleh negatif"),
  sumber_dana_id: z.string().uuid().optional().nullable(),
  keterangan: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(["DRAFT", "AKTIF", "NONAKTIF", "DIARSIPKAN"]).optional().default("AKTIF"),
});

// Membuat REVISI (Pergeseran/Perubahan) — TIDAK meng-update baris dpa lama;
// selalu membuat baris dpa baru pada tahapan_tujuan + mencatat dpa_revision.
export const dpaRevisiSchema = z.object({
  // dpa_asal_id null bila ini penambahan sub kegiatan/belanja baru pada tahapan_tujuan
  dpa_asal_id: z.string().uuid().optional().nullable(),
  tahun_anggaran_id: z.string().uuid(),
  tahapan_tujuan_id: z.string().uuid(),
  sub_kegiatan_id: z.string().uuid(),
  belanja_id: z.string().uuid(),
  uraian_belanja: z.string().trim().min(1).max(300),
  pagu_baru: z.number().nonnegative("Pagu tidak boleh negatif"),
  sumber_dana_id: z.string().uuid().optional().nullable(),
  jenis_perubahan: z.enum([
    "PENAMBAHAN_PROGRAM",
    "PENAMBAHAN_KEGIATAN",
    "PENAMBAHAN_SUB_KEGIATAN",
    "PENAMBAHAN_BELANJA",
    "PERUBAHAN_PAGU",
    "PENGHAPUSAN",
    "PERUBAHAN_SUMBER_DANA",
  ]),
  catatan: z.string().trim().max(1000).optional().nullable(),
});

export type DpaCreateInput = z.infer<typeof dpaCreateSchema>;
export type DpaRevisiInput = z.infer<typeof dpaRevisiSchema>;
