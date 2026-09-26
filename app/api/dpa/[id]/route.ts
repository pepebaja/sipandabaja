// app/api/dpa/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission, authErrorResponse } from "@/lib/auth/rbac";
import { supabaseAdmin } from "@/lib/db/supabase-admin";
import { withAuditContext } from "@/lib/db/pg";

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : null;
}

function serverErrorResponse(err: unknown) {
  const authRes = authErrorResponse(err);
  if (authRes) return authRes;
  console.error("[dpa/id]", err);
  return NextResponse.json(
    { message: "Terjadi kendala saat memproses data. Silakan coba kembali." },
    { status: 500 }
  );
}

// PENTING: pagu_anggaran SENGAJA tidak ada di skema update ini. Perubahan
// nilai pagu WAJIB lewat POST /api/dpa/revisi (business rule #6 — jangan
// menimpa data historis tanpa mekanisme revisi/snapshot). Endpoint ini hanya
// untuk memperbaiki metadata (uraian, sumber dana, keterangan, status) pada
// baris DPA yang sudah ada.
const dpaUpdateSchema = z.object({
  uraian_belanja: z.string().trim().min(1).max(300).optional(),
  sumber_dana_id: z.string().uuid().optional().nullable(),
  keterangan: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(["DRAFT", "AKTIF", "NONAKTIF", "DIARSIPKAN"]).optional(),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const { data, error } = await supabaseAdmin
      .from("dpa")
      .select(
        `*, sub_kegiatan:sub_kegiatan_id ( nama, kegiatan:kegiatan_id ( nama, program:program_id ( nama ) ) ),
         belanja:belanja_id ( kode_rekening, uraian_belanja ), sumber_dana:sumber_dana_id ( nama ),
         tahapan_anggaran:tahapan_anggaran_id ( nama )`
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ message: "Data DPA tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ data });
  } catch (err) {
    return serverErrorResponse(err);
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(req);
  try {
    const session = await requirePermission("dpa.edit");
    const { id } = await ctx.params;

    const body = await req.json();
    const parsed = dpaUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Data tidak valid. Periksa kolom yang ditandai.", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const entries = Object.entries(parsed.data).filter(([, v]) => v !== undefined);
    if (entries.length === 0) {
      return NextResponse.json({ message: "Tidak ada perubahan yang dikirim." }, { status: 400 });
    }

    const setClause = entries.map(([col], i) => `${col} = $${i + 1}`).join(", ");
    const values = entries.map(([, v]) => v);
    const sql = `update dpa set ${setClause} where id = $${entries.length + 1} returning *`;

    const [row] = await withAuditContext(session.sub, ip, (tx) => tx.unsafe(sql, [...values, id] as never[]));
    if (!row) return NextResponse.json({ message: "Data DPA tidak ditemukan." }, { status: 404 });

    return NextResponse.json({ message: "Data berhasil diperbarui.", data: row });
  } catch (err) {
    return serverErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(req);
  try {
    const session = await requirePermission("dpa.delete");
    const { id } = await ctx.params;

    // Soft delete (aturan AB/19) — DPA tidak pernah dihapus fisik, hanya
    // diarsipkan, agar riwayat & referensi RUP tetap tertelusuri.
    const [row] = await withAuditContext(session.sub, ip, (tx) =>
      tx`update dpa set status = 'DIARSIPKAN' where id = ${id} returning id`
    );
    if (!row) return NextResponse.json({ message: "Data DPA tidak ditemukan." }, { status: 404 });

    return NextResponse.json({ message: "Data DPA berhasil diarsipkan." });
  } catch (err) {
    return serverErrorResponse(err);
  }
}
