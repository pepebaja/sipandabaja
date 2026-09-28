// app/api/rup/dpa-lookup/route.ts
//
// Dipakai oleh form RUP: setelah user memilih Program→Kegiatan→Sub
// Kegiatan→Belanja (rantai dependent-select yang sama seperti form DPA),
// endpoint ini mencari baris DPA yang cocok pada Tahun+Tahapan aktif dan
// menghitung sisa pagu-nya, sehingga PPBJ tahu batas pagu paket sebelum
// mengisi nilainya.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth/rbac";
import { supabaseAdmin } from "@/lib/db/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const url = new URL(req.url);
    const tahunId = url.searchParams.get("tahun_anggaran_id");
    const tahapanId = url.searchParams.get("tahapan_anggaran_id");
    const belanjaId = url.searchParams.get("belanja_id");
    const excludeRupId = url.searchParams.get("exclude_rup_id");

    const dpaIdParam = url.searchParams.get("dpa_id"); // dipakai form edit RUP

    if (!dpaIdParam && (!tahunId || !tahapanId || !belanjaId)) {
      return NextResponse.json({ message: "Parameter tidak lengkap." }, { status: 400 });
    }

    let dpaQuery = supabaseAdmin.from("dpa").select("id, uraian_belanja, pagu_anggaran, status");
    dpaQuery = dpaIdParam
      ? dpaQuery.eq("id", dpaIdParam)
      : dpaQuery
          .eq("tahun_anggaran_id", tahunId!)
          .eq("tahapan_anggaran_id", tahapanId!)
          .eq("belanja_id", belanjaId!);
    const { data: dpa, error } = await dpaQuery.maybeSingle();
    if (error) throw error;

    if (!dpa) {
      return NextResponse.json({
        data: null,
        message:
          "Belum ada data DPA untuk kombinasi Belanja ini pada Tahun/Tahapan terpilih. Tambahkan DPA-nya terlebih dahulu di menu Data DPA.",
      });
    }

    let rupQuery = supabaseAdmin.from("rup").select("pagu_paket").eq("dpa_id", dpa.id).eq("status_aktif", true);
    if (excludeRupId) rupQuery = rupQuery.neq("id", excludeRupId);
    const { data: existingRup } = await rupQuery;
    const totalTerpakai = (existingRup ?? []).reduce((sum, r) => sum + Number(r.pagu_paket), 0);
    const sisaPagu = Number(dpa.pagu_anggaran) - totalTerpakai;

    return NextResponse.json({
      data: { ...dpa, total_pagu_rup_terpakai: totalTerpakai, sisa_pagu: sisaPagu },
    });
  } catch (err) {
    const authRes = authErrorResponse(err);
    if (authRes) return authRes;
    console.error("[rup/dpa-lookup]", err);
    return NextResponse.json({ message: "Gagal memuat data DPA terkait." }, { status: 500 });
  }
}
