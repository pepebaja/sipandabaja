// app/api/master-data/sub-kegiatan/route.ts
import { createCollectionHandlers } from "@/lib/api/master-crud-factory";
import { subKegiatanSchema } from "@/lib/validation/master-data";

export const { GET, POST } = createCollectionHandlers({
  table: "sub_kegiatan",
  columns: ["kegiatan_id", "kode", "nama", "status_aktif"],
  createSchema: subKegiatanSchema,
  searchableColumns: ["kode", "nama"],
  parentFilterColumn: "kegiatan_id",
  defaultOrderBy: "nama",
});
