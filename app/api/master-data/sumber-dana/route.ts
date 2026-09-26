// app/api/master-data/sumber-dana/route.ts
import { createCollectionHandlers } from "@/lib/api/master-crud-factory";
import { sumberDanaSchema } from "@/lib/validation/master-data";

export const { GET, POST } = createCollectionHandlers({
  table: "sumber_dana",
  columns: ["nama", "keterangan", "status_aktif"],
  createSchema: sumberDanaSchema,
  searchableColumns: ["nama"],
  defaultOrderBy: "nama",
});
