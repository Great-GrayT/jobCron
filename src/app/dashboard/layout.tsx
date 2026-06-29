"use client";

import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { AdminShell } from "@/components/AdminShell";
import { settingsMenu } from "@/components/navMenu";
import "@/components/dashboard.css";

const TITLES: Record<string, string> = {
  "/dashboard/account": "Account",
  "/dashboard/feeds": "Feeds",
  "/dashboard/telegram": "Telegram",
  "/dashboard/goat": "GOAT",
  "/dashboard/schedules": "Schedules",
};

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Settings";

  return (
    <AdminShell menu={settingsMenu()} breadcrumb={["Dashboard", title]} title={title} back="/">
      {children}
    </AdminShell>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Shell>{children}</Shell>
    </AuthGuard>
  );
}
