"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Rss, Send, Target, Clock, LogOut } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import "@/components/dashboard.css";

const TABS = [
  { href: "/dashboard/account", label: "Account", icon: User },
  { href: "/dashboard/feeds", label: "Feeds", icon: Rss },
  { href: "/dashboard/telegram", label: "Telegram", icon: Send },
  { href: "/dashboard/goat", label: "GOAT", icon: Target },
  { href: "/dashboard/schedules", label: "Schedules", icon: Clock },
];

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  return (
    <div className="dash">
      <header className="dash-header">
        <Link href="/" className="brand">◆ JOBCRON</Link>
        <div className="who">
          <span>{user?.email}</span>
          <button className="btn ghost sm" onClick={logout}>
            <LogOut size={14} /> LOGOUT
          </button>
        </div>
      </header>
      <div className="dash-body">
        <nav className="dash-nav">
          {TABS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={pathname === href ? "active" : ""}>
              <Icon size={16} /> {label}
            </Link>
          ))}
        </nav>
        <main className="dash-main">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Shell>{children}</Shell>
    </AuthGuard>
  );
}
