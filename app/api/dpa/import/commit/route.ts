// app/api/dpa/import/commit/route.ts
//
// Menerima HANYA baris yang sudah lolos validasi dari langkah preview
// (dikirim balik oleh frontend setelah user menekan "Konfirmasi Import" —
// lihat Section R: ...→ Cek Error → Konfirmasi → Import). Endpoint ini
// TIDAK memvalidasi ulang dari nol; ia percaya pada `resolved` yang sudah
// dihasilkan validateDpaImportRows, tapi tetap memvalidasi bentuk payload
// dengan Zod agar tidak ada field yang hilang/salah tipe.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, authErrorResponse } from "@/lib/auth/rbac";
import { withAuditContext } from "@/lib/db/pg";
import { logAuditEvent } from "@/lib/audit/logger";

const resolvedRowSchema = z.object({
  tahun_anggaran_id: z.string().uuid(),
  tahapan_anggaran_id: z.string().uuid(),
  sub_kegiatan_id: z.string().uuid(),
  belanja_id: z.string().uuid(),
  uraian_belanja: z.string().min(1),
  pagu_anggaran: z.number().nonnegative(),
  sumber_dana_id: z.string().uuid().nullable(),
  keterangan: z.string().nullable(),
});

const commitSchema = z.object({
  rows: z.array(resolvedRowSchema).min(1).max(1000),
});

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : null;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    const session = await requirePermission("dpa.import");

    const body = await req.json();
    const parsed = commitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Data import tidak valid." }, { status: 400 });
    }
    const { rows } = parsed.data;

    let insertedCount = 0;
    await withAuditContext(session.sub, ip, async (tx) => {
      for (const r of rows) {
        await tx`
          insert into dpa (
            tahun_anggaran_id, tahapan_anggaran_id, sub_kegiatan_id, belanja_id,
            uraian_belanja, pagu_anggaran, sumber_dana_id, keterangan, status, created_by
          ) values (
            ${r.tahun_anggaran_id}, ${r.tahapan_anggaran_id}, ${r.sub_kegiatan_id}, ${r.belanja_id},
            ${r.uraian_belanja}, ${r.pagu_anggaran}, ${r.sumber_dana_id}, ${r.keterangan}, 'AKTIF', ${session.sub}
          )
        `;
        insertedCount++;
      }
    });

    await logAuditEvent({
      userId: session.sub,
      action: "IMPORT",
      module: "dpa",
      ipAddress: ip,
      detail: { jumlah_baris: insertedCount },
    });

    return NextResponse.json({
      message: `Import berhasil: ${insertedCount} data masuk.`,
      inserted: insertedCount,
    });
  } catch (err) {
    const authRes = authErrorResponse(err);
    if (authRes) return authRes;
    console.error("[dpa/import/commit]", err);
    return NextResponse.json(
      { message: "Terjadi kendala saat menyimpan data import. Tidak ada data yang tersimpan sebagian." },
      { status: 500 }
    );
  }
}
