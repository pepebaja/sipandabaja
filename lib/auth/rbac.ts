// lib/auth/rbac.ts
//
// Otorisasi WAJIB ditegakkan di sini (server), bukan hanya dengan
// menyembunyikan tombol di frontend — sesuai STEP 8 & aturan AS.11.

import { NextResponse } from "next/server";
import { getSessionClaims } from "./session";
import type { SipandaSessionClaims } from "./jwt";

export class ForbiddenError extends Error {
  constructor(message = "Anda tidak memiliki izin untuk melakukan aksi ini.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Sesi tidak valid. Silakan login kembali.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Ambil klaim sesi aktif; lempar UnauthorizedError bila tidak ada/kedaluwarsa.
 * Panggil di awal setiap Route Handler yang butuh login.
 */
export async function requireAuth(): Promise<SipandaSessionClaims> {
  const claims = await getSessionClaims();
  if (!claims) throw new UnauthorizedError();
  return claims;
}

/**
 * Wajibkan izin tertentu (kode dari tabel permissions, mis. 'dpa.create').
 * Lempar ForbiddenError bila user tidak memilikinya.
 */
export async function requirePermission(
  permissionCode: string
): Promise<SipandaSessionClaims> {
  const claims = await requireAuth();
  if (!claims.permissions?.includes(permissionCode)) {
    throw new ForbiddenError(
      `Aksi ini memerlukan izin '${permissionCode}'.`
    );
  }
  return claims;
}

/** Helper: konversi error otorisasi menjadi NextResponse yang konsisten. */
export function authErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ message: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ message: err.message }, { status: 403 });
  }
  return null; // bukan error otorisasi — biarkan caller menangani
}

/**
 * Contoh pemakaian di Route Handler:
 *
 *   export async function POST(req: Request) {
 *     try {
 *       const session = await requirePermission("dpa.create");
 *       // ...lanjutkan proses, gunakan session.sub sebagai user_id...
 *     } catch (err) {
 *       const res = authErrorResponse(err);
 *       if (res) return res;
 *       throw err;
 *     }
 *   }
 */
