// app/api/master-data/sub-kegiatan/[id]/route.ts
import { createItemHandlers } from "@/lib/api/master-crud-factory";
import { subKegiatanSchema } from "@/lib/validation/master-data";

export const { GET, PUT, DELETE } = createItemHandlers({
  table: "sub_kegiatan",
  columns: ["kegiatan_id", "kode", "nama", "status_aktif"],
  createSchema: subKegiatanSchema,
});
