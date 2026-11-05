"use client";

import { Sidebar } from "./sidebar";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAssistantContext } from "./assistant-context";

type Earthquake = {
  id: string;
  source: "BMKG" | "USGS";
  magnitude: number;
  place: string;
  depthKm: number | null;
  occurredAt: string;
};

export function AlertsPage() {
  const { setPageContext } = useAssistantContext();
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

  useEffect(() => {
    setPageContext({
      title: "Peringatan kejadian",
      details: `Daftar kejadian gempa BMKG dan USGS yang tampil di halaman peringatan: ${events.length} kejadian.`,
      events,
    });
  }, [events, setPageContext]);

  return (
    <div className="dashboard-shell alerts-shell">
      <Sidebar active="alerts" />
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
      </main>
    </div>
  );
}
