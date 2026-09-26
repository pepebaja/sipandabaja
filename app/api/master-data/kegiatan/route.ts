// app/api/master-data/kegiatan/route.ts
import { createCollectionHandlers } from "@/lib/api/master-crud-factory";
import { kegiatanSchema } from "@/lib/validation/master-data";

export const { GET, POST } = createCollectionHandlers({
  table: "kegiatan",
  columns: ["program_id", "kode", "nama", "status_aktif"],
  createSchema: kegiatanSchema,
  searchableColumns: ["kode", "nama"],
  parentFilterColumn: "program_id", // form DPA/DPA-form: GET ?program_id=<uuid>
  defaultOrderBy: "nama",
});
