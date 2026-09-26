-- =========================================================
-- SIPANDA — 011 Fix: Security Definer View (Supabase Linter)
-- =========================================================
-- Linter Supabase menandai v_rekap_metode_pemilihan dan
-- v_rekap_rup_vs_realisasi sebagai "Security Definer View": secara
-- default, view di Postgres/Supabase dieksekusi dengan hak akses
-- PEMILIK view (biasanya role migrasi, mis. `postgres`, yang melewati
-- RLS), bukan hak akses role yang menjalankan query. Ini berarti jika
-- suatu saat view ini diberi akses ke role `anon`/`authenticated`,
-- RLS pada tabel dasar (rup, paket_pengadaan, kontrak, realisasi)
-- bisa TERLEWATI tanpa disadari.
--
-- Perbaikan: set security_invoker = on, agar view menjalankan query
-- dengan hak akses PEMANGGIL (mengikuti RLS role yang sedang query),
-- konsisten dengan model keamanan 008_row_level_security.sql
-- (service_role backend yang legitimate mengakses, anon/authenticated
-- tetap ditolak RLS di tabel dasar).

alter view v_rekap_metode_pemilihan   set (security_invoker = on);
alter view v_rekap_rup_vs_realisasi   set (security_invoker = on);
