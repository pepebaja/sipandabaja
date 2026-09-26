// app/api/master-data/sumber-dana/[id]/route.ts
import { createItemHandlers } from "@/lib/api/master-crud-factory";
import { sumberDanaSchema } from "@/lib/validation/master-data";

export const { GET, PUT, DELETE } = createItemHandlers({
  table: "sumber_dana",
  columns: ["nama", "keterangan", "status_aktif"],
  createSchema: sumberDanaSchema,
});
