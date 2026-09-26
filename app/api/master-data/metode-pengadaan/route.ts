// app/api/master-data/metode-pengadaan/route.ts
import { createCollectionHandlers } from "@/lib/api/master-crud-factory";
import { metodePengadaanSchema } from "@/lib/validation/master-data";

export const { GET, POST } = createCollectionHandlers({
  table: "metode_pengadaan",
  columns: ["kode", "nama", "kategori_metode", "urutan", "status_aktif"],
  createSchema: metodePengadaanSchema,
  searchableColumns: ["kode", "nama"],
  defaultOrderBy: "urutan",
});
