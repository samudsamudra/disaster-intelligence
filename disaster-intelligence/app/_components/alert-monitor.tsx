"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { distanceKm, nearbyAlerts, type AlertEarthquake, type AlertLocation, type NearbyAlert, validLocation } from "../_lib/local-alert-risk";

type LocationStatus = "waiting" | "ready" | "prompt" | "denied" | "unavailable";
type MonitorContext = {
  enabled: boolean;
  location: AlertLocation | null;
  locationStatus: LocationStatus;
  notificationPermission: NotificationPermission | "unsupported";
  latest: NearbyAlert | null;
  message: string;
  start: () => void;
  stop: () => void;
  dismiss: () => void;
};

const AlertMonitorContext = createContext<MonitorContext | null>(null);
const ENABLED_KEY = "pantau-alert-monitor-enabled";
const SEEN_KEY = "pantau-alert-seen-events";

export async function showBrowserNotification(alert: NearbyAlert) {
  if (!("Notification" in window) || Notification.permission !== "granted") return false;
  const title = alert.level === "danger" ? "Gempa kuat dekat lokasi Anda" : "Gempa dalam radius pantauan";
  const body = `M ${alert.event.magnitude.toFixed(1)} · sekitar ${Math.round(alert.distanceKm)} km. ${alert.event.source} · ${alert.event.place}. Periksa informasi resmi dan kondisi sekitar.`;
  const options = { body, tag: `real-${alert.event.id}`, data: { url: "/alerts" } };
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.register("/alert-sw.js");
      await registration.showNotification(title, options);
    } else {
      const notification = new Notification(title, options);
      notification.onclick = () => { window.focus(); notification.close(); };
    }
    return true;
  } catch {
    try { new Notification(title, options); return true; } catch { return false; }
  }
}

export function AlertMonitorProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [location, setLocation] = useState<AlertLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("waiting");
  const [notificationPermission, setNotificationPermission] = useState<MonitorContext["notificationPermission"]>("unsupported");
  const [latest, setLatest] = useState<NearbyAlert | null>(null);
  const [message, setMessage] = useState("Aktifkan pemantauan untuk menerima peringatan saat situs terbuka.");

  const readLocation = useCallback(() => {
    if (!navigator.geolocation || !window.isSecureContext) { setLocationStatus("unavailable"); return; }
    setLocationStatus("waiting");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const next = { latitude: coords.latitude, longitude: coords.longitude };
      if (!validLocation(next)) { setLocationStatus("unavailable"); return; }
      setLocation(next);
      setLocationStatus("ready");
    }, error => {
      setLocation(null);
      setLocationStatus(error.code === 1 ? "denied" : "unavailable");
    }, { maximumAge: 300_000, timeout: 10_000, enableHighAccuracy: false });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      const active = localStorage.getItem(ENABLED_KEY) === "1";
      setEnabled(active);
      setNotificationPermission("Notification" in window ? Notification.permission : "unsupported");
      if (!active) return;
      if (!navigator.permissions) { setLocationStatus("prompt"); return; }
      navigator.permissions.query({ name: "geolocation" }).then(result => {
        if (result.state === "granted") readLocation();
        else setLocationStatus(result.state === "denied" ? "denied" : "prompt");
      }).catch(() => setLocationStatus("prompt"));
    });
  }, [readLocation]);

  function start() {
    setEnabled(true);
    localStorage.setItem(ENABLED_KEY, "1");
    // Both permission requests start in the same user gesture.
    readLocation();
    if (window.isSecureContext && "Notification" in window) {
      void Notification.requestPermission().then(result => {
        setNotificationPermission(result);
        setMessage(result === "granted" ? "Notifikasi aktif. Memeriksa gempa terbaru di sekitar Anda." : "Notifikasi sistem belum diizinkan; peringatan dalam halaman tetap tersedia.");
      }).catch(() => setMessage("Izin notifikasi gagal diminta; peringatan dalam halaman tetap tersedia."));
    } else {
      setNotificationPermission("unsupported");
      setMessage("Browser ini tidak mendukung notifikasi sistem. Peringatan dalam halaman tetap tersedia.");
    }
  }

  function stop() {
    setEnabled(false);
    setLocation(null);
    setLatest(null);
    localStorage.removeItem(ENABLED_KEY);
    setMessage("Pemantauan dihentikan.");
  }

  const check = useCallback(async (signal?: AbortSignal) => {
    if (!location) return;
    try {
      const response = await fetch("/api/v1/earthquakes", { cache: "no-store", signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as { success: boolean; data: AlertEarthquake[]; meta?: { availableSources: number } };
      if (!payload.success || !Array.isArray(payload.data) || !payload.meta?.availableSources) throw new Error("Sumber gempa belum tersedia");
      const candidates = nearbyAlerts(location, payload.data);
      if (signal?.aborted) return;
      const now = Date.now();
      let seen: Record<string, number> = {};
      try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}"); } catch { /* Reset a damaged local cache. */ }
      const freshSeen = Object.fromEntries(Object.entries(seen).filter(([, timestamp]) => now - timestamp < 24 * 60 * 60_000));
      const candidate = candidates.find(item => !freshSeen[item.event.id]);
      if (!candidate) { setMessage("Pemantauan aktif. Belum ada gempa baru yang memenuhi radius dan magnitudo peringatan."); return; }
      freshSeen[candidate.event.id] = now;
      localStorage.setItem(SEEN_KEY, JSON.stringify(freshSeen));
      setLatest(candidate);
      const shown = await showBrowserNotification(candidate);
      setMessage(shown ? "Peringatan dikirim ke browser dan ditampilkan di halaman." : "Peringatan tampil di halaman; notifikasi sistem belum tersedia.");
    } catch (error) {
      if (signal?.aborted) return;
      setMessage(error instanceof Error ? `Pemantauan belum dapat diperbarui: ${error.message}` : "Pemantauan belum dapat diperbarui.");
    }
  }, [location]);

  useEffect(() => {
    if (!enabled || !location) return;
    const controller = new AbortController();
    const refresh = () => { if (document.visibilityState === "visible") void check(controller.signal); };
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { controller.abort(); window.clearInterval(interval); document.removeEventListener("visibilitychange", refresh); };
  }, [enabled, location, check]);

  useEffect(() => {
    if (!enabled || !location || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(({ coords }) => {
      const next = { latitude: coords.latitude, longitude: coords.longitude };
      if (validLocation(next)) setLocation(current => current && distanceKm(current, next) < 1 ? current : next);
    }, error => { setLocation(null); setLocationStatus(error.code === 1 ? "denied" : "unavailable"); }, { maximumAge: 300_000, timeout: 20_000, enableHighAccuracy: false });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled, location]);

  return <AlertMonitorContext.Provider value={{ enabled, location, locationStatus, notificationPermission, latest, message, start, stop, dismiss: () => setLatest(null) }}>{children}{latest && <div className="global-alert" role="alert"><div><strong>{latest.level === "danger" ? "Gempa kuat dekat lokasi Anda" : "Gempa dalam radius pantauan"}</strong><p>M {latest.event.magnitude.toFixed(1)} · sekitar {Math.round(latest.distanceKm)} km · {latest.event.source} · {latest.event.place}</p><small>Perkiraan berdasarkan magnitudo dan jarak. Ikuti arahan resmi dan kondisi sekitar.</small></div><button type="button" onClick={() => setLatest(null)} aria-label="Tutup peringatan">×</button></div>}</AlertMonitorContext.Provider>;
}

export function useAlertMonitor() {
  const context = useContext(AlertMonitorContext);
  if (!context) throw new Error("AlertMonitorProvider belum tersedia");
  return context;
}
