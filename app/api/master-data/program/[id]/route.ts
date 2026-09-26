// app/api/master-data/program/[id]/route.ts
import { createItemHandlers } from "@/lib/api/master-crud-factory";
import { programSchema } from "@/lib/validation/master-data";

export const { GET, PUT, DELETE } = createItemHandlers({
  table: "program",
  columns: ["tahun_anggaran_id", "tahapan_anggaran_id", "kode", "nama", "urusan", "bidang_urusan", "status_aktif"],
  createSchema: programSchema,
});
