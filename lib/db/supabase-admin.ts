// lib/db/supabase-admin.ts
//
// Client Supabase dengan SERVICE ROLE KEY — melewati RLS (lihat
// 008_row_level_security.sql). File ini hanya boleh diimpor dari kode
// server (Route Handler, Server Action, middleware Node runtime).
// JANGAN PERNAH impor file ini dari Client Component ('use client') —
// service role key akan bocor ke bundle browser jika itu terjadi.

import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diset di environment " +
      "variable server. Jangan gunakan NEXT_PUBLIC_* untuk key ini."
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// PENTING — keterbatasan supabase-js untuk audit trail:
// supabase-js memanggil Supabase lewat PostgREST (HTTP), di mana SETIAP
// panggilan `.from(...).insert(...)` adalah request/transaksi tersendiri.
// Artinya `SET LOCAL app.current_user_id = ...` yang dijalankan di satu
// panggilan TIDAK akan terbawa ke panggilan berikutnya, sehingga trigger
// audit (sipanda_audit_trigger) di database tidak bisa mengandalkan pola
// ini lewat client di atas.
//
// Untuk operasi MUTASI pada tabel yang punya trigger audit (dpa, rup,
// paket_pengadaan, kontrak, realisasi, penilaian_kinerja_ppbj), gunakan
// `withAuditContext(...)` dari `lib/db/pg.ts` — yang membuka satu koneksi
// Postgres langsung dan menjalankan SET LOCAL + query mutasi dalam SATU
// transaksi, sehingga trigger audit benar-benar mendapat user_id & IP.
//
// Client `supabaseAdmin` di atas tetap dipakai untuk operasi baca (dashboard,
// laporan, smart search) dan untuk Supabase Storage (upload/unduh file
// export PDF/PPTX) di mana konteks audit trigger tidak relevan.
