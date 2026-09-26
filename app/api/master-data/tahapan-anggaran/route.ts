// app/api/master-data/tahapan-anggaran/route.ts
import { createCollectionHandlers } from "@/lib/api/master-crud-factory";
import { tahapanAnggaranSchema } from "@/lib/validation/master-data";

export const { GET, POST } = createCollectionHandlers({
  table: "tahapan_anggaran",
  columns: ["tahun_anggaran_id", "nama", "urutan", "status_aktif"],
  createSchema: tahapanAnggaranSchema,
  parentFilterColumn: "tahun_anggaran_id", // ?tahun_anggaran_id=<uuid> untuk dependent dropdown
  defaultOrderBy: "urutan",
});
