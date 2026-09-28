// app/api/rup/import/preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requirePermission, authErrorResponse } from "@/lib/auth/rbac";
import { parseFileToRows, validateRupImportRows } from "@/lib/parsing/rup-import";

export async function POST(req: NextRequest) {
  try {
    await requirePermission("rup.import");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const tahunAnggaranId = formData.get("tahun_anggaran_id") as string | null;
    const tahapanAnggaranId = formData.get("tahapan_anggaran_id") as string | null;

    if (!file) return NextResponse.json({ message: "File wajib diunggah." }, { status: 400 });
    if (!tahunAnggaranId || !tahapanAnggaranId) {
      return NextResponse.json({ message: "Tahun Anggaran dan Tahapan Anggaran wajib dipilih." }, { status: 400 });
    }
    if (![".xlsx", ".xls", ".csv"].some((ext) => file.name.toLowerCase().endsWith(ext))) {
      return NextResponse.json({ message: "Format file harus .xlsx, .xls, atau .csv." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: "Ukuran file maksimal 5 MB." }, { status: 400 });
    }

    const rawRows = parseFileToRows(Buffer.from(await file.arrayBuffer()));
    if (rawRows.length === 0) {
      return NextResponse.json({ message: "File tidak berisi data, atau format header tidak dikenali." }, { status: 400 });
    }
    if (rawRows.length > 1000) {
      return NextResponse.json({ message: "Maksimal 1000 baris per import. Bagi file menjadi beberapa bagian." }, { status: 400 });
    }

    const results = await validateRupImportRows(rawRows, {
      tahun_anggaran_id: tahunAnggaranId,
      tahapan_anggaran_id: tahapanAnggaranId,
    });

    const valid = results.filter((r) => r.errors.length === 0).length;
    return NextResponse.json({
      summary: { total: results.length, valid, error: results.length - valid },
      rows: results,
    });
  } catch (err) {
    const authRes = authErrorResponse(err);
    if (authRes) return authRes;
    console.error("[rup/import/preview]", err);
    return NextResponse.json(
      { message: "Gagal memproses file. Pastikan format file sesuai template." },
      { status: 500 }
    );
  }
}
