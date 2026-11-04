"use client";

import { useEffect, useState } from "react";
import { EarthquakeMap } from "./earthquake-map";
import { FloatingDisasterBot } from "./floating-disaster-bot";

type Earthquake = {
  id: string;
  source: "BMKG" | "USGS";
  magnitude: number;
  place: string;
  longitude: number;
  latitude: number;
  depthKm: number | null;
  occurredAt: string;
  felt: string | null;
};

type EarthquakeResponse = {
  success: boolean;
  data: Earthquake[];
  meta: {
    checkedAt: string;
    total: number;
    availableSources: number;
    status: "available" | "partial" | "unavailable";
    sources: {
      name: string;
      status: string;
    }[];
  };
};

type FeedState = {
  events: Earthquake[];
  checkedAt: string | null;
  availableSources: number;
  status: EarthquakeResponse["meta"]["status"] | "error";
  error: string | null;
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

type LocationState = "requesting" | "granted" | "denied" | "unsupported";
type LocalRisk = "safe" | "warning" | "danger";

const initialFeedState: FeedState = {
  events: [],
  checkedAt: null,
  availableSources: 0,
  status: "unavailable",
  error: null,
};

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function formatMagnitude(magnitude: number) {
  return magnitude.toFixed(1);
}

function sourceLabel(status: FeedState["status"]) {
  if (status === "available") return "Terhubung";
  if (status === "partial") return "Sebagian terhubung";
  if (status === "error") return "Gagal diperbarui";
  return "Tidak tersedia";
}

function distanceInKm(from: UserLocation, to: Earthquake) {
  const earthRadiusKm = 6371;
  const latitudeDelta = ((to.latitude - from.latitude) * Math.PI) / 180;
  const longitudeDelta = ((to.longitude - from.longitude) * Math.PI) / 180;
  const latitude = (from.latitude * Math.PI) / 180;
  const targetLatitude = (to.latitude * Math.PI) / 180;
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude) * Math.cos(targetLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function localRisk(location: UserLocation | null, events: Earthquake[]) {
  if (!location) return null;

  const nearest = events
    .map((event) => ({ event, distanceKm: distanceInKm(location, event) }))
    .filter(({ distanceKm }) => distanceKm <= 200)
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

  if (!nearest) return { level: "safe" as const, nearest: null };
  if (nearest.distanceKm <= 100 && nearest.event.magnitude >= 5.5) {
    return { level: "danger" as const, nearest };
  }
  if (nearest.event.magnitude >= 4) {
    return { level: "warning" as const, nearest };
  }

  return { level: "safe" as const, nearest };
}

function riskLabel(risk: LocalRisk) {
  if (risk === "danger") return "Bahaya";
  if (risk === "warning") return "Waspada";
  return "Aman";
}

function Mark({ name }: { name: "grid" | "map" | "bell" | "chevron" | "layers" | "arrow" }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15M15 6v15" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  };

  return <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function DashboardShell() {
  const [feed, setFeed] = useState<FeedState>(initialFeedState);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationState, setLocationState] = useState<LocationState>("requesting");
  const [feedPage, setFeedPage] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadEarthquakes() {
      try {
        const response = await fetch("/api/v1/earthquakes", {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`API returned HTTP ${response.status}`);
        }

        const payload = (await response.json()) as EarthquakeResponse;
        if (!payload.success || !payload.meta || !Array.isArray(payload.data)) {
          throw new Error("API returned an invalid response");
        }

        setFeed({
          events: payload.data,
          checkedAt: payload.meta.checkedAt,
          availableSources: payload.meta.availableSources,
          status: payload.meta.status,
          error: null,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;

        setFeed((current) => ({
          ...current,
          status: "error",
          error: "Data gempa tidak dapat dimuat saat ini.",
        }));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadEarthquakes();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setLocationState("granted");
      },
      () => setLocationState("denied"),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  }, []);

  const freshness = feed.checkedAt ? formatEventTime(feed.checkedAt) : "belum tersedia";
  const sourceStatus = sourceLabel(feed.status);
  const risk = localRisk(userLocation, feed.events);
  const recentEvents = [...feed.events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(recentEvents.length / pageSize));
  const pagedEvents = recentEvents.slice(feedPage * pageSize, (feedPage + 1) * pageSize);

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationState("unsupported");
      return;
    }

    setLocationState("requesting");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setLocationState("granted");
      },
      () => setLocationState("denied"),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  }

  return <div className="dashboard-shell">
    <a className="skip-link" href="#main-content">Lewati ke konten utama</a>
    <aside className="sidebar" aria-label="Navigasi utama">
      <a className="brand" href="#national-overview" aria-label="PantauBencana — beranda"><span className="brand-mark"><span /><span /><span /></span><span>Pantau<span className="brand-accent">Bencana</span></span></a>
      <nav className="primary-nav"><a className="nav-link active" href="#national-overview" aria-current="page"><Mark name="grid" /> Ikhtisar nasional</a><a className="nav-link" href="#local-monitoring"><Mark name="map" /> Pantau wilayah</a><a className="nav-link" href="/alerts"><Mark name="bell" /> Peringatan</a></nav>
      <div className="sidebar-footer"><div className="data-status"><span className="status-dot" /> Sumber data {sourceStatus.toLowerCase()}</div><p>Data kejadian diperbarui dari sumber resmi.</p></div>
    </aside>
    <main id="main-content" className="dashboard-main">
      <header className="topbar"><div><p className="eyebrow">INDONESIA · MONITORING RISIKO</p><h1>Selamat datang kembali.</h1></div><div className="topbar-actions"><div className="freshness"><span className="status-dot" /> Terakhir diperbarui: {freshness}</div><button className="icon-button" type="button" aria-label="Buka notifikasi"><Mark name="bell" /><span className="notification-dot" /></button></div></header>
      <section className="hero" id="national-overview" aria-labelledby="overview-title"><div className="hero-copy"><p className="eyebrow">IKHTISAR NASIONAL</p><h2 id="overview-title">Satu pandangan untuk kesiapsiagaan yang lebih cepat.</h2><p>Ruang kerja terpadu untuk memantau laporan kejadian, kondisi wilayah, dan peringatan resmi di seluruh Indonesia.</p></div><div className="source-card"><div className="source-icon"><Mark name="layers" /></div><div><span>Sumber data gempa</span><strong>{sourceStatus}</strong></div><p>{feed.error ?? `${feed.availableSources} sumber resmi terhubung.`}</p></div></section>
      <section className="indicators" aria-label="Ringkasan indikator">
        <article className="indicator"><span>Gempa terpantau</span><strong>{loading ? "—" : feed.events.length}</strong><small>24 jam terakhir</small></article>
        <article className="indicator"><span>Sumber terhubung</span><strong>{loading ? "—" : `${feed.availableSources}/2`}</strong><small>BMKG dan USGS</small></article>
        <article className="indicator"><span>Status data</span><strong>{loading ? "—" : feed.status === "available" ? "OK" : "!"}</strong><small>{loading ? "memuat data" : sourceStatus}</small></article>
      </section>
      <div className="content-grid">
        <section className="map-panel" id="local-monitoring" aria-labelledby="map-title"><div className="section-heading"><div><p className="eyebrow">PANTAU WILAYAH</p><h2 id="map-title">Area sekitar Anda</h2></div><span className="demo-label">LIVE EARTHQUAKES</span></div><div className={`local-risk-card ${risk?.level ?? "unknown"}`} role="status"><div><span className="risk-label">Status wilayah</span><strong>{locationState === "requesting" ? "Meminta lokasi..." : risk ? riskLabel(risk.level) : "Lokasi diperlukan"}</strong></div><p>{locationState === "denied" || locationState === "unsupported" ? "Izinkan akses lokasi untuk membaca ancaman di sekitar Anda." : risk?.nearest ? `Gempa terdekat ${risk.nearest.distanceKm.toFixed(0)} km dari lokasi Anda.` : "Belum ada ancaman gempa dalam radius pemantauan."}</p>{locationState !== "granted" && <button className="location-button" type="button" onClick={requestLocation}>Izinkan akses lokasi</button>}</div><EarthquakeMap userLocation={userLocation} /><p className="panel-caption">Status berdasarkan gempa terpantau dalam radius 200 km dari lokasi Anda. Lokasi diproses hanya di perangkat ini.</p></section>
        <section className="feed-panel" id="alerts" aria-labelledby="feed-title"><div className="section-heading"><div><p className="eyebrow">AKTIVITAS TERBARU</p><h2 id="feed-title">Gempa bumi</h2></div><span className="demo-label">{feed.status === "partial" ? "DATA SEBAGIAN" : "DATA LANGSUNG"}</span></div>
          <div className="feed-list" aria-live="polite">
            {loading && <p className="panel-caption">Memuat data gempa...</p>}
            {!loading && feed.error && <p className="panel-caption">{feed.error}</p>}
            {!loading && !feed.error && pagedEvents.length === 0 && <p className="panel-caption">Belum ada gempa yang terpantau.</p>}
            {!loading && !feed.error && pagedEvents.length === 0 && <p className="panel-caption">Belum ada kejadian yang terpantau.</p>}
            {!loading && !feed.error && pagedEvents.map((event) => <article className="event" key={event.id}><span className={`event-icon${event.magnitude >= 5 ? " urgent" : ""}`}><Mark name="bell" /></span><div className="event-copy"><div><strong>M {formatMagnitude(event.magnitude)}</strong><span className={`level${event.magnitude >= 5 ? " urgent" : ""}`}>{event.source}</span></div><p>{event.place}</p><time dateTime={event.occurredAt}>{formatEventTime(event.occurredAt)} WIB</time></div></article>)}
          </div><div className="feed-pagination" aria-label="Navigasi halaman aktivitas"><button type="button" disabled={feedPage === 0} onClick={() => setFeedPage((page) => page - 1)}>Sebelumnya</button><span>Halaman {Math.min(feedPage + 1, pageCount)} dari {pageCount}</span><button type="button" disabled={feedPage >= pageCount - 1} onClick={() => setFeedPage((page) => page + 1)}>Berikutnya</button></div><a className="feed-link" href="/alerts">Buka semua peringatan</a></section>
      </div>
      <footer className="dashboard-footer">PantauBencana · Data gempa BMKG dan USGS · <span>Terakhir diperbarui: {freshness}.</span></footer>
    </main>
    <FloatingDisasterBot events={feed.events} />
  </div>;
}
