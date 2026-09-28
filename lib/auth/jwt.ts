// lib/auth/jwt.ts
//
// PERBAIKAN (hotfix): versi Phase 3 melempar `throw new Error(...)` di level
// MODUL saat `SESSION_SECRET` belum diset. Middleware Next.js meng-import
// file ini di Edge Runtime, dan modul yang throw saat di-load membuat
// SELURUH request (termasuk halaman publik seperti `/`) gagal dengan
// "500 MIDDLEWARE_INVOCATION_FAILED" — inilah penyebab error di tangkapan
// layar. Perbaikannya: jangan pernah throw di top-level modul; resolve
// secret secara lazy, dan verifySessionToken() SELALU fail closed
// (mengembalikan null, dianggap "belum login") alih-alih melempar error,
// supaya middleware tidak pernah crash walau environment variable salah
// atau belum diset — pengguna akan diarahkan ke /login seperti biasa,
// bukan melihat halaman error 500.

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export interface SipandaSessionClaims extends JWTPayload {
  sub: string;
  username: string;
  nama_lengkap: string;
  roles: string[];
  permissions: string[];
}

export const SESSION_IDLE_TTL_SECONDS = 30 * 60; // 30 menit
export const SESSION_ABSOLUTE_TTL_SECONDS = 8 * 60 * 60; // 8 jam

function getSecretKey(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

/**
 * Dipakai HANYA dari Route Handler login (Node runtime, dibungkus try/catch
 * di pemanggilnya) — boleh throw di sini karena kegagalannya sudah tertangani
 * per-request, tidak meruntuhkan middleware secara global.
 */
export async function signSessionToken(
  claims: Omit<SipandaSessionClaims, "iat" | "exp"> & { loginAt?: number }
): Promise<string> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    throw new Error(
      "SESSION_SECRET belum diset atau kurang dari 32 karakter. Set environment " +
        "variable ini di Vercel Project Settings sebelum login dapat berfungsi."
    );
  }
  const now = Math.floor(Date.now() / 1000);
  const loginAt = claims.loginAt ?? now;
  return new SignJWT({ ...claims, loginAt })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_IDLE_TTL_SECONDS)
    .sign(secretKey);
}

/**
 * Dipanggil dari middleware.ts (Edge) pada SETIAP request — TIDAK BOLEH
 * throw dalam kondisi apa pun. Kegagalan apa pun (secret tidak diset, token
 * tidak valid, kedaluwarsa) selalu berujung `null`, yang oleh middleware
 * diperlakukan sama seperti "belum login" → redirect ke halaman login.
 */
export async function verifySessionToken(
  token: string
): Promise<(SipandaSessionClaims & { loginAt: number }) | null> {
  const secretKey = getSecretKey();
  if (!secretKey) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey);
    const claims = payload as SipandaSessionClaims & { loginAt: number };

    const now = Math.floor(Date.now() / 1000);
    if (now - claims.loginAt > SESSION_ABSOLUTE_TTL_SECONDS) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}
