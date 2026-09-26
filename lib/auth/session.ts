// lib/auth/session.ts
//
// Wrapper cookie httpOnly untuk session token. Dipakai dari Route Handler /
// Server Action (bukan dari Client Component — cookie httpOnly memang
// sengaja tidak bisa dibaca lewat JavaScript di browser).

import { cookies } from "next/headers";
import {
  signSessionToken,
  verifySessionToken,
  type SipandaSessionClaims,
} from "./jwt";

export const SESSION_COOKIE_NAME = "sipanda_session";

const isProduction = process.env.NODE_ENV === "production";

export async function createSession(
  claims: Omit<SipandaSessionClaims, "iat" | "exp">
) {
  const token = await signSessionToken(claims);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction, // wajib true di production (HTTPS only)
    sameSite: "strict", // mitigasi CSRF: cookie tidak dikirim pada request lintas-situs
    path: "/",
    maxAge: 60 * 60 * 8, // batas atas cookie browser; expiry sesungguhnya dikontrol oleh JWT exp
  });
}

export async function getSessionClaims() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Dipakai di Server Component/Route Handler untuk mewajibkan login.
 * Lempar redirect ke /login bila sesi tidak valid — panggil di setiap
 * halaman/route yang butuh autentikasi sebagai lapisan kedua selain
 * middleware.ts (defense-in-depth, konsisten dengan prinsip "validasi
 * permission di server, bukan hanya sembunyikan tombol di frontend").
 */
export async function requireSession() {
  const claims = await getSessionClaims();
  if (!claims) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return claims;
}
