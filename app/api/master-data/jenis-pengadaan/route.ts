// app/api/master-data/jenis-pengadaan/route.ts
import { createCollectionHandlers } from "@/lib/api/master-crud-factory";
import { jenisPengadaanSchema } from "@/lib/validation/master-data";

export const { GET, POST } = createCollectionHandlers({
  table: "jenis_pengadaan",
  columns: ["kode", "nama", "urutan", "status_aktif"],
  createSchema: jenisPengadaanSchema,
  searchableColumns: ["kode", "nama"],
  defaultOrderBy: "urutan",
});
