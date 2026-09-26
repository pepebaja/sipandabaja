// lib/validation/master-data.ts
import { z } from "zod";

// ---------------------------------------------------------------------
// Tahun Anggaran & Tahapan Anggaran
// ---------------------------------------------------------------------
export const tahunAnggaranSchema = z.object({
  tahun: z.number().int().min(2000).max(2100),
  status_aktif: z.boolean().optional().default(true),
});

export const tahapanAnggaranSchema = z.object({
  tahun_anggaran_id: z.string().uuid(),
  nama: z.enum(["MURNI", "PERGESERAN", "PERUBAHAN"]),
  urutan: z.number().int().min(1).max(3),
  status_aktif: z.boolean().optional().default(true),
});

// ---------------------------------------------------------------------
// Struktur berjenjang: Program -> Kegiatan -> Sub Kegiatan -> Belanja
// ---------------------------------------------------------------------
export const programSchema = z.object({
  tahun_anggaran_id: z.string().uuid(),
  tahapan_anggaran_id: z.string().uuid(),
  kode: z.string().trim().min(1).max(50),
  nama: z.string().trim().min(1).max(300),
  urusan: z.string().trim().max(300).optional().nullable(),
  bidang_urusan: z.string().trim().max(300).optional().nullable(),
  status_aktif: z.boolean().optional().default(true),
});

export const kegiatanSchema = z.object({
  program_id: z.string().uuid(),
  kode: z.string().trim().min(1).max(50),
  nama: z.string().trim().min(1).max(300),
  status_aktif: z.boolean().optional().default(true),
});

export const subKegiatanSchema = z.object({
  kegiatan_id: z.string().uuid(),
  kode: z.string().trim().min(1).max(50),
  nama: z.string().trim().min(1).max(300),
  status_aktif: z.boolean().optional().default(true),
});

export const belanjaSchema = z.object({
  sub_kegiatan_id: z.string().uuid(),
  kode_rekening: z.string().trim().min(1).max(50),
  uraian_belanja: z.string().trim().min(1).max(300),
  status_aktif: z.boolean().optional().default(true),
});

// ---------------------------------------------------------------------
// Sumber Dana, Jenis/Metode Pengadaan, Status Paket
// ---------------------------------------------------------------------
export const sumberDanaSchema = z.object({
  nama: z.string().trim().min(1).max(150),
  keterangan: z.string().trim().max(500).optional().nullable(),
  status_aktif: z.boolean().optional().default(true),
});

export const jenisPengadaanSchema = z.object({
  kode: z.string().trim().min(1).max(50),
  nama: z.string().trim().min(1).max(150),
  urutan: z.number().int().min(0).optional().default(0),
  status_aktif: z.boolean().optional().default(true),
});

export const metodePengadaanSchema = z.object({
  kode: z.string().trim().min(1).max(50),
  nama: z.string().trim().min(1).max(150),
  kategori_metode: z.enum(["E_KATALOG", "NON_EKATALOG"]),
  urutan: z.number().int().min(0).optional().default(0),
  status_aktif: z.boolean().optional().default(true),
});

export const statusPaketSchema = z.object({
  kode: z.string().trim().min(1).max(50),
  nama: z.string().trim().min(1).max(150),
  urutan: z.number().int().min(0).optional().default(0),
  is_final: z.boolean().optional().default(false),
  status_aktif: z.boolean().optional().default(true),
});

// ---------------------------------------------------------------------
// Penyedia
// ---------------------------------------------------------------------
export const penyediaSchema = z.object({
  nama_penyedia: z.string().trim().min(1).max(300),
  nib: z.string().trim().max(50).optional().nullable(),
  npwp: z.string().trim().max(50).optional().nullable(),
  alamat: z.string().trim().max(500).optional().nullable(),
  kontak: z.string().trim().max(150).optional().nullable(),
  jenis_usaha: z.string().trim().max(150).optional().nullable(),
  status_aktif: z.boolean().optional().default(true),
});

// Semua skema di atas dipakai juga untuk UPDATE lewat `.partial()` di
// masing-masing route [id] — lihat lib/api/master-crud-factory.ts.
