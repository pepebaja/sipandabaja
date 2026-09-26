"use client";

// components/auth/LoginForm.tsx
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message ?? "Terjadi kendala saat login. Silakan coba kembali.");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setErrorMessage("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5" noValidate>
      <div>
        <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-slate-200">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-[#0F2545] px-4 py-2.5 text-white placeholder-slate-400 outline-none transition focus:border-[#3FD8FF] focus:ring-2 focus:ring-[#3FD8FF]/30"
          placeholder="Masukkan username"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-200">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-[#0F2545] px-4 py-2.5 pr-12 text-white placeholder-slate-400 outline-none transition focus:border-[#3FD8FF] focus:ring-2 focus:ring-[#3FD8FF]/30"
            placeholder="Masukkan password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-200"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? "Sembunyikan" : "Lihat"}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-300"
        >
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#3FD8FF] px-4 py-2.5 font-semibold text-[#0B1E3D] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Memproses..." : "MASUK"}
      </button>
    </form>
  );
}
