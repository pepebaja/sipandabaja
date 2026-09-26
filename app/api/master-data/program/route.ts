// app/api/master-data/program/route.ts
import { createCollectionHandlers } from "@/lib/api/master-crud-factory";
import { programSchema } from "@/lib/validation/master-data";

export const { GET, POST } = createCollectionHandlers({
  table: "program",
  columns: ["tahun_anggaran_id", "tahapan_anggaran_id", "kode", "nama", "urusan", "bidang_urusan", "status_aktif"],
  createSchema: programSchema,
  searchableColumns: ["kode", "nama"],
  parentFilterColumn: "tahapan_anggaran_id", // dependent dropdown: program per Tahun+Tahapan aktif
  defaultOrderBy: "nama",
});
