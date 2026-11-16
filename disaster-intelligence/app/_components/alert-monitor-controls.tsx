"use client";

import { useAlertMonitor } from "./alert-monitor";

export function AlertMonitorControls() {
  const monitor = useAlertMonitor();
  const locationLabel = monitor.locationStatus === "ready" ? "Lokasi perangkat terbaca" : monitor.locationStatus === "denied" ? "Izin lokasi ditolak" : monitor.locationStatus === "prompt" ? "Izinkan lokasi untuk pemantauan" : monitor.locationStatus === "unavailable" ? "Lokasi belum tersedia" : "Menunggu lokasi";
  const notificationLabel = monitor.notificationPermission === "granted" ? "Notifikasi browser aktif" : monitor.notificationPermission === "denied" ? "Notifikasi browser diblokir" : "Notifikasi browser belum aktif";

  return <section className="alert-monitor-panel" aria-labelledby="alert-monitor-title">
    <div className="alert-monitor-heading"><div><p className="eyebrow">PEMANTAUAN LOKASI</p><h2 id="alert-monitor-title">Peringatan gempa di sekitar Anda</h2></div><span className="alert-monitor-badge">{monitor.enabled ? "AKTIF" : "NONAKTIF"}</span></div>
    <p>Pemantauan otomatis berjalan ketika izin lokasi tersedia dan situs terbuka. Gempa BMKG/USGS diperiksa tiap menit: M 4+ dalam 200 km memicu waspada; M 5,5+ dalam 100 km memicu peringatan lebih kuat. Hanya kejadian 30 menit terakhir yang diperiksa. Ini perkiraan radius, bukan peringatan resmi.</p>
    <div className="alert-monitor-status"><span>{locationLabel}</span><span>{notificationLabel}</span></div>
    <div className="alert-monitor-actions">{!monitor.enabled && <button type="button" onClick={monitor.start}>Aktifkan lokasi dan notifikasi</button>}{monitor.enabled && monitor.notificationPermission === "default" && <button type="button" onClick={monitor.start}>Izinkan notifikasi browser</button>}{monitor.enabled && monitor.notificationPermission === "denied" && <span>Ubah izin notifikasi di pengaturan situs jika ingin menerima pop-up.</span>}</div>
    <p className="alert-monitor-message" role="status">{monitor.message}</p>
  </section>;
}
