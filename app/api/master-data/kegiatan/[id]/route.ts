// app/api/master-data/kegiatan/[id]/route.ts
import { createItemHandlers } from "@/lib/api/master-crud-factory";
import { kegiatanSchema } from "@/lib/validation/master-data";

export const { GET, PUT, DELETE } = createItemHandlers({
  table: "kegiatan",
  columns: ["program_id", "kode", "nama", "status_aktif"],
  createSchema: kegiatanSchema,
});
