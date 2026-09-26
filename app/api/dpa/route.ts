// app/api/dpa/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission, authErrorResponse } from "@/lib/auth/rbac";
import { supabaseAdmin } from "@/lib/db/supabase-admin";
import { withAuditContext } from "@/lib/db/pg";
import { dpaCreateSchema } from "@/lib/validation/dpa";

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : null;
}

function serverErrorResponse(err: unknown) {
  const authRes = authErrorResponse(err);
  if (authRes) return authRes;
  console.error("[dpa]", err);
  const message = err instanceof Error ? err.message : "";
  return NextResponse.json(
    { message: "Terjadi kendala saat memproses data. Silakan coba kembali." },
    { status: message.toLowerCase().includes("duplicate") ? 409 : 500 }
  );
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 20)));
    const q = url.searchParams.get("q")?.trim();
    const tahunId = url.searchParams.get("tahun_anggaran_id");
    const tahapanId = url.searchParams.get("tahapan_anggaran_id");
    const subKegiatanId = url.searchParams.get("sub_kegiatan_id");
    const status = url.searchParams.get("status");
    const sortBy = url.searchParams.get("sortBy") ?? "created_at";
    const sortDir = url.searchParams.get("sortDir") === "asc";

    let query = supabaseAdmin
      .from("dpa")
      .select(
        `*, sub_kegiatan:sub_kegiatan_id ( nama, kegiatan:kegiatan_id ( nama, program:program_id ( nama ) ) ),
         belanja:belanja_id ( kode_rekening, uraian_belanja ), sumber_dana:sumber_dana_id ( nama )`,
        { count: "exact" }
      );

    if (tahunId) query = query.eq("tahun_anggaran_id", tahunId);
    if (tahapanId) query = query.eq("tahapan_anggaran_id", tahapanId);
    if (subKegiatanId) query = query.eq("sub_kegiatan_id", subKegiatanId);
    if (status) query = query.eq("status", status);
    if (q) query = query.ilike("uraian_belanja", `%${q}%`);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.order(sortBy, { ascending: sortDir }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      data,
      pagination: { page, pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / pageSize) },
    });
  } catch (err) {
    return serverErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    const session = await requirePermission("dpa.create");

    const body = await req.json();
    const parsed = dpaCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Data tidak valid. Periksa kolom yang ditandai.", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    // Validasi integritas relasi (defense-in-depth — form di frontend sudah
    // memfilter lewat dependent-select, tapi server tidak boleh mempercayai
    // input begitu saja): pastikan belanja_id benar berada di bawah
    // sub_kegiatan_id yang dikirim.
    const { data: belanjaCheck } = await supabaseAdmin
      .from("belanja")
      .select("sub_kegiatan_id")
      .eq("id", d.belanja_id)
      .maybeSingle();
    if (!belanjaCheck || belanjaCheck.sub_kegiatan_id !== d.sub_kegiatan_id) {
      return NextResponse.json(
        { message: "Kombinasi Sub Kegiatan dan Belanja tidak valid." },
        { status: 400 }
      );
    }

    const [row] = await withAuditContext(session.sub, ip, (tx) =>
      tx`
        insert into dpa (
          tahun_anggaran_id, tahapan_anggaran_id, sub_kegiatan_id, belanja_id,
          uraian_belanja, pagu_anggaran, sumber_dana_id, keterangan, status, created_by
        ) values (
          ${d.tahun_anggaran_id}, ${d.tahapan_anggaran_id}, ${d.sub_kegiatan_id}, ${d.belanja_id},
          ${d.uraian_belanja}, ${d.pagu_anggaran}, ${d.sumber_dana_id ?? null}, ${d.keterangan ?? null},
          ${d.status ?? "AKTIF"}, ${session.sub}
        )
        returning *
      `
    );

    return NextResponse.json({ message: "Data DPA berhasil disimpan.", data: row }, { status: 201 });
  } catch (err) {
    return serverErrorResponse(err);
  }
}
