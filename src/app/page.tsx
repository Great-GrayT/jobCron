"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import {
  Briefcase,
  BarChart3,
  CheckSquare,
  LayoutDashboard,
  LogIn,
  UserPlus,
  MessageSquare,
  Rss,
  SlidersHorizontal,
  Send,
  FileSearch,
  Github,
  X,
  ArrowRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TimezonePicker } from "@/components/TimezonePicker";
import { CeramicPicker } from "@/components/CeramicPicker";
import "./home.css";

const FLOW_STEPS = [
  {
    icon: UserPlus,
    title: "Sign up",
    text: "Create your Job Monitor account | it's the command center for everything below.",
  },
  {
    icon: Rss,
    title: "Sign up at RSS.app",
    text: "Turn the job searches you care about into RSS feeds you can plug in.",
  },
  {
    icon: SlidersHorizontal,
    title: "Set it up",
    text: "Add your feeds, connect a Telegram channel, build match filters (JFS), and pick a schedule.",
  },
  {
    icon: Send,
    title: "Receive & analyse",
    text: "Get only the matching jobs in Telegram, explore the live stats page, and run CV keyword analysis.",
  },
];

const COMIC_PAGES = ["/comic/1.webp", "/comic/2.webp", "/comic/3.webp", "/comic/4.webp"];

export default function Home() {
  const [logoClicks, setLogoClicks] = useState(0);
  const [glitchMode, setGlitchMode] = useState(false);
  const [comicOpen, setComicOpen] = useState(false);
  const { authenticated } = useAuth();

  // Easter egg: multiple clicks on logo
  const handleLogoClick = () => {
    const newClicks = logoClicks + 1;
    setLogoClicks(newClicks);
    if (newClicks === 7) {
      setGlitchMode(true);
      setTimeout(() => { setGlitchMode(false); setLogoClicks(0); }, 2000);
    }
    setTimeout(() => setLogoClicks(0), 2000);
  };

  return (
    <div className="terminal-page">
      {/* Top Bar (NAV) */}
      <header className="terminal-topbar">
        <div className="terminal-topbar-left">
          <div
            className={`terminal-logo ${glitchMode ? "glitch-active" : ""}`}
            onClick={handleLogoClick}
          >
            <Briefcase size={20} />
          </div>
          <span className="terminal-title">JOB MONITOR</span>
          <span className="terminal-separator">|</span>
          <span className="terminal-subtitle">Command Center</span>
        </div>
        <div className="terminal-topbar-right">
          {authenticated ? (
            <>
              <Link href="/stats" className="terminal-btn"><BarChart3 size={14} />STATS</Link>
              <Link href="/applied" className="terminal-btn"><CheckSquare size={14} />APPLIED</Link>
              <Link href="/dashboard" className="terminal-btn"><LayoutDashboard size={14} />DASHBOARD</Link>
              <Link href="/messages" className="terminal-btn"><MessageSquare size={14} />MESSAGES</Link>
            </>
          ) : (
            <>
              <Link href="/login" className="terminal-btn"><LogIn size={14} />LOGIN</Link>
              <Link href="/register" className="terminal-btn"><UserPlus size={14} />SIGN UP</Link>
            </>
          )}
          <CeramicPicker />
          <TimezonePicker />
          <ThemeToggle />
        </div>
      </header>

      {/* Intro + how it works */}
      <section className="home-hero">
        <h1 className="home-hero-title">Stop refreshing job boards.</h1>
        <p className="home-hero-lead">
          <b>Job Monitor</b> is an automated job-hunting command center. It watches RSS job feeds
          around the clock, filters every posting against <i>your</i> rules, and pushes only the
          matches straight to your Telegram | so you spend your time applying, not searching. Along
          the way it builds a live statistics dashboard of the market and scores your CV against real
          demand.
        </p>
        {!authenticated && (
          <div className="home-hero-cta">
            <Link href="/register" className="btn btn-flourish"><UserPlus size={16} /> Get started</Link>
            <Link href="/stats" className="btn ghost btn-goo"><BarChart3 size={16} /> See the stats</Link>
          </div>
        )}
      </section>

      {/* Vertical flow chart */}
      <section className="home-flow">
        <h2 className="home-section-title">How it works</h2>
        <ol className="flow-chart">
          {FLOW_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li className="flow-step" key={step.title}>
                <div className="flow-node">
                  <span className="flow-num">{i + 1}</span>
                  <Icon size={22} className="flow-icon" />
                </div>
                <div className="flow-body">
                  <h3 className="flow-title">{step.title}</h3>
                  <p className="flow-text">{step.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Comic */}
      <section className="home-comic">
        <h2 className="home-section-title">The saga of Mr. Potato</h2>
        <p className="home-comic-sub">One spud&apos;s job hunt | before and after Job Monitor. Click to read.</p>
        <button type="button" className="comic-cover" onClick={() => setComicOpen(true)}>
          <Image src="/comic/cover.webp" alt="Mr. Potato" width={280} height={350} className="comic-cover-img" />
          <span className="comic-cover-cta"><ArrowRight size={16} /> Read the comic</span>
        </button>
      </section>

      {comicOpen && (
        <div className="comic-modal" onClick={() => setComicOpen(false)} role="dialog" aria-modal="true">
          <button type="button" className="comic-close" onClick={() => setComicOpen(false)} aria-label="Close">
            <X size={20} />
          </button>
          <div className="comic-reader" onClick={(e) => e.stopPropagation()}>
            {COMIC_PAGES.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt={`Comic page ${i + 1}`} className="comic-page" />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="terminal-footer">
        <div className="footer-content">
          <a href="https://github.com/Great-GrayT/jobCron" target="_blank" rel="noopener noreferrer" className="footer-github">
            <Github size={14} />
            <span>GitHub</span>
          </a>
          <span className="footer-separator">•</span>
          <span className="footer-tech">Next.js</span>
          <span className="footer-separator">•</span>
          <span className="footer-tech">Vercel</span>
          <span className="footer-separator">•</span>
          <span className="footer-tech">24/7 Monitoring</span>
        </div>
      </footer>
    </div>
  );
}
