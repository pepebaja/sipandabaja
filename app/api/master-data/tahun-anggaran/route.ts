// app/api/master-data/tahun-anggaran/route.ts
import { createCollectionHandlers } from "@/lib/api/master-crud-factory";
import { tahunAnggaranSchema } from "@/lib/validation/master-data";

export const { GET, POST } = createCollectionHandlers({
  table: "tahun_anggaran",
  columns: ["tahun", "status_aktif"],
  createSchema: tahunAnggaranSchema,
  searchableColumns: [], // tahun adalah angka, pencarian teks tidak relevan
  defaultOrderBy: "tahun",
});
