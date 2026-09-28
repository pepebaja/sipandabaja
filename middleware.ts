// middleware.ts
//
// PERBAIKAN (hotfix) dari dua hal yang menyebabkan
// "500 MIDDLEWARE_INVOCATION_FAILED" di production:
//  1. SESSION_COOKIE_NAME sebelumnya diimpor dari lib/auth/session.ts, yang
//     turut mengimpor `next/headers` — modul itu bisa gagal saat di-bundle/
//     dijalankan di Edge Runtime tempat middleware berjalan. Sekarang
//     diimpor langsung dari lib/auth/constants.ts yang tidak punya
//     dependency sama sekali.
//  2. verifySessionToken() di jwt.ts sebelumnya bisa throw saat
//     SESSION_SECRET belum diset di environment variable Vercel — sudah
//     diperbaiki agar selalu mengembalikan null (lihat lib/auth/jwt.ts).
//  3. Sebagai lapisan pertahanan terakhir, seluruh isi middleware ini kini
//     dibungkus try/catch: error tak terduga apa pun akan diarahkan ke
//     /login (fail closed secara aman), BUKAN menampilkan halaman error 500
//     ke pengguna.

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

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

async function handleMiddleware(req: NextRequest): Promise<NextResponse> {
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

  return NextResponse.next();
}

export async function middleware(req: NextRequest) {
  try {
    return await handleMiddleware(req);
  } catch (err) {
    // Fail closed, tapi tetap AMAN (redirect ke login), bukan 500.
    console.error("[middleware] unexpected error:", err);
    const { pathname } = req.nextUrl;
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { message: "Terjadi kendala pada server. Silakan coba kembali." },
        { status: 500 }
      );
    }
    if (isPublicPath(pathname)) {
      // Jangan redirect loop kalau errornya justru terjadi di halaman publik.
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
