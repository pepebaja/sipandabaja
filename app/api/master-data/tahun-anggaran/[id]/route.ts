// app/api/master-data/tahun-anggaran/[id]/route.ts
import { createItemHandlers } from "@/lib/api/master-crud-factory";
import { tahunAnggaranSchema } from "@/lib/validation/master-data";

export const { GET, PUT, DELETE } = createItemHandlers({
  table: "tahun_anggaran",
  columns: ["tahun", "status_aktif"],
  createSchema: tahunAnggaranSchema,
});
