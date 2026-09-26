// app/api/master-data/belanja/route.ts
import { createCollectionHandlers } from "@/lib/api/master-crud-factory";
import { belanjaSchema } from "@/lib/validation/master-data";

export const { GET, POST } = createCollectionHandlers({
  table: "belanja",
  columns: ["sub_kegiatan_id", "kode_rekening", "uraian_belanja", "status_aktif"],
  createSchema: belanjaSchema,
  searchableColumns: ["kode_rekening", "uraian_belanja"],
  parentFilterColumn: "sub_kegiatan_id",
  defaultOrderBy: "uraian_belanja",
});
