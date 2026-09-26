// components/master-data/field-types.ts
//
// Versi ini MENAMBAHKAN tipe 'async-select' dan 'textarea' di atas versi
// Phase 4 (semua tipe lama tetap ada, tidak ada yang dihapus) — timpa file
// Phase 4 dengan file ini. 'async-select' dipakai untuk field seperti Sumber
// Dana yang perlu opsi dari API tapi TIDAK bergantung pada field lain
// (berbeda dari 'dependent-select' yang menunggu nilai field induk).

export interface SelectOption {
  value: string;
  label: string;
}

export type FieldDef =
  | { name: string; label: string; type: "text" | "number"; required?: boolean; placeholder?: string }
  | { name: string; label: string; type: "textarea"; required?: boolean; placeholder?: string; rows?: number }
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
      type: "async-select";
      endpoint: string; // mis. '/api/master-data/sumber-dana'
      optionLabelKey: string;
      required?: boolean;
    }
  | {
      name: string;
      label: string;
      type: "dependent-select";
      dependsOn: string; // nama field lain di form ini yang menjadi induk
      endpoint: string;
      parentQueryParam: string;
      optionLabelKey: string;
      required?: boolean;
    };
