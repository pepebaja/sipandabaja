// app/(dashboard)/rup/monitoring/page.tsx
import { requireSession } from "@/lib/auth/session";
import { MonitoringClient } from "./MonitoringClient";

export default async function RupMonitoringPage() {
  await requireSession();
  return <MonitoringClient />;
}
