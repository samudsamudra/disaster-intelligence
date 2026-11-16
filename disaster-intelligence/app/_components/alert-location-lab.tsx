"use client";

import { useCallback, useEffect, useState } from "react";
import { distanceKm, type AlertLocation } from "../_lib/local-alert-risk";
import { simulatedPointNear } from "../_lib/local-alert-lab";
import { EarthquakeMap } from "./earthquake-map";
import { useAlertMonitor } from "./alert-monitor";

const LAB_KEY = "pantau-location-lab-fired";

async function sendSimulation(distance: number) {
  if (!("Notification" in window) || Notification.permission !== "granted") return false;
  const title = "SIMULASI · Gempa kuat dekat lokasi Anda";
  const options = {
    body: `UJI COBA · Gempa rekaan M 5,8 sekitar ${distance.toFixed(1)} km dari lokasi Anda. Bukan kejadian nyata atau peringatan resmi.`,
    tag: "pantaubencana-location-lab", data: { url: "/alerts" },
  };
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.register("/alert-sw.js");
      await registration.showNotification(title, options);
    } else new Notification(title, options);
    return true;
  } catch { return false; }
}

export function AlertLocationLab() {
  const monitor = useAlertMonitor();
  const [point, setPoint] = useState<AlertLocation | null>(null);
  const [message, setMessage] = useState("Simulasi akan berjalan sekali saat lokasi perangkat tersedia.");

  const run = useCallback((location: AlertLocation) => {
    const next = simulatedPointNear(location);
    const distance = distanceKm(location, next);
    sessionStorage.setItem(LAB_KEY, "1");
    setPoint(next);
    void sendSimulation(distance).then(shown => setMessage(shown
      ? "Notifikasi simulasi dikirim. Titik uji ditampilkan di peta."
      : "Titik uji tampil di peta; notifikasi sistem belum tersedia atau belum diizinkan."));
  }, []);

  useEffect(() => {
    if (!monitor.enabled || !monitor.location || monitor.notificationPermission === "default" || sessionStorage.getItem(LAB_KEY) === "1") return;
    const timer = window.setTimeout(() => run(monitor.location!), 0);
    return () => window.clearTimeout(timer);
  }, [monitor.enabled, monitor.location, monitor.notificationPermission, run]);

  return <section className="alert-lab-panel" aria-labelledby="alert-lab-title">
    <p className="eyebrow">LAB · SKENARIO REKAAN</p>
    <h2 id="alert-lab-title">Simulasi gempa dekat lokasi Anda</h2>
    <p>Setelah pemantauan lokasi aktif, skenario M 5,8 dibuat sekitar 1 km dari perangkat. Titik dan notifikasi ini hanya untuk menguji pengalaman pengguna, bukan laporan BMKG atau USGS.</p>
    {!monitor.enabled && <button type="button" onClick={monitor.start}>Aktifkan lokasi dan notifikasi</button>}
    {monitor.enabled && !monitor.location && <button type="button" onClick={monitor.start}>Coba baca lokasi</button>}
    {monitor.location && point && <div className="alert-lab-event" role="alert"><strong>SIMULASI · Gempa M 5,8 dekat Anda</strong><span>Sekitar {distanceKm(monitor.location, point).toFixed(1)} km dari lokasi perangkat · bukan kejadian nyata</span></div>}
    {monitor.location && point && <EarthquakeMap userLocation={monitor.location} simulationPoint={point} selectedEvent={null} onEventSelect={() => {}} />}
    {monitor.location && <button type="button" onClick={() => run(monitor.location!)}>Ulangi simulasi</button>}
    <p className="alert-monitor-message" role="status">{message}</p>
  </section>;
}
