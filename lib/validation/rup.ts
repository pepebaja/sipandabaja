// lib/validation/rup.ts
import { z } from "zod";

export const rupCreateSchema = z.object({
  tahun_anggaran_id: z.string().uuid(),
  tahapan_anggaran_id: z.string().uuid(),
  dpa_id: z.string().uuid(),
  kode_rup: z.string().trim().min(1).max(50),
  nama_paket: z.string().trim().min(1).max(300),
  jenis_rup: z.enum(["PENYEDIA", "SWAKELOLA"]),
  jenis_pengadaan_id: z.string().uuid().optional().nullable(),
  metode_pengadaan_id: z.string().uuid().optional().nullable(),
  pagu_paket: z.number().nonnegative("Pagu paket tidak boleh negatif"),
  sumber_dana_id: z.string().uuid().optional().nullable(),
  lokasi: z.string().trim().max(300).optional().nullable(),
  volume: z.number().nonnegative().optional().nullable(),
  satuan: z.string().trim().max(50).optional().nullable(),
  jadwal_pemilihan: z.string().optional().nullable(), // date string 'YYYY-MM-DD'
  jadwal_mulai: z.string().optional().nullable(),
  jadwal_selesai: z.string().optional().nullable(),
  spesifikasi: z.string().trim().max(2000).optional().nullable(),
  status_rup: z.enum(["DRAFT", "AKTIF", "NONAKTIF", "DIARSIPKAN"]).optional().default("AKTIF"),
});

// Update: field yang boleh diubah lewat edit biasa. Perubahan tercatat
// otomatis per-field ke rup_revision (lihat app/api/rup/[id]/route.ts) —
// berbeda dari DPA, RUP tidak butuh baris baru per tahapan untuk edit ini
// karena satu baris RUP memang mewakili satu paket yang berkembang dari
// waktu ke waktu (bukan snapshot pagu berjenjang seperti DPA).
export const rupUpdateSchema = rupCreateSchema.partial().omit({
  tahun_anggaran_id: true,
  tahapan_anggaran_id: true,
  dpa_id: true,
});

export type RupCreateInput = z.infer<typeof rupCreateSchema>;
export type RupUpdateInput = z.infer<typeof rupUpdateSchema>;
