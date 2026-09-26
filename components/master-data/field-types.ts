// components/master-data/field-types.ts
export interface SelectOption {
  value: string;
  label: string;
}

export type FieldDef =
  | { name: string; label: string; type: "text" | "number"; required?: boolean; placeholder?: string }
  | { name: string; label: string; type: "checkbox" }
  | {
      name: string;
      label: string;
      type: "select";
      options: SelectOption[];
      required?: boolean;
    }
  | {
      name: string;
      label: string;
      type: "dependent-select";
      // Nama field lain di form ini yang menjadi induk (mis. 'program_id' untuk field 'kegiatan_id')
      dependsOn: string;
      // Endpoint master-data yang dipanggil untuk ambil opsi, mis. '/api/master-data/kegiatan'
      // Filter otomatis lewat query param = parentFilterColumn (lihat entityEndpoint config)
      endpoint: string;
      parentQueryParam: string; // mis. 'program_id'
      optionLabelKey: string; // kolom yang dipakai sebagai label opsi, mis. 'nama'
      required?: boolean;
    };
