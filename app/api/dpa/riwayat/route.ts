// app/api/dpa/riwayat/route.ts
//
// Menyajikan tabel "RIWAYAT PERUBAHAN" (Section AA): Tanggal, Tahapan
// Asal→Tujuan, Data Sebelum/Sesudah, User, Keterangan — murni baca dari
// dpa_revision, tidak pernah menulis.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth/rbac";
import { supabaseAdmin } from "@/lib/db/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 20)));
    const tahunId = url.searchParams.get("tahun_anggaran_id");
    const subKegiatanId = url.searchParams.get("sub_kegiatan_id");

    let query = supabaseAdmin
      .from("dpa_revision")
      .select(
        `*, dpa:dpa_id!inner ( uraian_belanja, tahun_anggaran_id,
           sub_kegiatan:sub_kegiatan_id ( nama ),
           belanja:belanja_id ( kode_rekening ) ),
         user:user_id ( nama_lengkap )`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (tahunId) query = query.eq("dpa.tahun_anggaran_id", tahunId);
    if (subKegiatanId) query = query.eq("dpa.sub_kegiatan_id", subKegiatanId);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      data,
      pagination: { page, pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / pageSize) },
    });
  } catch (err) {
    const authRes = authErrorResponse(err);
    if (authRes) return authRes;
    console.error("[dpa/riwayat]", err);
    return NextResponse.json({ message: "Gagal memuat riwayat perubahan." }, { status: 500 });
  }
}
