// app/(dashboard)/layout.tsx
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#0B1E3D] px-4 py-6 sm:px-8">
        {/* Sidebar/Navbar dari STEP 6/AK/AL dokumen Phase 1 akan membungkus di sini
            pada implementasi penuh — untuk Phase 4 ini fokus pada konten Master Data. */}
        <div className="mx-auto max-w-6xl">{children}</div>
      </div>
    </ToastProvider>
  );
}
