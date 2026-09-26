// app/api/master-data/metode-pengadaan/[id]/route.ts
import { createItemHandlers } from "@/lib/api/master-crud-factory";
import { metodePengadaanSchema } from "@/lib/validation/master-data";

export const { GET, PUT, DELETE } = createItemHandlers({
  table: "metode_pengadaan",
  columns: ["kode", "nama", "kategori_metode", "urutan", "status_aktif"],
  createSchema: metodePengadaanSchema,
});
