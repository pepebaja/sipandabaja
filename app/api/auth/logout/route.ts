// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionClaims, clearSession } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : null;
}

export async function POST(req: NextRequest) {
  const claims = await getSessionClaims();

  await clearSession();

  if (claims) {
    await logAuditEvent({
      userId: claims.sub,
      action: "LOGOUT",
      module: "auth",
      ipAddress: getClientIp(req),
    });
  }

  return NextResponse.json({ message: "Logout berhasil." });
}
