// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation/auth";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { checkRateLimit, recordLoginAttempt } from "@/lib/auth/rate-limit";
import { logAuditEvent } from "@/lib/audit/logger";
import { supabaseAdmin } from "@/lib/db/supabase-admin";

// Pesan generik — sengaja TIDAK membedakan "username tidak ditemukan" vs
// "password salah", agar tidak membocorkan validitas username ke penyerang.
const GENERIC_INVALID_CREDENTIALS = "Username atau password salah.";

function getClientIp(req: NextRequest): string | null {
  // Di belakang proxy Vercel, IP asli ada di header ini.
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : null;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Payload tidak valid." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data tidak valid.", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { username, password } = parsed.data;

  // 1) Rate limit / lockout check (akun & IP)
  const rl = await checkRateLimit(username, ip);
  if (!rl.allowed) {
    const message =
      rl.reason === "ACCOUNT_LOCKED"
        ? `Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam ${rl.retryAfterMinutes} menit.`
        : "Terlalu banyak percobaan login dari jaringan Anda. Silakan coba beberapa saat lagi.";
    return NextResponse.json({ message }, { status: 429 });
  }

  // 2) Ambil user + role + permission (join, bukan query berlapis)
  const { data: user } = await supabaseAdmin
    .from("users")
    .select(
      `id, username, password_hash, nama_lengkap, status_aktif,
       user_roles ( roles ( nama, role_permissions ( permissions ( kode ) ) ) )`
    )
    .eq("username", username)
    .maybeSingle();

  if (!user || !user.status_aktif) {
    await recordLoginAttempt(username, ip, false);
    return NextResponse.json({ message: GENERIC_INVALID_CREDENTIALS }, { status: 401 });
  }

  const passwordValid = await verifyPassword(user.password_hash, password);
  if (!passwordValid) {
    await recordLoginAttempt(username, ip, false);
    return NextResponse.json({ message: GENERIC_INVALID_CREDENTIALS }, { status: 401 });
  }

  await recordLoginAttempt(username, ip, true);

  // 3) Susun daftar role & permission unik untuk di-embed ke session token
  type RoleRow = {
    roles: {
      nama: string;
      role_permissions: { permissions: { kode: string } }[];
    } | null;
  };
  const roleRows = (user.user_roles ?? []) as unknown as RoleRow[];
  const roles = Array.from(
    new Set(roleRows.map((ur) => ur.roles?.nama).filter((v): v is string => !!v))
  );
  const permissions = Array.from(
    new Set(
      roleRows.flatMap(
        (ur) => ur.roles?.role_permissions.map((rp) => rp.permissions.kode) ?? []
      )
    )
  );

  await createSession({
    sub: user.id,
    username: user.username,
    nama_lengkap: user.nama_lengkap,
    roles,
    permissions,
  });

  await logAuditEvent({
    userId: user.id,
    action: "LOGIN",
    module: "auth",
    ipAddress: ip,
  });

  return NextResponse.json({
    message: "Login berhasil.",
    user: { username: user.username, nama_lengkap: user.nama_lengkap, roles },
  });
}
