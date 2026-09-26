// app/api/master-data/penyedia/[id]/route.ts
import { createItemHandlers } from "@/lib/api/master-crud-factory";
import { penyediaSchema } from "@/lib/validation/master-data";

export const { GET, PUT, DELETE } = createItemHandlers({
  table: "penyedia",
  columns: ["nama_penyedia", "nib", "npwp", "alamat", "kontak", "jenis_usaha", "status_aktif"],
  createSchema: penyediaSchema,
});
