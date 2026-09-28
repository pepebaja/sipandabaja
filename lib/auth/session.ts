// lib/auth/session.ts
//
// PERBAIKAN (hotfix): SESSION_COOKIE_NAME sekarang berasal dari
// lib/auth/constants.ts (tanpa dependency) dan di-re-export di sini agar
// kode lain yang sudah mengimpor `SESSION_COOKIE_NAME` dari file ini tetap
// berfungsi tanpa perubahan.

import { cookies } from "next/headers";
import {
  signSessionToken,
  verifySessionToken,
  type SipandaSessionClaims,
} from "./jwt";
import { SESSION_COOKIE_NAME } from "./constants";

export { SESSION_COOKIE_NAME };

const isProduction = process.env.NODE_ENV === "production";

export async function createSession(
  claims: Omit<SipandaSessionClaims, "iat" | "exp">
) {
  const token = await signSessionToken(claims);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8,
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

export async function requireSession() {
  const claims = await getSessionClaims();
  if (!claims) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return claims;
}
