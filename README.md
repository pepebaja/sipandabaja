# SIPANDA — Phase 3: Authentication & Security

## Prasyarat
- Migrasi database Phase 2 (001–011) dan `supabase/migrations/012_login_attempts.sql` di folder ini sudah dijalankan.
- Dependency terpasang — gabungkan isi `package.additions.json` ke `package.json` project, lalu `npm install`.
- Salin `.env.example` → `.env.local`, isi semua nilai (lihat komentar di tiap baris).

## Langkah Setup

1. **Jalankan migrasi tambahan**
   ```bash
   # 012_login_attempts.sql (jika belum)
   ```

2. **Buat akun ADMIN pertama** (satu-satunya cara membuat user lewat script — selanjutnya lewat menu Pengaturan → User oleh ADMIN):
   ```bash
   npx tsx scripts/create-admin-user.ts --username=admin --nama="Admin SIPANDA" --password="GantiSegera#123"
   ```
   Ganti password ini segera setelah login pertama (halaman ganti password menyusul di Phase 4).

3. **Salin file ke project Next.js SIPANDA** — struktur folder di sini sudah mengikuti struktur `app/`, `lib/`, `components/`, `middleware.ts` pada dokumen Phase 1 (STEP 5), tinggal digabung ke root project.

4. **Jalankan aplikasi**
   ```bash
   npm run dev
   ```
   Buka `/login` — form akan memakai logo SIPANDA (`public/logo-sipanda.png`) dan palet warna sesuai Design System (STEP 6).

## Struktur yang Ditambahkan

```
app/
├── (auth)/login/page.tsx
└── api/auth/
    ├── login/route.ts
    └── logout/route.ts
components/auth/LoginForm.tsx
lib/
├── auth/
│   ├── password.ts     (hash argon2id)
│   ├── jwt.ts           (sign/verify session token)
│   ├── session.ts       (cookie httpOnly)
│   ├── rate-limit.ts    (brute-force protection)
│   └── rbac.ts          (requirePermission, dipakai tiap Route Handler)
├── db/
│   ├── supabase-admin.ts (baca data + Storage)
│   └── pg.ts              (mutasi + audit context — WAJIB dipakai untuk INSERT/UPDATE/DELETE)
├── validation/auth.ts
└── audit/logger.ts
middleware.ts
scripts/create-admin-user.ts
supabase/migrations/012_login_attempts.sql
docs/SECURITY-CHECKLIST.md
```

## Yang Perlu Diperhatikan Tim Pengembang Selanjutnya (Phase 4+)

- **Semua modul CRUD baru (DPA, RUP, dll.) wajib**:
  1. Memanggil `requirePermission("<modul>.<aksi>")` di awal Route Handler.
  2. Memakai `withAuditContext()` dari `lib/db/pg.ts` untuk operasi tulis (bukan `supabaseAdmin` langsung), agar trigger audit mencatat user_id/IP dengan benar.
  3. Memvalidasi body request dengan skema Zod (ikuti pola `lib/validation/auth.ts`).
- Lihat `docs/SECURITY-CHECKLIST.md` untuk pemetaan lengkap ke Section C dokumen spesifikasi, termasuk item yang sengaja ditunda ke fase berikutnya (confirmation dialog UI, soft-delete per modul, backup terjadwal).
