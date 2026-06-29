"use client";

import { Fragment, ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut, ChevronDown, Search, ArrowLeft, User as UserIcon, type LucideIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { messages } from "@/lib/api/messages";
import { ThemeToggle } from "@/components/ThemeToggle";
import { navbarLinks } from "@/components/navMenu";
import "@/components/admin-shell.css";

export interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** When set, an "unread messages" badge is rendered with the live count. */
  messagesBadge?: boolean;
}

export interface MenuSection {
  label?: string;
  items: MenuItem[];
}

interface AdminShellProps {
  menu: MenuSection[];
  breadcrumb: string[];
  title: string;
  brand?: string;
  actions?: ReactNode;
  /** Back target. `false` hides the button; a string is used as href; otherwise router.back(). */
  back?: string | false;
  children: ReactNode;
}

export function AdminShell({
  menu,
  breadcrumb,
  title,
  brand = "JOBCRON",
  actions,
  back,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messages.list().then((r) => setUnread(r.unread)).catch(() => {});
  }, []);

  // Close drawer + dropdowns on navigation.
  useEffect(() => {
    setOpen(false);
    setNavOpen(false);
    setUserOpen(false);
  }, [pathname]);

  // Close dropdowns when clicking outside.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setNavOpen(false);
        setUserOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const avatar = user?.avatarData || user?.avatarUrl;
  const links = navbarLinks(user?.role);

  const goBack = () => {
    if (typeof back === "string") router.push(back);
    else router.back();
  };

  return (
    <div className={`admin${open ? " aside-open" : ""}`}>
      <nav className="admin-navbar">
        <div className="navbar-left">
          <button
            type="button"
            className="navbar-burger"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link href="/" className="navbar-brand-text">
            ◆ {brand}
          </Link>
          <div className="navbar-search">
            <Search size={15} />
            <input placeholder="Search…" aria-label="Search" />
          </div>
        </div>

        <div className="navbar-right" ref={dropRef}>
          {/* Template-style "Menu" dropdown — jump to any page */}
          <div className="navbar-dropdown-wrap">
            <button type="button" className="navbar-item-btn" onClick={() => { setNavOpen((v) => !v); setUserOpen(false); }}>
              <Menu size={16} />
              <span>Menu</span>
              <ChevronDown size={14} />
            </button>
            {navOpen && (
              <div className="navbar-dropdown">
                {links.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} className="navbar-dropdown-item">
                    <Icon size={16} />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <ThemeToggle />

          {/* User dropdown */}
          <div className="navbar-dropdown-wrap">
            <button type="button" className="navbar-user" onClick={() => { setUserOpen((v) => !v); setNavOpen(false); }}>
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="navbar-avatar" src={avatar} alt="" />
              ) : (
                <span className="navbar-avatar navbar-avatar-fallback"><UserIcon size={15} /></span>
              )}
              <span className="navbar-user-name">{user?.email}</span>
              <ChevronDown size={14} />
            </button>
            {userOpen && (
              <div className="navbar-dropdown is-right">
                <Link href="/dashboard/account" className="navbar-dropdown-item"><UserIcon size={16} /><span>Account</span></Link>
                <Link href="/messages" className="navbar-dropdown-item"><Menu size={16} /><span>Messages</span></Link>
                <button type="button" className="navbar-dropdown-item" onClick={logout}><LogOut size={16} /><span>Log out</span></button>
              </div>
            )}
          </div>

          <button type="button" className="btn ghost sm navbar-logout" onClick={logout}>
            <LogOut size={14} /> Log out
          </button>
        </div>
      </nav>

      <aside className="admin-aside">
        <div className="aside-tools">
          <span>
            <b>◆</b> {brand}
          </span>
        </div>
        <div className="aside-menu">
          {menu.map((section, i) => (
            <Fragment key={i}>
              {section.label ? <p className="menu-label">{section.label}</p> : null}
              <ul className="menu-list">
                {section.items.map(({ href, label, icon: Icon, messagesBadge }) => (
                  <li key={href}>
                    <Link href={href} className={pathname === href ? "is-active" : ""}>
                      <span className="menu-icon">
                        <Icon size={18} />
                      </span>
                      <span className="menu-item-label">{label}</span>
                      {messagesBadge && unread > 0 ? (
                        <span className="menu-badge">{unread}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </Fragment>
          ))}
        </div>
      </aside>

      <div className="aside-overlay" onClick={() => setOpen(false)} />

      <div className="admin-content">
        <section className="title-bar">
          <ul className="breadcrumb">
            <li><Link href="/">Home</Link></li>
            {breadcrumb.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
        <section className="hero-bar">
          <div className="hero-left">
            {back !== false && (
              <button type="button" className="btn ghost sm hero-back" onClick={goBack}>
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <h1 className="hero-title">{title}</h1>
          </div>
          {actions ? <div className="hero-actions">{actions}</div> : null}
        </section>
        <main className="main-section">{children}</main>
      </div>
    </div>
  );
}
