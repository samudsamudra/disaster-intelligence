"use client";

import { useEffect, useState } from "react";

type PermissionState = NotificationPermission | "unsupported";
type Scenario = "warning" | "danger";

const scenarios: Record<Scenario, { title: string; body: string }> = {
  warning: {
    title: "SIMULASI · Peringatan waspada",
    body: "Uji notifikasi radius waspada. Ini hanya simulasi, bukan kejadian gempa atau peringatan resmi.",
  },
  danger: {
    title: "SIMULASI · Peringatan bahaya",
    body: "Uji notifikasi radius bahaya. Ini hanya simulasi, bukan kejadian gempa atau peringatan resmi.",
  },
};

export function AlertNotificationTest() {
  const [permission, setPermission] = useState<PermissionState>("unsupported");
  const [message, setMessage] = useState("Aktifkan notifikasi untuk mencoba dua tingkat peringatan.");

  useEffect(() => {
    queueMicrotask(() => setPermission(window.isSecureContext && "Notification" in window ? Notification.permission : "unsupported"));
  }, []);

  async function enableNotifications() {
    if (!window.isSecureContext || !("Notification" in window)) {
      setPermission("unsupported");
      setMessage("Notifikasi browser memerlukan HTTPS atau localhost dan browser yang mendukung.");
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setMessage(result === "granted" ? "Izin aktif. Pilih salah satu simulasi di bawah." : result === "denied" ? "Izin ditolak. Ubah izin notifikasi di pengaturan situs untuk mencoba lagi." : "Izin belum diberikan. Tekan Aktifkan notifikasi untuk mencoba lagi.");
    } catch {
      setMessage("Browser tidak dapat meminta izin notifikasi saat ini.");
    }
  }

  function sendTest(scenario: Scenario) {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      setPermission("Notification" in window ? Notification.permission : "unsupported");
      setMessage("Izin notifikasi belum aktif. Aktifkan izin situs lebih dahulu.");
      return;
    }
    try {
      const { title, body } = scenarios[scenario];
      const notification = new Notification(title, { body, tag: `pantaubencana-test-${scenario}` });
      notification.onclick = () => { window.focus(); notification.close(); };
      setMessage(`Notifikasi simulasi ${scenario === "danger" ? "bahaya" : "waspada"} dikirim. Periksa notifikasi browser atau sistem perangkat.`);
    } catch {
      setMessage("Browser tidak dapat menampilkan notifikasi. Periksa pengaturan notifikasi situs dan sistem perangkat.");
    }
  }

  return <section className="alert-test-panel" aria-labelledby="alert-test-title">
    <div className="alert-test-heading"><div><p className="eyebrow">LAB PENGUJIAN · BUKAN PERINGATAN NYATA</p><h2 id="alert-test-title">Coba notifikasi browser</h2></div><span className="alert-test-badge">SIMULASI</span></div>
    <p>Periksa tampilan notifikasi untuk tingkat waspada dan bahaya. Tombol ini tidak memakai lokasi atau mengirim data ke layanan lain.</p>
    <div className="alert-test-actions"><button type="button" onClick={enableNotifications} disabled={permission === "granted"}>{permission === "granted" ? "Notifikasi aktif" : "Aktifkan notifikasi"}</button><button type="button" onClick={() => sendTest("warning")} disabled={permission !== "granted"}>Uji waspada</button><button type="button" className="alert-test-danger" onClick={() => sendTest("danger")} disabled={permission !== "granted"}>Uji bahaya</button></div>
    <p className="alert-test-status" role="status">{message}</p>
  </section>;
}
