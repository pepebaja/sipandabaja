// app/api/rup/monitoring/route.ts
//
// Agregasi untuk menu Monitoring RUP: jumlah & nominal per Jenis RUP
// (Penyedia/Swakelola), per Status Paket, dan per kategori Metode (E-Katalog
// vs Non E-Katalog). Dihitung langsung dari data aktual (tidak hard-code),
// dengan guard pembagian nol mengikuti pola dashboard di Section M/Z.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth/rbac";
import { supabaseAdmin } from "@/lib/db/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const url = new URL(req.url);
    const tahunId = url.searchParams.get("tahun_anggaran_id");
    const tahapanId = url.searchParams.get("tahapan_anggaran_id");

    if (!tahunId || !tahapanId) {
      return NextResponse.json({ message: "Tahun Anggaran dan Tahapan Anggaran wajib dipilih." }, { status: 400 });
    }

    const { data: rupRows, error } = await supabaseAdmin
      .from("rup")
      .select(
        `id, jenis_rup, pagu_paket, status_aktif,
         metode_pengadaan:metode_pengadaan_id ( kategori_metode ),
         paket_pengadaan ( status_paket:status_paket_id ( kode, nama ) )`
      )
      .eq("tahun_anggaran_id", tahunId)
      .eq("tahapan_anggaran_id", tahapanId)
      .eq("status_aktif", true);
    if (error) throw error;

    const rows = rupRows ?? [];

    const totalPaket = rows.length;
    const totalPagu = rows.reduce((s, r) => s + Number(r.pagu_paket), 0);

    const penyedia = rows.filter((r) => r.jenis_rup === "PENYEDIA");
    const swakelola = rows.filter((r) => r.jenis_rup === "SWAKELOLA");

    const ekatalog = rows.filter((r: any) => r.metode_pengadaan?.kategori_metode === "E_KATALOG");
    const nonEkatalog = rows.filter((r: any) => r.metode_pengadaan?.kategori_metode === "NON_EKATALOG");

    const statusMap = new Map<string, { nama: string; jumlah: number; pagu: number }>();
    for (const r of rows as any[]) {
      const statusList = r.paket_pengadaan ?? [];
      const status = statusList[0]?.status_paket;
      const kode = status?.kode ?? "TANPA_STATUS";
      const nama = status?.nama ?? "Belum ada paket pengadaan";
      const existing = statusMap.get(kode) ?? { nama, jumlah: 0, pagu: 0 };
      existing.jumlah += 1;
      existing.pagu += Number(r.pagu_paket);
      statusMap.set(kode, existing);
    }

    return NextResponse.json({
      ringkasan: {
        total_paket: totalPaket,
        total_pagu: totalPagu,
        jumlah_penyedia: penyedia.length,
        pagu_penyedia: penyedia.reduce((s, r) => s + Number(r.pagu_paket), 0),
        jumlah_swakelola: swakelola.length,
        pagu_swakelola: swakelola.reduce((s, r) => s + Number(r.pagu_paket), 0),
        jumlah_ekatalog: ekatalog.length,
        pagu_ekatalog: ekatalog.reduce((s, r) => s + Number(r.pagu_paket), 0),
        jumlah_non_ekatalog: nonEkatalog.length,
        pagu_non_ekatalog: nonEkatalog.reduce((s, r) => s + Number(r.pagu_paket), 0),
      },
      per_status: Array.from(statusMap.entries()).map(([kode, v]) => ({ kode, ...v })),
    });
  } catch (err) {
    const authRes = authErrorResponse(err);
    if (authRes) return authRes;
    console.error("[rup/monitoring]", err);
    return NextResponse.json({ message: "Gagal memuat data monitoring." }, { status: 500 });
  }
}
