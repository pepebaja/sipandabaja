// app/api/master-data/status-paket/route.ts
import { createCollectionHandlers } from "@/lib/api/master-crud-factory";
import { statusPaketSchema } from "@/lib/validation/master-data";

export const { GET, POST } = createCollectionHandlers({
  table: "status_paket",
  columns: ["kode", "nama", "urutan", "is_final", "status_aktif"],
  createSchema: statusPaketSchema,
  searchableColumns: ["kode", "nama"],
  defaultOrderBy: "urutan",
});
