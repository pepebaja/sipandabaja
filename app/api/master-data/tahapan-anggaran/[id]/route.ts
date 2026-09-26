// app/api/master-data/tahapan-anggaran/[id]/route.ts
import { createItemHandlers } from "@/lib/api/master-crud-factory";
import { tahapanAnggaranSchema } from "@/lib/validation/master-data";

export const { GET, PUT, DELETE } = createItemHandlers({
  table: "tahapan_anggaran",
  columns: ["tahun_anggaran_id", "nama", "urutan", "status_aktif"],
  createSchema: tahapanAnggaranSchema,
});
