// app/(dashboard)/dpa/page.tsx
import { requireSession } from "@/lib/auth/session";
import { DpaClient } from "./DpaClient";

export default async function DpaPage() {
  await requireSession();
  return <DpaClient />;
}
