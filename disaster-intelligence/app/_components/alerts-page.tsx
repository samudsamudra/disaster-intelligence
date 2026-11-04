"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FloatingDisasterBot } from "./floating-disaster-bot";

type Earthquake = {
  id: string;
  source: "BMKG" | "USGS";
  magnitude: number;
  place: string;
  depthKm: number | null;
  occurredAt: string;
};

function NavIcon({ type }: { type: "grid" | "map" | "bell" }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15M15 6v15" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  };

  return <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[type]}</svg>;
}

export function AlertsPage() {
  const [events, setEvents] = useState<Earthquake[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    fetch("/api/v1/earthquakes", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json() as { success: boolean; data: Earthquake[] };
        if (!result.success || !Array.isArray(result.data)) throw new Error("Invalid response");
        setEvents(result.data);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const pageCount = Math.max(1, Math.ceil(events.length / pageSize));
  const currentEvents = events.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="dashboard-shell alerts-shell">
      <aside className="sidebar" aria-label="Navigasi utama">
        <Link className="brand" href="/" aria-label="PantauBencana — beranda"><span className="brand-mark"><span /><span /><span /></span><span>Pantau<span className="brand-accent">Bencana</span></span></Link>
        <nav className="primary-nav">
          <Link className="nav-link" href="/"><NavIcon type="grid" /> Ikhtisar nasional</Link>
          <Link className="nav-link" href="/#local-monitoring"><NavIcon type="map" /> Pantau wilayah</Link>
          <Link className="nav-link active" href="/alerts" aria-current="page"><NavIcon type="bell" /> Peringatan</Link>
        </nav>
        <div className="sidebar-footer"><div className="data-status"><span className="status-dot" /> Pusat peringatan aktif</div><p>Data kejadian diperbarui dari sumber resmi.</p></div>
      </aside>
      <main className="dashboard-main standalone-main">
        <header className="topbar"><div><p className="eyebrow">INDONESIA · MONITORING RISIKO</p><h1>Peringatan kejadian</h1></div><Link className="back-link" href="/">Kembali ke ikhtisar</Link></header>
        <section className="standalone-content">
        <p className="eyebrow">PERINGATAN TERKINI</p>
        <h1>Semua kejadian terpantau</h1>
        <p className="standalone-intro">Daftar kejadian dari sumber BMKG dan USGS. Data dimuat bertahap agar halaman tetap ringan.</p>
        <div className="standalone-list" aria-live="polite">
          {loading && <p className="panel-caption">Memuat peringatan...</p>}
          {!loading && currentEvents.length === 0 && <p className="panel-caption">Belum ada data kejadian.</p>}
          {currentEvents.map((event) => <article className="standalone-event" key={event.id}><div className={`standalone-severity ${event.magnitude >= 5 ? "urgent" : ""}`}>M {event.magnitude.toFixed(1)}</div><div><strong>{event.place}</strong><p>{event.source} · Kedalaman {event.depthKm ?? "tidak diketahui"} km</p><time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })} WIB</time></div></article>)}
        </div>
        <div className="feed-pagination"><button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Sebelumnya</button><span>Halaman {page + 1} dari {pageCount}</span><button type="button" disabled={page >= pageCount - 1} onClick={() => setPage((value) => value + 1)}>Berikutnya</button></div>
        </section>
        <FloatingDisasterBot events={events} />
      </main>
    </div>
  );
}
