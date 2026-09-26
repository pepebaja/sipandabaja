// app/api/master-data/jenis-pengadaan/[id]/route.ts
import { createItemHandlers } from "@/lib/api/master-crud-factory";
import { jenisPengadaanSchema } from "@/lib/validation/master-data";

export const { GET, PUT, DELETE } = createItemHandlers({
  table: "jenis_pengadaan",
  columns: ["kode", "nama", "urutan", "status_aktif"],
  createSchema: jenisPengadaanSchema,
});
