// scripts/create-admin-user.ts
//
// Jalankan SEKALI di awal setup untuk membuat akun ADMIN pertama, karena
// password TIDAK BOLEH dimasukkan lewat SQL/seed mentah (harus di-hash
// argon2id oleh aplikasi). Setelah akun pertama ada, pembuatan user
// selanjutnya dilakukan lewat menu Pengaturan → User (oleh ADMIN).
//
// Cara pakai:
//   npx tsx scripts/create-admin-user.ts --username=admin --nama="Admin SIPANDA" --password="GantiSegera#123"

import { hashPassword, isPasswordComplexEnough } from "../lib/auth/password";
import { supabaseAdmin } from "../lib/db/supabase-admin";

function getArg(name: string): string | undefined {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found?.split("=").slice(1).join("=");
}

async function main() {
  const username = getArg("username");
  const namaLengkap = getArg("nama");
  const password = getArg("password");

  if (!username || !namaLengkap || !password) {
    console.error(
      "Wajib isi --username, --nama, dan --password. Contoh:\n" +
        `  npx tsx scripts/create-admin-user.ts --username=admin --nama="Admin SIPANDA" --password="GantiSegera#123"`
    );
    process.exit(1);
  }

  if (!isPasswordComplexEnough(password)) {
    console.error("Password minimal 10 karakter dan mengandung huruf + angka.");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .insert({ username, nama_lengkap: namaLengkap, password_hash: passwordHash })
    .select("id")
    .single();

  if (error || !user) {
    console.error("Gagal membuat user:", error?.message);
    process.exit(1);
  }

  const { data: adminRole } = await supabaseAdmin
    .from("roles")
    .select("id")
    .eq("nama", "ADMIN")
    .single();

  if (adminRole) {
    await supabaseAdmin.from("user_roles").insert({ user_id: user.id, role_id: adminRole.id });
  }

  console.log(`✔ User admin '${username}' berhasil dibuat dengan role ADMIN.`);
  console.log("  Segera minta pemilik akun mengganti password setelah login pertama.");
}

main();
