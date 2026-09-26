// app/(auth)/login/page.tsx
import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { getSessionClaims } from "@/lib/auth/session";
import { redirect } from "next/navigation";
// import { supabaseAdmin } from "@/lib/db/supabase-admin"; // aktifkan bila ingin ambil Tahun Anggaran Aktif dari DB

export const metadata = {
  title: "Login — SIPANDA",
};

export default async function LoginPage() {
  // Jika sudah login, langsung ke dashboard — jangan tampilkan form login lagi.
  const claims = await getSessionClaims();
  if (claims) redirect("/dashboard");

  // Opsional: tampilkan Tahun Anggaran Aktif di halaman login (Section AJ).
  // const { data: activeTahapan } = await supabaseAdmin
  //   .from("tahapan_anggaran")
  //   .select("nama, tahun_anggaran:tahun_anggaran_id ( tahun )")
  //   .eq("status_aktif", true)
  //   .maybeSingle();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B1E3D] px-4">
      <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-white/10 bg-[#0F2545]/60 p-8 shadow-2xl backdrop-blur">
        <Image
          src="/logo-sipanda.png"
          alt="Logo SIPANDA"
          width={112}
          height={112}
          priority
          className="mb-4"
        />
        <h1 className="text-2xl font-bold tracking-wide text-white">SIPANDA</h1>
        <p className="mb-1 text-center text-sm text-slate-300">
          Sistem Informasi Pantau Data Pengadaan
        </p>

        {/* Ganti dengan data dari activeTahapan bila query di atas diaktifkan */}
        {/* <p className="mb-6 text-xs text-[#3FD8FF]">Tahun Anggaran Aktif: TA 2026 — PERUBAHAN</p> */}

        <div className="mb-6" />

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p className="mt-8 text-center text-xs text-slate-500">
          Akses terbatas untuk PPBJ dan pengelola pengadaan SKPD.
          <br />
          Hubungi Admin SIPANDA bila mengalami kendala login.
        </p>
      </div>
    </main>
  );
}
