// lib/auth/password.ts
//
// Password hashing — argon2id, sesuai STEP 8 dokumen arsitektur.
// PENTING: modul ini memakai native binding (argon2), jadi HANYA boleh
// diimpor dari kode yang berjalan di Node.js runtime (API Route / Server
// Action biasa) — TIDAK bisa dipakai di Edge Runtime (middleware.ts).

import argon2 from "argon2";

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MB, mengikuti rekomendasi OWASP 2024 untuk argon2id
  timeCost: 2,
  parallelism: 1,
};

/**
 * Hash password mentah menjadi string argon2id (sudah termasuk salt & parameter).
 * Simpan hasilnya apa adanya ke kolom users.password_hash.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return argon2.hash(plainPassword, ARGON2_OPTIONS);
}

/**
 * Verifikasi password mentah terhadap hash tersimpan.
 * Selalu gunakan fungsi ini — jangan pernah membandingkan string secara manual.
 */
export async function verifyPassword(
  hash: string,
  plainPassword: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainPassword);
  } catch {
    // Hash tidak valid/corrupt — anggap gagal, jangan lempar error ke caller
    // (mencegah kebocoran info lewat perbedaan perilaku error vs mismatch).
    return false;
  }
}

/**
 * Validasi kompleksitas password minimal (aturan bisnis: "tingkat
 * kompleksitas yang wajar" — bukan berlebihan, tetap ramah PPBJ non-teknis).
 * Dipakai saat membuat/mengubah password user.
 */
export function isPasswordComplexEnough(password: string): boolean {
  if (password.length < 10) return false;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
}
