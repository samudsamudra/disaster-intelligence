"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { distanceKm, type AlertLocation } from "../_lib/local-alert-risk";
import { simulatedPointNear } from "../_lib/local-alert-lab";
import { EarthquakeMap } from "./earthquake-map";
import { useAlertMonitor } from "./alert-monitor";

const LAB_KEY = "pantau-location-lab-fired";
type LabContext = { point: AlertLocation | null; distance: number | null; message: string; runAgain: () => void };
const Context = createContext<LabContext | null>(null);

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

export function AlertLocationLabProvider({ children }: { children: ReactNode }) {
  const monitor = useAlertMonitor();
  const [point, setPoint] = useState<AlertLocation | null>(null);
  const [message, setMessage] = useState("Simulasi akan berjalan saat lokasi perangkat tersedia.");
  const [bannerVisible, setBannerVisible] = useState(false);
  const activePoint = monitor.location ? point : null;
  const distance = monitor.location && activePoint ? distanceKm(monitor.location, activePoint) : null;

  const run = useCallback((location: AlertLocation) => {
    const next = simulatedPointNear(location);
    const nearbyDistance = distanceKm(location, next);
    sessionStorage.setItem(LAB_KEY, "1");
    setPoint(next);
    setBannerVisible(true);
    void sendSimulation(nearbyDistance).then(shown => setMessage(shown
      ? "Notifikasi simulasi dikirim. Titik uji ditampilkan pada peta Ikhtisar dan Peringatan."
      : "Simulasi tampil pada halaman dan peta; notifikasi sistem belum tersedia atau belum diizinkan."));
  }, []);

  useEffect(() => {
    if (!monitor.enabled || !monitor.location) return;
    const location = monitor.location;
    if (sessionStorage.getItem(LAB_KEY) === "1") {
      const timer = window.setTimeout(() => setPoint(simulatedPointNear(location)), 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => run(location), 0);
    return () => window.clearTimeout(timer);
  }, [monitor.enabled, monitor.location, run]);

  const runAgain = () => { if (monitor.location) run(monitor.location); };
  return <Context.Provider value={{ point: activePoint, distance, message, runAgain }}>
    {children}
    {activePoint && bannerVisible && <div className="lab-global-alert" role="alert"><div><strong>SIMULASI · Gempa M 5,8 dekat lokasi Anda</strong><p>Sekitar {distance?.toFixed(1)} km · Bukan kejadian nyata atau peringatan resmi.</p></div><button type="button" onClick={() => setBannerVisible(false)} aria-label="Tutup pemberitahuan simulasi">×</button></div>}
  </Context.Provider>;
}

export function useAlertLocationLab() {
  const context = useContext(Context);
  if (!context) throw new Error("AlertLocationLabProvider belum tersedia");
  return context;
}

export function AlertLocationLab() {
  const monitor = useAlertMonitor();
  const lab = useAlertLocationLab();
  return <section className="alert-lab-panel" aria-labelledby="alert-lab-title">
    <p className="eyebrow">LAB · SKENARIO REKAAN</p>
    <h2 id="alert-lab-title">Simulasi gempa dekat lokasi Anda</h2>
    <p>Ketika lokasi tersedia, skenario M 5,8 dibuat sekitar 1 km dari perangkat dan muncul juga di Ikhtisar. Titik serta notifikasi ini bukan laporan BMKG atau USGS.</p>
    {!monitor.enabled && <button type="button" onClick={monitor.start}>Aktifkan lokasi dan notifikasi</button>}
    {monitor.enabled && !monitor.location && <button type="button" onClick={monitor.start}>Coba baca lokasi</button>}
    {monitor.location && lab.point && <div className="alert-lab-event" role="alert"><strong>SIMULASI · Gempa M 5,8 dekat Anda</strong><span>Sekitar {lab.distance?.toFixed(1)} km dari lokasi perangkat · bukan kejadian nyata</span></div>}
    {monitor.location && lab.point && <EarthquakeMap userLocation={monitor.location} simulationPoint={lab.point} selectedEvent={null} onEventSelect={() => {}} />}
    {monitor.location && <button type="button" onClick={lab.runAgain}>Ulangi simulasi</button>}
    <p className="alert-monitor-message" role="status">{lab.message}</p>
  </section>;
}
