// app/api/dpa/import/preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requirePermission, authErrorResponse } from "@/lib/auth/rbac";
import { parseFileToRows, validateDpaImportRows } from "@/lib/parsing/dpa-import";

export async function POST(req: NextRequest) {
  try {
    await requirePermission("dpa.import");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const tahunAnggaranId = formData.get("tahun_anggaran_id") as string | null;
    const tahapanAnggaranId = formData.get("tahapan_anggaran_id") as string | null;

    if (!file) return NextResponse.json({ message: "File wajib diunggah." }, { status: 400 });
    if (!tahunAnggaranId || !tahapanAnggaranId) {
      return NextResponse.json({ message: "Tahun Anggaran dan Tahapan Anggaran wajib dipilih." }, { status: 400 });
    }

    const allowedTypes = [".xlsx", ".xls", ".csv"];
    if (!allowedTypes.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      return NextResponse.json({ message: "Format file harus .xlsx, .xls, atau .csv." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: "Ukuran file maksimal 5 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawRows = parseFileToRows(buffer);

    if (rawRows.length === 0) {
      return NextResponse.json({ message: "File tidak berisi data, atau format header tidak dikenali." }, { status: 400 });
    }
    if (rawRows.length > 1000) {
      return NextResponse.json({ message: "Maksimal 1000 baris per import. Bagi file menjadi beberapa bagian." }, { status: 400 });
    }

    const results = await validateDpaImportRows(rawRows, {
      tahun_anggaran_id: tahunAnggaranId,
      tahapan_anggaran_id: tahapanAnggaranId,
    });

    const validCount = results.filter((r) => r.errors.length === 0).length;
    const errorCount = results.length - validCount;

    return NextResponse.json({
      summary: { total: results.length, valid: validCount, error: errorCount },
      rows: results,
    });
  } catch (err) {
    const authRes = authErrorResponse(err);
    if (authRes) return authRes;
    console.error("[dpa/import/preview]", err);
    return NextResponse.json(
      { message: "Gagal memproses file. Pastikan format file sesuai template." },
      { status: 500 }
    );
  }
}
