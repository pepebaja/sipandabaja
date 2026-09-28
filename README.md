# SIPANDA — Hotfix: 500 MIDDLEWARE_INVOCATION_FAILED

## Penyebab
Screenshot menunjukkan `500 MIDDLEWARE_INVOCATION_FAILED` saat mengakses
`https://sipandabaja.vercel.app/`. Ada dua penyebab di kode Phase 3 yang
saya kirim sebelumnya:

1. **`lib/auth/jwt.ts` melempar `throw new Error(...)` di level modul**
   ketika `SESSION_SECRET` belum diset di environment variable. Karena
   `middleware.ts` meng-import file ini dan berjalan di **Edge Runtime**,
   modul yang gagal di-load membuat **setiap request** (termasuk halaman
   publik seperti `/`) gagal total dengan error 500 — persis seperti pada
   screenshot.
2. `SESSION_COOKIE_NAME` sebelumnya diimpor middleware dari
   `lib/auth/session.ts`, yang turut menyeret `next/headers` — modul yang
   tidak selalu aman dibundel ke Edge Runtime.

## Perbaikan
- **`lib/auth/constants.ts`** (baru) — cuma berisi `SESSION_COOKIE_NAME`, nol dependency, aman diimpor dari Edge.
- **`lib/auth/jwt.ts`** — tidak lagi throw di level modul. `verifySessionToken()` sekarang **selalu** mengembalikan `null` jika terjadi masalah apa pun (termasuk secret belum diset), diperlakukan middleware sebagai "belum login" → redirect ke `/login`, bukan 500.
- **`lib/auth/session.ts`** — mengimpor `SESSION_COOKIE_NAME` dari `constants.ts` (re-export, jadi kode lain yang sudah memakainya tidak perlu diubah).
- **`middleware.ts`** — mengimpor `SESSION_COOKIE_NAME` langsung dari `constants.ts`, dan seluruh isinya dibungkus `try/catch` sebagai lapisan pertahanan terakhir: error tak terduga apa pun akan redirect ke `/login`, tidak pernah menampilkan halaman error 500 ke pengguna.

## Langkah yang Wajib Dilakukan di Vercel
Perbaikan kode di atas mencegah crash, tapi **login tetap tidak akan
berfungsi** sampai environment variable berikut benar-benar diset di
**Vercel → Project Settings → Environment Variables** (untuk environment
Production, dan Preview bila dipakai):

- `SESSION_SECRET` — string acak, **minimal 32 karakter**. Generate dengan:
  ```bash
  openssl rand -base64 48
  ```
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (lihat `.env.example` dari paket Phase 3) juga harus sudah diset, atau endpoint API akan gagal dengan pesan error yang jelas (bukan lagi meruntuhkan middleware).

Setelah env var diset, **redeploy** (env var baru di Vercel tidak otomatis berlaku ke deployment yang sudah berjalan — perlu trigger deployment ulang).

## Cara Menerapkan
Timpa 4 file berikut di project dengan isi dari paket ini:
```
lib/auth/constants.ts   (baru)
lib/auth/jwt.ts
lib/auth/session.ts
middleware.ts
```
Tidak ada file lain yang perlu diubah — perubahan ini murni perbaikan pada lapisan sesi/middleware, tidak menyentuh logika bisnis modul manapun.
