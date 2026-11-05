"use client";
import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { ClimateMap, type ClimateLayer } from "./climate-map";
import type { HotspotData, WeatherData } from "../_lib/api/climate";
import { useAssistantContext } from "./assistant-context";

const layers: { id: ClimateLayer; label: string }[] = [{ id: "rainfall", label: "Hujan 24 jam" }, { id: "temperature", label: "Suhu" }, { id: "wind", label: "Angin" }, { id: "hotspot", label: "Titik panas" }];
const label = (status?: string) => status === "available" ? "Tersedia" : status === "empty" ? "Respons valid, data kosong" : status === "error" ? "Gagal diperbarui" : status === "not_configured" ? "Belum dikonfigurasi" : "Memuat";
const number = (value?: number | null) => value == null ? "—" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);
const weatherDescription = (code?: number | null) => code == null ? "Kondisi belum tersedia" : [95, 96, 99].includes(code) ? "Prakiraan badai petir" : code >= 80 ? "Prakiraan hujan pancuran" : code >= 51 ? "Prakiraan presipitasi" : code >= 45 ? "Berkabut" : code <= 1 ? "Cerah / sebagian berawan" : "Berawan";

export function ClimatePage() {
  const { setPageContext } = useAssistantContext();
  const [activeLayer, setActiveLayer] = useState<ClimateLayer>("rainfall");
  const [period, setPeriod] = useState("3");
  const [sensor, setSensor] = useState("VIIRS_NOAA20_NRT");
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [locationNote, setLocationNote] = useState("Lokasi contoh Gambir, Jakarta.");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [hotspots, setHotspots] = useState<HotspotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const locate = () => {
    if (!navigator.geolocation) { setLocationNote("Geolokasi tidak didukung; lokasi contoh tetap digunakan."); return; }
    navigator.geolocation.getCurrentPosition(({ coords }) => setCoordinates({ lat: coords.latitude, lon: coords.longitude }), () => setLocationNote("Lokasi tidak tersedia / izin ditolak; lokasi pilihan sebelumnya tetap digunakan."), { timeout: 10000, maximumAge: 300000 });
  };
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => setLoading(true), 0);
    const query = coordinates ? `&lat=${coordinates.lat}&lon=${coordinates.lon}` : "";
    fetch(`/api/v1/climate?days=${period}&sensor=${sensor}${query}`, { signal: controller.signal, cache: "no-store" }).then(async response => {
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.message ?? "Pembaruan gagal.");
      if (controller.signal.aborted) return;
      setWeather(result.data.weather); setHotspots(result.data.hotspots);
      setLocationNote(result.data.locationSelection.note); setError(null);
    }).catch(reason => {
      if (controller.signal.aborted) return;
      setError(reason instanceof Error ? reason.message : "Pembaruan gagal.");
      setWeather(null); setHotspots(null);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [coordinates, period, sensor, refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => setRefresh(value => value + 1), 5 * 60000);
    return () => window.clearInterval(timer);
  }, []);
  const current = weather?.current;
  const rain = weather?.rainfall24h;
  const selectedValue = activeLayer === "rainfall" ? rain?.accumulationMm : activeLayer === "temperature" ? current?.temperatureC : activeLayer === "wind" ? current?.windSpeedMs : null;
  const activeStatus = activeLayer === "hotspot" ? hotspots?.status : weather?.status === "available" && selectedValue == null ? "empty" : weather?.status;
  const value = (id: ClimateLayer) => id === "rainfall" ? `${number(rain?.accumulationMm)} mm / 24 jam` : id === "temperature" ? `${number(current?.temperatureC)} °C` : id === "wind" ? `${number(current?.windSpeedMs)} m/s` : hotspots?.status === "available" || hotspots?.status === "empty" ? `${hotspots.detections.length} deteksi` : "Belum diketahui";
  const formatTime = (time: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: weather?.location.timezone ?? "UTC" }).format(new Date(time));
  useEffect(() => {
    setPageContext({
      title: "Pantau iklim",
      details: JSON.stringify({
        lokasi: weather?.location ?? null,
        cuaca: weather?.current ?? null,
        hujan24Jam: weather?.rainfall24h ?? null,
        statusCuaca: weather?.status ?? null,
        hotspotNASA: hotspots
          ? {
              status: hotspots.status,
              jumlahDeteksi: hotspots.detections.length,
              sensor: hotspots.sensor,
              bbox: hotspots.bbox,
              error: hotspots.error,
              deteksi: hotspots.detections,
            }
          : null,
        catatanLokasi: locationNote,
      }),
      events: [],
    });
  }, [hotspots, locationNote, setPageContext, weather]);
  return (
    <div className="dashboard-shell">
      <Sidebar active="climate" />
      <main className="dashboard-main climate-main">
        <header className="topbar"><div><p className="eyebrow">INDONESIA · KONDISI LINGKUNGAN</p><h1>Pantau Iklim</h1></div><span className="climate-status">Open-Meteo: {label(weather?.status)} · FIRMS: {label(hotspots?.status)}</span></header>
        <section className="climate-intro"><div><p className="eyebrow">PANTAU IKLIM</p><h2>Informasi lingkungan untuk kesiapsiagaan.</h2><p>Cuaca dan prakiraan berbasis model Open-Meteo. Hotspot NASA FIRMS adalah deteksi satelit bukan kebakaran terkonfirmasi.</p></div><div className="climate-source-note"><strong>{loading ? "MEMUAT" : label(activeStatus)}</strong><p>{locationNote}</p><p>{weather?.location.latitude}, {weather?.location.longitude} · {weather?.location.timezone}</p></div></section>
        <section className="climate-source-note" aria-label="Kondisi cuaca"><strong>OPEN-METEO · ESTIMASI MODEL</strong><p>{weatherDescription(current?.weatherCode)} · Suhu {number(current?.temperatureC)} °C · Kelembapan {number(current?.humidityPercent)}% · Angin {number(current?.windSpeedMs)} m/s · Hembusan {number(current?.windGustMs)} m/s</p><p>Kode cuaca dan hembusan adalah indikator kesiapsiagaan, bukan peringatan cuaca ekstrem resmi. Bandingkan dengan peringatan resmi dan kondisi lapangan.</p><p>Waktu model: {current ? formatTime(current.datetime) : "—"} · Diambil: {weather?.fetchedAt ?? "—"} · Cache {weather?.cache ?? "—"} · {weather?.stale ? "Data lama" : "Lihat waktu model"}</p><p role="status">{error ?? weather?.error}</p><button type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Perbarui informasi</button></section>
        <section className="climate-indicators" aria-label="Indikator">{layers.map(layer => <button type="button" key={layer.id} className={`climate-indicator${activeLayer === layer.id ? " active" : ""}`} onClick={() => setActiveLayer(layer.id)}><span>{layer.label}</span><strong>{value(layer.id)}</strong><small>{layer.id === "hotspot" ? `NASA FIRMS · ${label(hotspots?.status)}` : "Open-Meteo · prakiraan/model"}</small></button>)}</section>
        <div className="climate-layout">
          <section className="map-panel climate-panel">
            <div className="section-heading"><h2>{layers.find(layer => layer.id === activeLayer)?.label}</h2><span>{label(activeStatus)}</span></div>
            <div className="climate-controls"><label>Periode prakiraan / hotspot<select value={period} onChange={event => setPeriod(event.target.value)}>{[1, 2, 3, 5, 7, 10].map(days => <option key={days} value={days}>{days} hari</option>)}</select></label><label>Sensor FIRMS<select value={sensor} onChange={event => setSensor(event.target.value)}><option value="VIIRS_NOAA20_NRT">VIIRS NOAA-20 NRT</option><option value="VIIRS_NOAA21_NRT">VIIRS NOAA-21 NRT</option><option value="VIIRS_SNPP_NRT">VIIRS SNPP NRT (dapat tidak tersedia)</option></select></label><button type="button" onClick={locate}>Gunakan lokasi perangkat</button><button type="button" onClick={() => { setCoordinates(null); }}>Lokasi contoh Jakarta</button><button type="button" onClick={() => setCoordinates({ lat: -7.2819, lon: 112.7956 })}>Contoh Surabaya</button></div>
            <p className="panel-caption">Tombol lokasi meminta izin browser untuk membagikan koordinat ke Open-Meteo. Tidak ada pengambilan lokasi otomatis.</p>
            <p className="panel-caption">{hotspots?.error} · Sensor {hotspots?.sensor ?? sensor} · Bbox {hotspots?.bbox ?? "95,-11,141,6"} (mencakup juga area sekitar Indonesia) · Semua confidence l/n/h ditampilkan.</p>
            <p className="panel-caption">Periode FIRMS UTC: {hotspots?.period.start ?? "—"} hingga {hotspots?.period.end ?? "—"} (akhir eksklusif). Terbaru: {hotspots?.latestAcquiredAt ?? "belum diketahui"} · Cache {hotspots?.cache ?? "—"}. Periode 1 hari berarti hari UTC berjalan; coba 3 hari jika data belum masuk.</p>
            <ClimateMap activeLayer={activeLayer} weather={weather} hotspots={hotspots?.detections ?? []} showWeather={selectedValue != null && weather?.status === "available"} showHotspots={activeLayer === "hotspot"} />
            <p className="panel-caption">Titik cuaca mewakili koordinat pilihan, bukan sebaran nasional. Deteksi satelit bukan kebakaran terkonfirmasi. NASA FIRMS diperbarui: {hotspots?.fetchedAt ?? "—"}.</p>
          </section>
          <aside className="climate-detail"><p className="eyebrow">PRAKIRAAN CURAH HUJAN</p><h2>{number(rain?.accumulationMm)} mm / 24 jam</h2><p>{rain ? `${formatTime(rain.start)} – ${formatTime(rain.end)} (${weather?.location.timezone})` : "Periode belum tersedia"}</p><p>Peluang presipitasi maksimum per jam dalam jendela 24 jam: {number(rain?.probabilityMaxPercent)}%. Ini bukan peluang total kejadian hujan selama sehari.</p><p>Akumulasi 24 interval satu jam lengkap mulai jam penuh berikutnya. Cakupan {rain?.completeHours ?? 0}/24 jam; nilai yang hilang ditampilkan —.</p><div className="climate-observation"><strong>AKUMULASI HARIAN LOKAL</strong>{weather?.daily.slice(0, Number(period)).map(day => <p key={day.date}>{formatTime(day.date)} · {number(day.precipitationMm)} mm / hari · Peluang maksimum {number(day.probabilityMaxPercent)}%</p>)}</div><div className="climate-data-source"><strong>SUMBER DATA</strong><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo · CC BY 4.0</a><span>NASA FIRMS · VIIRS</span><p>Nilai merupakan prakiraan/model, bukan pengukuran hujan aktual. Layer kekeringan belum terintegrasi.</p></div></aside>
        </div>
      </main>
    </div>
  );
}
