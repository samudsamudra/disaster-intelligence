"use client";

import { useAlertMonitor } from "./alert-monitor";

export function AlertMonitorControls() {
  const monitor = useAlertMonitor();
  const locationLabel = monitor.locationStatus === "ready" ? "Lokasi perangkat terbaca" : monitor.locationStatus === "denied" ? "Izin lokasi ditolak" : monitor.locationStatus === "prompt" ? "Izinkan lokasi untuk pemantauan" : monitor.locationStatus === "unavailable" ? "Lokasi belum tersedia" : "Menunggu lokasi";
  const notificationLabel = monitor.notificationPermission === "granted" ? "Notifikasi browser aktif" : monitor.notificationPermission === "denied" ? "Notifikasi browser diblokir" : "Notifikasi browser belum aktif";

  return <section className="alert-monitor-panel" aria-labelledby="alert-monitor-title">
    <div className="alert-monitor-heading"><div><p className="eyebrow">PEMANTAUAN LOKASI</p><h2 id="alert-monitor-title">Peringatan gempa di sekitar Anda</h2></div><span className="alert-monitor-badge">{monitor.enabled ? "AKTIF" : "NONAKTIF"}</span></div>
    <p>Ketika situs terbuka, kami memeriksa gempa BMKG dan USGS tiap menit. Gempa M 4+ dalam 200 km memicu waspada; M 5,5+ dalam 100 km memicu peringatan lebih kuat. Hanya kejadian 30 menit terakhir yang diperiksa. Perkiraan radius ini bukan peringatan resmi.</p>
    <div className="alert-monitor-status"><span>{locationLabel}</span><span>{notificationLabel}</span></div>
    <div className="alert-monitor-actions">{monitor.enabled ? <button type="button" onClick={monitor.stop}>Hentikan pemantauan</button> : <button type="button" onClick={monitor.start}>Aktifkan peringatan lokasi</button>}{monitor.enabled && monitor.locationStatus !== "ready" && <button type="button" onClick={monitor.start}>Coba lokasi lagi</button>}{monitor.enabled && monitor.notificationPermission === "default" && <button type="button" onClick={monitor.start}>Izinkan notifikasi</button>}</div>
    <p className="alert-monitor-message" role="status">{monitor.message}</p>
  </section>;
}
