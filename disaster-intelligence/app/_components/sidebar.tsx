"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";

const items = [
  { id: "home", href: "/", label: "Ikhtisar nasional", path: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z" },
  { id: "region", href: "/#local-monitoring", label: "Pantau wilayah", path: "m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z M9 3v15 M15 6v15" },
  { id: "climate", href: "/climate", label: "Pantau iklim", path: "m3 7 9-4 9 4-9 4-9-4Z m0 5 9 4 9-4 m-18 5 9 4 9-4" },
  { id: "news", href: "/news", label: "Warta Bencana", path: "M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5" },
  { id: "alerts", href: "/alerts", label: "Peringatan", path: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4" },
  { id: "about", href: "/about", label: "Tentang Kami", path: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" },
];

export function Sidebar({ active }: { active: string }) {
  const navRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav || !window.matchMedia("(max-width: 1049px)").matches) return;
    try {
      const saved = Number(sessionStorage.getItem("pantau-nav-scroll") ?? 0);
      if (Number.isFinite(saved)) nav.scrollLeft = saved;
    } catch {}
  }, []);
  const saveScroll = () => {
    const nav = navRef.current;
    if (!nav || !window.matchMedia("(max-width: 1049px)").matches) return;
    try { sessionStorage.setItem("pantau-nav-scroll", String(nav.scrollLeft)); } catch {}
  };
  return <aside className="sidebar" aria-label="Navigasi utama">
    <Link className="brand" href="/" aria-label="PantauBencana — beranda"><span className="brand-mark"><span /><span /><span /></span><span>Pantau<span className="brand-accent">Bencana</span></span></Link>
    <nav ref={navRef} className="primary-nav" onScroll={saveScroll} onClickCapture={saveScroll}>{items.map((item) => <Link key={item.id} className={`nav-link${active === item.id ? " active" : ""}`} href={item.href} aria-current={active === item.id ? "page" : undefined}><svg className="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.path} /></svg>{item.label}</Link>)}</nav>
    <div className="sidebar-footer"><div className="data-status"><span className="status-dot" /> Sumber resmi</div><p>Status ketersediaan data ditampilkan pada setiap halaman.</p></div>
  </aside>;
}

