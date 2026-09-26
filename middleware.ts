// middleware.ts
//
// Lapisan pertama proteksi rute: memastikan sesi valid sebelum halaman/API
// diproses, dan melakukan role-gating KASAR per grup rute (mis. seluruh
// /pengaturan/* hanya ADMIN). Pemeriksaan izin GRANULAR per aksi (mis.
// 'dpa.delete') tetap dilakukan di masing-masing Route Handler lewat
// requirePermission() (lib/auth/rbac.ts) — middleware ini BUKAN pengganti
// pemeriksaan itu, hanya lapisan pertama yang cepat (edge runtime, tanpa
// query database).

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

// Grup rute yang hanya boleh diakses role tertentu. Path lain yang butuh
// login tapi tidak disebutkan di sini boleh diakses semua role terautentikasi
// (pemeriksaan detail tetap di Route Handler masing-masing).
const ROLE_GATED_PREFIXES: { prefix: string; roles: string[] }[] = [
  { prefix: "/pengaturan", roles: ["ADMIN"] },
  { prefix: "/master-data", roles: ["ADMIN"] },
  { prefix: "/api/pengaturan", roles: ["ADMIN"] },
  { prefix: "/api/master-data", roles: ["ADMIN"] },
];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const claims = token ? await verifySessionToken(token) : null;

  if (!claims) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { message: "Sesi tidak valid. Silakan login kembali." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const gate = ROLE_GATED_PREFIXES.find((g) => pathname.startsWith(g.prefix));
  if (gate && !gate.roles.some((r) => claims.roles.includes(r))) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { message: "Anda tidak memiliki izin untuk mengakses modul ini." },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/dashboard?error=forbidden", req.url));
  }

  // Sliding session: perpanjang idle timeout jika token masih valid & aktif dipakai.
  const response = NextResponse.next();
  return response;
}

export const config = {
  matcher: [
    /*
     * Terapkan ke semua path KECUALI asset statis Next.js.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
