// app/api/master-data/status-paket/[id]/route.ts
import { createItemHandlers } from "@/lib/api/master-crud-factory";
import { statusPaketSchema } from "@/lib/validation/master-data";

export const { GET, PUT, DELETE } = createItemHandlers({
  table: "status_paket",
  columns: ["kode", "nama", "urutan", "is_final", "status_aktif"],
  createSchema: statusPaketSchema,
});
