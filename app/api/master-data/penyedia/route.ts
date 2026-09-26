// app/api/master-data/penyedia/route.ts
import { createCollectionHandlers } from "@/lib/api/master-crud-factory";
import { penyediaSchema } from "@/lib/validation/master-data";

export const { GET, POST } = createCollectionHandlers({
  table: "penyedia",
  columns: ["nama_penyedia", "nib", "npwp", "alamat", "kontak", "jenis_usaha", "status_aktif"],
  createSchema: penyediaSchema,
  searchableColumns: ["nama_penyedia", "nib", "npwp"],
  defaultOrderBy: "nama_penyedia",
});
