import { User, Rss, Send, Target, Clock, BarChart3, CheckSquare, MessageSquare, Shield, Home, LayoutDashboard, type LucideIcon } from "lucide-react";
import type { MenuSection } from "@/components/AdminShell";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Dashboard aside — ONLY pages that write a variable to the DB (settings).
 * Everything else is a "feature" and lives in featuresMenu().
 */
export function settingsMenu(): MenuSection[] {
  return [
    {
      label: "Settings",
      items: [
        { href: "/dashboard/account", label: "Account", icon: User },
        { href: "/dashboard/feeds", label: "Feeds", icon: Rss },
        { href: "/dashboard/telegram", label: "Telegram", icon: Send },
        { href: "/dashboard/goat", label: "GOAT", icon: Target },
        { href: "/dashboard/schedules", label: "Schedules", icon: Clock },
      ],
    },
  ];
}

/** Standalone "feature" apps — their own pages, navigated independently. */
export function featuresMenu(role?: string): MenuSection[] {
  return [
    {
      label: "Features",
      items: [
        { href: "/rss", label: "RSS App", icon: Rss },
        { href: "/stats", label: "Stats", icon: BarChart3 },
        { href: "/applied", label: "Tracking", icon: CheckSquare },
        { href: "/messages", label: "Messages", icon: MessageSquare, messagesBadge: true },
        ...(role === "admin" ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
      ],
    },
  ];
}

/**
 * Flat cross-app link list for the template-style navbar "Menu" dropdown —
 * lets users jump anywhere from any page.
 */
export function navbarLinks(role?: string): NavLink[] {
  return [
    { href: "/", label: "Home", icon: Home },
    { href: "/dashboard/account", label: "Dashboard", icon: LayoutDashboard },
    { href: "/rss", label: "RSS App", icon: Rss },
    { href: "/stats", label: "Stats", icon: BarChart3 },
    { href: "/applied", label: "Tracking", icon: CheckSquare },
    { href: "/messages", label: "Messages", icon: MessageSquare },
    ...(role === "admin" ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ];
}
