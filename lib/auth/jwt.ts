// lib/auth/jwt.ts
//
// Session token berbasis JWT (HS256) memakai `jose` — dipilih karena
// edge-compatible sehingga bisa diverifikasi langsung di middleware.ts
// tanpa perlu memanggil database di setiap request.
//
// Trade-off yang disadari: roles/permissions di-embed di dalam token, jadi
// perubahan role seorang user baru berlaku setelah token lama kedaluwarsa
// atau user login ulang — bukan seketika. Ini dianggap dapat diterima untuk
// skala pengguna SIPANDA (PPBJ/Admin per SKPD); jika perlu revoke seketika,
// tambahkan session-store terpusat (mis. tabel `sessions` + cek per request).

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error(
    "SESSION_SECRET env var wajib diisi dan minimal 32 karakter acak. " +
      "Jangan pernah hard-code secret ini di kode."
  );
}
const secretKey = new TextEncoder().encode(SESSION_SECRET);

export interface SipandaSessionClaims extends JWTPayload {
  sub: string; // user id (uuid)
  username: string;
  nama_lengkap: string;
  roles: string[]; // e.g. ['PPBJ']
  permissions: string[]; // e.g. ['dpa.view', 'dpa.create', ...]
}

// Idle timeout: token dianggap kedaluwarsa jika tidak ada aktivitas.
export const SESSION_IDLE_TTL_SECONDS = 30 * 60; // 30 menit
// Absolute timeout: walau terus aktif (sliding refresh), user WAJIB login
// ulang setelah durasi ini tercapai sejak login pertama.
export const SESSION_ABSOLUTE_TTL_SECONDS = 8 * 60 * 60; // 8 jam

export async function signSessionToken(
  claims: Omit<SipandaSessionClaims, "iat" | "exp"> & { loginAt?: number }
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const loginAt = claims.loginAt ?? now;
  return new SignJWT({ ...claims, loginAt })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_IDLE_TTL_SECONDS)
    .sign(secretKey);
}

export async function verifySessionToken(
  token: string
): Promise<(SipandaSessionClaims & { loginAt: number }) | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    const claims = payload as SipandaSessionClaims & { loginAt: number };

    // Absolute timeout check — sliding refresh tidak boleh memperpanjang
    // sesi melewati batas mutlak ini.
    const now = Math.floor(Date.now() / 1000);
    if (now - claims.loginAt > SESSION_ABSOLUTE_TTL_SECONDS) {
      return null;
    }
    return claims;
  } catch {
    return null; // token tidak valid, kedaluwarsa, atau signature tidak cocok
  }
}
