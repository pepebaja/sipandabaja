// lib/auth/rate-limit.ts
//
// Proteksi brute force dua lapis:
//  1. Per-akun: users.failed_login_count + users.locked_until (kolom sudah
//     ada di skema 006_users_roles_audit.sql).
//  2. Per-IP: hitung kegagalan terbaru di tabel login_attempts (012), agar
//     serangan credential-stuffing ke banyak username dari satu IP tetap
//     terdeteksi walau tiap akun individual belum terkunci.

import { supabaseAdmin } from "@/lib/db/supabase-admin";

const MAX_FAILED_PER_ACCOUNT = 5;
const ACCOUNT_LOCKOUT_MINUTES = 15;

const MAX_FAILED_PER_IP_WINDOW = 20; // percobaan gagal dari 1 IP (lintas username)
const IP_WINDOW_MINUTES = 15;

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: "ACCOUNT_LOCKED" | "IP_THROTTLED";
  retryAfterMinutes?: number;
}

export async function checkRateLimit(
  username: string,
  ip: string | null
): Promise<RateLimitCheckResult> {
  // 1) Cek kunci akun
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("locked_until")
    .eq("username", username)
    .maybeSingle();

  if (user?.locked_until && new Date(user.locked_until) > new Date()) {
    const retryAfterMinutes = Math.ceil(
      (new Date(user.locked_until).getTime() - Date.now()) / 60000
    );
    return { allowed: false, reason: "ACCOUNT_LOCKED", retryAfterMinutes };
  }

  // 2) Cek throttle per-IP
  if (ip) {
    const since = new Date(Date.now() - IP_WINDOW_MINUTES * 60000).toISOString();
    const { count } = await supabaseAdmin
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ip)
      .eq("success", false)
      .gte("created_at", since);

    if ((count ?? 0) >= MAX_FAILED_PER_IP_WINDOW) {
      return { allowed: false, reason: "IP_THROTTLED", retryAfterMinutes: IP_WINDOW_MINUTES };
    }
  }

  return { allowed: true };
}

/**
 * Catat hasil percobaan login. Pada kegagalan, naikkan failed_login_count
 * dan kunci akun jika ambang batas tercapai. Pada keberhasilan, reset
 * counter dan bersihkan locked_until.
 */
export async function recordLoginAttempt(
  username: string,
  ip: string | null,
  success: boolean
): Promise<void> {
  await supabaseAdmin.from("login_attempts").insert({
    username,
    ip_address: ip,
    success,
  });

  if (success) {
    await supabaseAdmin
      .from("users")
      .update({ failed_login_count: 0, locked_until: null, last_login_at: new Date().toISOString() })
      .eq("username", username);
    return;
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, failed_login_count")
    .eq("username", username)
    .maybeSingle();

  if (!user) return; // jangan bocorkan apakah username ada — caller tetap tampilkan pesan generik

  const newCount = (user.failed_login_count ?? 0) + 1;
  const shouldLock = newCount >= MAX_FAILED_PER_ACCOUNT;

  await supabaseAdmin
    .from("users")
    .update({
      failed_login_count: newCount,
      locked_until: shouldLock
        ? new Date(Date.now() + ACCOUNT_LOCKOUT_MINUTES * 60000).toISOString()
        : null,
    })
    .eq("id", user.id);
}
