"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { User, Rss, Send, Target, Clock, LogOut, BarChart3, CheckSquare, MessageSquare, Shield } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { messages } from "@/lib/api/messages";
import "@/components/dashboard.css";

const TABS = [
  { href: "/dashboard/account", label: "Account", icon: User },
  { href: "/dashboard/feeds", label: "Feeds", icon: Rss },
  { href: "/dashboard/telegram", label: "Telegram", icon: Send },
  { href: "/dashboard/goat", label: "GOAT", icon: Target },
  { href: "/dashboard/schedules", label: "Schedules", icon: Clock },
  { href: "/rss", label: "RSS App", icon: Rss },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/applied", label: "Tracking", icon: CheckSquare },
];

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    messages.list().then((r) => setUnread(r.unread)).catch(() => {});
  }, []);

  const avatar = user?.avatarData || user?.avatarUrl;

  return (
    <div className="dash">
      <header className="dash-header">
        <Link href="/" className="brand">◆ JOBCRON</Link>
        <div className="who">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="avatar-sm" src={avatar} alt="" />
          ) : null}
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
          <Link href="/messages" className={pathname === "/messages" ? "active" : ""}>
            <MessageSquare size={16} /> Messages
            {unread > 0 && <span className="nav-badge">{unread}</span>}
          </Link>
          {user?.role === "admin" && (
            <Link href="/admin" className={pathname === "/admin" ? "active" : ""}>
              <Shield size={16} /> Admin
            </Link>
          )}
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
