# SIPANDA — Security Checklist (Phase 3: Authentication & Security)

Pemetaan setiap butir keamanan di Section C dokumen spesifikasi terhadap implementasi:

| # | Requirement | Implementasi |
|---|---|---|
| 1 | Password di-hash, bukan plaintext | `lib/auth/password.ts` — argon2id, parameter OWASP 2024 |
| 2 | Autentikasi/session aman | JWT HS256 (httpOnly, secure, sameSite=strict cookie) — `lib/auth/jwt.ts`, `lib/auth/session.ts` |
| 3 | Kompleksitas password wajar | `isPasswordComplexEnough()` — min. 10 karakter, huruf+angka |
| 4 | Logout | `app/api/auth/logout/route.ts` — hapus cookie + audit log LOGOUT |
| 5 | Session timeout | Idle timeout 30 menit + absolute timeout 8 jam (`SESSION_IDLE_TTL_SECONDS`, `SESSION_ABSOLUTE_TTL_SECONDS`) |
| 6 | Proteksi brute force | `lib/auth/rate-limit.ts` — lockout per-akun (5x gagal → kunci 15 menit) + throttle per-IP (tabel `login_attempts`) |
| 7 | RBAC | `roles`/`permissions`/`role_permissions` (skema 006/009) + `requirePermission()` (`lib/auth/rbac.ts`) + role-gating kasar di `middleware.ts` |
| 8 | Validasi input | Zod schema (`lib/validation/auth.ts`), pola serupa wajib dibuat untuk setiap form/modul selanjutnya |
| 9 | Proteksi SQL Injection | Semua query lewat supabase-js (PostgREST, parameterized) atau `postgres.js` tagged template (`lib/db/pg.ts`) — tidak ada string concatenation SQL di mana pun |
| 10 | Proteksi XSS | React/Next.js meng-escape output secara default; hindari `dangerouslySetInnerHTML`. Tambahkan header CSP di `next.config.js` pada Phase 13 (Security Audit) |
| 11 | Proteksi CSRF | Cookie `sameSite=strict` (cookie tidak terkirim pada request lintas-situs) + seluruh mutasi lewat POST/PATCH/DELETE dengan Content-Type JSON (bukan form submission sederhana yang rentan) |
| 12 | Password tidak di frontend | Password hanya dikirim sekali saat submit (HTTPS), tidak pernah disimpan di state selain saat mengetik, tidak pernah di-log |
| 13 | Secret tidak ter-expose | `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `DATABASE_URL` hanya di env var server (`server-only` import guard di `lib/db/supabase-admin.ts` dan `lib/db/pg.ts`) |
| 14 | Environment variables | `.env.example` disediakan; nilai asli tidak pernah masuk repo |
| 15 | Validasi permission di server | `requirePermission()` dipanggil di Route Handler, BUKAN hanya menyembunyikan tombol di UI |
| 16–17 | Audit log setiap perubahan penting | Trigger `sipanda_audit_trigger()` (tabel inti) + `logAuditEvent()` (LOGIN/LOGOUT/IMPORT/EXPORT) — mencatat user, aktivitas, waktu, data lama/baru |
| 18 | Confirmation dialog untuk hapus | Ditangani di komponen UI Phase 4+ (`components/ui/ConfirmDialog`, belum dibuat — akan disertakan saat modul CRUD pertama dibangun) |
| 19 | Soft delete data penting | Kolom `status` (DRAFT/AKTIF/NONAKTIF/DIARSIPKAN) sudah ada di skema `dpa`/`rup` — endpoint delete pada modul terkait akan mengubah status, bukan `DELETE FROM` |
| 20 | Backup/export database | Dijadwalkan Phase 15 (Deployment) — Supabase menyediakan backup otomatis; endpoint export manual akan ditambahkan di menu Pengaturan |

## Catatan Arsitektur Penting

- **Dua jalur akses database**: `lib/db/supabase-admin.ts` (baca data, Storage) vs `lib/db/pg.ts` (`withAuditContext`, untuk mutasi pada tabel ber-trigger audit). Ini karena supabase-js/PostgREST tidak mempertahankan session variable Postgres antar-request, sedangkan trigger audit butuh `SET LOCAL app.current_user_id`. **Setiap modul CRUD di fase berikutnya (DPA, RUP, dst.) wajib memakai `withAuditContext` untuk operasi tulis**, bukan `supabaseAdmin` langsung, agar audit log tercatat benar.
- **RBAC granular vs role-gating middleware**: `middleware.ts` hanya menyaring KASAR per prefix rute (mis. seluruh `/pengaturan/*` → ADMIN). Pemeriksaan izin per-aksi (`dpa.create`, `rup.delete`, dst.) tetap wajib dipanggil eksplisit di setiap Route Handler lewat `requirePermission()` — middleware BUKAN pengganti ini.
- **Trade-off token berbasis JWT**: roles/permissions di-embed di session token untuk kecepatan (tanpa query DB di middleware/edge). Konsekuensinya, perubahan role seorang user baru berlaku setelah re-login atau token idle-expire (maks. 30 menit). Dianggap dapat diterima untuk skala pengguna SIPANDA; dicatat di `lib/auth/jwt.ts`.

## Belum Termasuk di Phase 3 (menyusul di fase terkait)
- Halaman ganti password & reset password (Phase 4 — Master Data/User Management)
- Header keamanan (CSP, HSTS, X-Frame-Options) di `next.config.js` (Phase 13 — Security Audit)
- Endpoint backup/export database terjadwal (Phase 15 — Deployment)
