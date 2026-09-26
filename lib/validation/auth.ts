// lib/validation/auth.ts
import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username wajib diisi")
    .max(100)
    // Validasi input ketat: cegah karakter yang tidak wajar sebagai lapisan
    // tambahan (query tetap parameterized lewat supabase-js/postgres.js,
    // jadi ini bukan satu-satunya pertahanan terhadap SQL Injection).
    .regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh huruf, angka, titik, underscore, dan strip"),
  password: z.string().min(1, "Password wajib diisi").max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
