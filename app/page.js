"use client";

import Link from "next/link";
import { GraduationCap, Factory, Presentation, School } from "lucide-react";

const NAV_LINKS = [
  { label: "Home",    href: "/",            active: true  },
  { label: "Explore", href: "#explore",     active: false },
  { label: "About",  href: "#about",        active: false },
  { label: "Portals",href: "#portals",      active: false },
  { label: "Join",   href: "/signup",       active: false },
];

export default function LandingPage() {
  return (
    <div className="landing-hero relative min-h-screen overflow-hidden">

      {/* ── Background Video ── */}
      <video
        className="absolute inset-0 w-full h-full object-cover z-0"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* ── Subtle dark veil so text always reads cleanly ── */}
      <div className="absolute inset-0 z-[1] bg-black/30" />

      {/* ══════════════════════ NAVBAR ══════════════════════ */}
      <nav className="relative z-10 w-full">
        <div className="flex flex-row items-center justify-between px-8 py-6 max-w-7xl mx-auto">

          {/* Logo */}
          <Link href="/" className="flex items-baseline gap-0 select-none">
            <span
              className="text-3xl tracking-tight text-white leading-none"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Origin Point
            </span>
            <sup className="text-xs text-white/60 ml-0.5">®</sup>
          </Link>

          {/* Nav Links — hidden on mobile */}
          <ul className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className={`text-sm transition-colors duration-200 ${
                    link.active
                      ? "text-white"
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Link
            href="/signup"
            className="liquid-glass rounded-full px-6 py-2.5 text-sm text-white transition-transform duration-200 hover:scale-[1.03] cursor-pointer"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ══════════════════════ HERO ══════════════════════ */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-32 pb-40">

        {/* ── Role cards (above headline for visibility) ── */}
        <div className="animate-fade-rise flex flex-wrap justify-center gap-3 mb-10">
          {[
            { role: "Student",     Icon: GraduationCap, desc: "Assessments · Skill mapping · Portfolio"   },
            { role: "Industry",    Icon: Factory,       desc: "Post roles · Source talent · Mentorship"   },
            { role: "Academician", Icon: Presentation,  desc: "FDPs · Research · Student tracking"        },
            { role: "Institution", Icon: School,        desc: "Analytics · Placement · Accreditation"     },
          ].map(({ role, Icon, desc }) => (
            <div
              key={role}
              className="liquid-glass flex items-center gap-3 rounded-2xl px-5 py-3 text-left"
            >
              <Icon size={22} strokeWidth={1.6} className="text-white shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span
                  className="text-sm font-semibold text-white leading-tight"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {role}
                </span>
                <span className="text-xs text-white/75 leading-tight">
                  {desc}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* H1 */}
        <h1
          className="animate-fade-rise text-5xl sm:text-7xl md:text-8xl font-normal leading-[0.95] max-w-7xl text-white"
          style={{
            fontFamily: "'Instrument Serif', serif",
            letterSpacing: "-2.46px",
          }}
        >
          Where{" "}
          <em className="not-italic" style={{ color: "hsl(240, 4%, 66%)" }}>
            skills rise
          </em>{" "}
          to meet{" "}
          <em className="not-italic" style={{ color: "hsl(240, 4%, 66%)" }}>
            opportunity.
          </em>
        </h1>

        {/* Subtext */}
        <p
          className="animate-fade-rise-delay max-w-2xl mt-8 text-base sm:text-lg leading-relaxed"
          style={{ color: "hsl(240, 4%, 66%)", fontFamily: "'Inter', sans-serif" }}
        >
          A centralized portal connecting <strong className="text-white/80 font-medium">students</strong>,{" "}
          <strong className="text-white/80 font-medium">industries</strong>, and{" "}
          <strong className="text-white/80 font-medium">academicians</strong> — through AI-powered
          skill assessments, digital portfolios, internship matching, and
          placement analytics. One platform for the complete career lifecycle.
        </p>

        {/* CTA Buttons */}
        <div className="animate-fade-rise-delay-2 flex flex-col sm:flex-row items-center gap-4 mt-12">
          <Link
            href="/signup"
            className="liquid-glass rounded-full px-14 py-5 text-base text-white transition-transform duration-200 hover:scale-[1.03] cursor-pointer"
          >
            Begin Your Journey
          </Link>
          <Link
            href="#explore"
            className="text-sm text-white/55 hover:text-white transition-colors duration-200 underline-offset-4 hover:underline"
          >
            Explore the platform →
          </Link>
        </div>
      </section>

      {/* ── spacer so CTA isn't flush to viewport bottom ── */}
      <div id="explore" className="relative z-10 pb-16" />

    </div>
  );
}
