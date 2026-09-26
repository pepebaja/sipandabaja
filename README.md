# SIPANDA — Database Migration (Phase 2)

## Urutan Eksekusi

Jalankan berurutan sesuai penomoran di `migrations/` (via Supabase CLI, SQL Editor Supabase Studio, atau `psql`):

```
001_extensions_and_helpers.sql
002_master_data.sql
003_dpa.sql
004_rup.sql
005_pelaksanaan.sql
006_users_roles_audit.sql
007_indexes.sql
008_row_level_security.sql
009_seed_master.sql
010_kinerja_dan_ekatalog.sql
011_fix_security_definer_views.sql
```

> `011` memperbaiki temuan Supabase Database Linter ("Security Definer View") pada `v_rekap_metode_pemilihan` dan `v_rekap_rup_vs_realisasi`. Jika database Anda sudah menjalankan migrasi 001–010 sebelumnya, cukup jalankan `011` saja (idempotent, tidak menyentuh data). Untuk deployment baru dari awal, `010` sudah memuat perbaikan ini secara langsung (`security_invoker = true`) sehingga `011` akan menjadi no-op yang aman dijalankan berulang.

`seed/001_seed_demo.sql` **opsional**, hanya untuk lingkungan development/testing (seluruh baris ditandai `[DATA DEMO]` sesuai aturan aplikasi — jangan jalankan di production).

## Dengan Supabase CLI

```bash
supabase link --project-ref <project-ref>
supabase db push
# atau, jika memakai folder migrations standar Supabase:
cp migrations/*.sql supabase/migrations/   # sesuaikan penamaan timestamp Supabase
supabase migration up
```

## Catatan Penting

1. **Auth kustom, bukan Supabase Auth** — kolom `password_hash` di tabel `users` harus diisi lewat aplikasi (argon2id/bcrypt), **tidak pernah** lewat SQL/plaintext.
2. **RLS aktif tanpa policy publik** — backend Next.js WAJIB menggunakan `SUPABASE_SERVICE_ROLE_KEY` (env var server-only) untuk semua query; anon/public key tidak dapat membaca tabel manapun by design (lihat `008_row_level_security.sql`).
3. **Audit log otomatis** — trigger `sipanda_audit_trigger()` sudah terpasang di tabel transaksional inti (`dpa`, `rup`, `paket_pengadaan`, `kontrak`, `realisasi`, `penilaian_kinerja_ppbj`). Agar `user_id` pada audit log terisi benar, server harus menjalankan pada setiap request/transaksi:
   ```sql
   select set_config('app.current_user_id', '<uuid user login>', true);
   select set_config('app.client_ip', '<ip request>', true);
   ```
   sebelum melakukan INSERT/UPDATE/DELETE.
4. **Derivasi periode otomatis** — kolom `bulan`, `triwulan`, `semester`, `tahun` pada `realisasi` adalah *generated column*; jangan pernah menuliskannya manual dari aplikasi.
5. **Perubahan pagu antar tahapan** — jangan `UPDATE` baris `dpa` milik tahapan yang sudah lewat. Alur yang benar: buat baris `dpa` baru untuk tahapan baru, lalu catat selisihnya di `dpa_revision` (lihat `003_dpa.sql`).
6. Migrasi `010_kinerja_dan_ekatalog.sql` bersifat **additive** terhadap skema Phase 2 awal — aman dijalankan setelah 001–009 tanpa mengubah data yang sudah ada.

## File Terkait
- `ADDENDUM-kinerja-ekatalog.md` — desain modul Rekap Metode Pemilihan (E-Katalog/Non E-Katalog) dan Penilaian Kinerja PPBJ (formula skor, narasi otomatis, alur export PDF/PPTX).
