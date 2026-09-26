// app/api/master-data/belanja/[id]/route.ts
import { createItemHandlers } from "@/lib/api/master-crud-factory";
import { belanjaSchema } from "@/lib/validation/master-data";

export const { GET, PUT, DELETE } = createItemHandlers({
  table: "belanja",
  columns: ["sub_kegiatan_id", "kode_rekening", "uraian_belanja", "status_aktif"],
  createSchema: belanjaSchema,
});
