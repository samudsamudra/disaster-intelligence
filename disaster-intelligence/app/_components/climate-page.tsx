"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "./sidebar";
import { ClimateMap, type ClimateLayer } from "./climate-map";
import type { HotspotData, WeatherData } from "../_lib/api/climate";
import { useAssistantContext } from "./assistant-context";
import { formatIndonesiaTime } from "../_lib/indonesia-time";
import { WeatherGlyph } from "./weather-glyph";

const layers: { id: ClimateLayer; label: string }[] = [{ id: "rainfall", label: "Hujan 24 jam" }, { id: "temperature", label: "Suhu" }, { id: "wind", label: "Angin" }, { id: "hotspot", label: "Titik panas" }];
const label = (status?: string) => status === "location_required" ? "Aktifkan lokasi" : status === "available" ? "Tersedia" : status === "empty" ? "Respons valid, data kosong" : status === "error" ? "Gagal diperbarui" : status === "not_configured" ? "Belum dikonfigurasi" : "Memuat";
const number = (value?: number | null) => value == null ? "—" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);
const weatherDescription = (code?: number | null) => code == null ? "Kondisi belum tersedia" : [95, 96, 99].includes(code) ? "Prakiraan badai petir" : (code >= 71 && code <= 77 || code === 85 || code === 86) ? "Prakiraan salju" : code >= 80 ? "Prakiraan hujan pancuran" : code >= 51 ? "Prakiraan hujan" : code >= 45 ? "Berkabut" : code <= 1 ? "Cerah / sebagian berawan" : "Berawan";
const formatDailyDate = (day: string, timezone: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: timezone }).format(new Date(day));

export function ClimatePage() {
  const { setPageContext } = useAssistantContext();
  const [activeLayer, setActiveLayer] = useState<ClimateLayer>("rainfall");
  const [period, setPeriod] = useState("3");
  const [sensor, setSensor] = useState("VIIRS_NOAA20_NRT");
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [locationNote, setLocationNote] = useState("Aktifkan lokasi untuk melihat cuaca di sekitar Anda.");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [hotspots, setHotspots] = useState<HotspotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locationAutoLoading, setLocationAutoLoading] = useState(true);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [placeState, setPlaceState] = useState<"idle" | "loading" | "available" | "error">("idle");
  const placeRequestRef = useRef(0);
  const lookupPlace = useCallback((lat: number, lon: number) => {
    const requestId = ++placeRequestRef.current;
    setPlaceName(null);
    setPlaceState("loading");
    fetch("/api/v1/location-name", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lat, lon }), cache: "no-store" })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success || typeof result.data?.name !== "string") throw new Error("Nama wilayah belum tersedia.");
        if (placeRequestRef.current !== requestId) return;
        setPlaceName(result.data.name);
        setPlaceState("available");
      })
      .catch(() => { if (placeRequestRef.current === requestId) setPlaceState("error"); });
  }, []);
  const locate = () => {
    if (!window.isSecureContext) { setLocationNote("Akses lokasi memerlukan HTTPS atau localhost. Buka situs melalui HTTPS terlebih dahulu."); return; }
    if (!navigator.geolocation) { setLocationNote("Geolokasi tidak didukung browser ini. Cuaca lokal memerlukan akses lokasi."); return; }
    setLocating(true);
    setLocationNote("Mencari lokasi perangkat untuk mengambil cuaca Open-Meteo...");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setCoordinates({ lat: coords.latitude, lon: coords.longitude });
      lookupPlace(coords.latitude, coords.longitude);
      setLocationNote("Cuaca mengikuti lokasi perangkat Anda. Titik panas mencakup Indonesia.");
      setLocating(false);
    }, (reason) => {
      setLocating(false);
      setLocationNote(reason.code === 1 ? "Izin lokasi ditolak. Izinkan lokasi pada pengaturan situs di browser, lalu coba kembali." : reason.code === 3 ? "Pencarian lokasi melewati batas waktu. Pastikan lokasi perangkat aktif, lalu coba kembali." : "Posisi perangkat belum tersedia. Aktifkan layanan lokasi perangkat dan coba kembali.");
    }, { timeout: 20000, maximumAge: 300000 });
  };
  useEffect(() => {
    let mounted = true;
    let permission: PermissionStatus | undefined;
    const readGrantedLocation = () => {
      if (!mounted) return;
      if (permission?.state !== "granted") {
        setLocationAutoLoading(false);
        ++placeRequestRef.current;
        setCoordinates(null);
        setPlaceName(null);
        setPlaceState("idle");
        setLocationNote(permission?.state === "denied" ? "Izin lokasi diblokir di browser. Ubah izin situs jika ingin melihat cuaca lokal." : "Aktifkan lokasi sekali untuk melihat cuaca di sekitar Anda.");
        return;
      }
      setLocationAutoLoading(true);
      setLocationNote("Membaca lokasi yang sudah diizinkan...");
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        if (!mounted) return;
        setLocationAutoLoading(false);
        setCoordinates({ lat: coords.latitude, lon: coords.longitude });
        lookupPlace(coords.latitude, coords.longitude);
        setLocationNote("Cuaca mengikuti lokasi perangkat Anda. Titik panas mencakup Indonesia.");
      }, () => {
        if (mounted) { setLocationAutoLoading(false); setLocationNote("Izin tersedia, tetapi posisi belum ditemukan. Periksa layanan lokasi perangkat, lalu coba lagi."); }
      }, { timeout: 20000, maximumAge: 300000 });
    };
    if (window.isSecureContext && navigator.permissions && navigator.geolocation) {
      navigator.permissions.query({ name: "geolocation" }).then(result => {
        if (!mounted) return;
        permission = result;
        permission.addEventListener("change", readGrantedLocation);
        readGrantedLocation();
      }).catch(() => { if (mounted) setLocationAutoLoading(false); });
    } else queueMicrotask(() => { if (mounted) setLocationAutoLoading(false); });
    return () => { mounted = false; permission?.removeEventListener("change", readGrantedLocation); };
  }, [lookupPlace]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => setLoading(true), 0);
    const query = coordinates ? `&lat=${coordinates.lat}&lon=${coordinates.lon}` : "";
    fetch(`/api/v1/climate?days=${period}&sensor=${sensor}${query}`, { signal: controller.signal, cache: "no-store" }).then(async response => {
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.message ?? "Pembaruan gagal.");
      if (controller.signal.aborted) return;
      setWeather(result.data.weather); setHotspots(result.data.hotspots);
      setError(null);
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
  const activeStatus = !coordinates && activeLayer !== "hotspot" ? "location_required" : activeLayer === "hotspot" ? hotspots?.status : weather?.status === "available" && selectedValue == null ? "empty" : weather?.status;
  const value = (id: ClimateLayer) => id === "rainfall" ? `${number(rain?.accumulationMm)} mm / 24 jam` : id === "temperature" ? `${number(current?.temperatureC)} °C` : id === "wind" ? `${number(current?.windSpeedMs)} m/s` : hotspots?.status === "available" || hotspots?.status === "empty" ? `${hotspots.detections.length} deteksi` : "Belum diketahui";
  const formatTime = (time: string) => formatIndonesiaTime(time, weather?.location.timezone ?? "Asia/Jakarta");
  const sensorName = (hotspots?.sensor ?? sensor).replaceAll("_", " ").replace("NOAA20", "NOAA-20").replace("NOAA21", "NOAA-21");
  const cacheLabel = (cache?: string) => cache === "hit" ? "Data tersimpan sementara" : cache === "miss" ? "Data baru diambil" : "Status pembaruan belum tersedia";
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
              jumlahDeteksi: hotspots.status === "available" || hotspots.status === "empty" ? hotspots.detections.length : null,
              sensor: hotspots.sensor,
              bbox: hotspots.bbox,
              error: hotspots.error,
              terbaru: hotspots.latestAcquiredAt,
              sampelDeteksi: hotspots.detections.slice(0, 10),
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
        <header className="topbar"><div><p className="eyebrow">INDONESIA · KONDISI LINGKUNGAN</p><h1>Pantau Iklim</h1></div><span className="climate-status">Open-Meteo: {coordinates ? label(weather?.status) : "Aktifkan lokasi"} · FIRMS: {label(hotspots?.status)}</span></header>
        <section className="climate-intro"><div><p className="eyebrow">PANTAU IKLIM</p><h2>Informasi lingkungan untuk kesiapsiagaan.</h2><p>Cuaca dan prakiraan berbasis model Open-Meteo. Hotspot NASA FIRMS adalah deteksi satelit bukan kebakaran terkonfirmasi.</p></div><div className="climate-source-note"><strong>LOKASI PERANGKAT</strong><p>{locationNote}</p>{weather?.status === "available" && <p>Zona waktu: {weather.location.timezone}</p>}</div></section>
        <section className="climate-source-note" aria-label="Kondisi cuaca">
          {!coordinates && <div className="weather-location-prompt"><h2>Cuaca di sekitar Anda</h2><p>{locationAutoLoading ? "Membaca lokasi yang sudah diizinkan..." : "Izinkan lokasi untuk melihat suhu, kondisi langit, dan prakiraan hujan lokal."}</p>{!locationAutoLoading && <button type="button" disabled={locating} onClick={locate}>{locating ? "Mencari lokasi..." : "Aktifkan lokasi saya"}</button>}</div>}
          <div className="weather-card">
            <div className="weather-card-icon"><WeatherGlyph code={current?.weatherCode} label={weatherDescription(current?.weatherCode)} /><small>Prakiraan cuaca</small></div>
            <div className="weather-card-details"><span className="eyebrow">OPEN-METEO · ESTIMASI MODEL</span><p className="weather-place" role="status">{placeName ?? (placeState === "loading" ? "Mencari nama wilayah..." : coordinates ? "Cuaca untuk lokasi perangkat Anda; nama wilayah belum tersedia." : "Lokasi belum diaktifkan.")}</p>{placeName && <a className="weather-place-source" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">Perkiraan nama wilayah · OpenStreetMap</a>}<h2>{weatherDescription(current?.weatherCode)}</h2><dl className="weather-facts"><div><dt>Suhu</dt><dd>{number(current?.temperatureC)} °C</dd></div><div><dt>Kelembapan</dt><dd>{number(current?.humidityPercent)}%</dd></div><div><dt>Angin</dt><dd>{number(current?.windSpeedMs)} m/s</dd></div><div><dt>Hembusan</dt><dd>{number(current?.windGustMs)} m/s</dd></div></dl></div>
          </div>
          <p>Kondisi ini adalah prakiraan, bukan peringatan cuaca ekstrem resmi. Periksa peringatan resmi dan kondisi sekitar.</p>
          <p>Waktu prakiraan: {current ? formatTime(current.datetime) : "Belum tersedia"} · Diperbarui: {weather?.fetchedAt ? formatTime(weather.fetchedAt) : "Belum tersedia"} · {weather?.stale ? "Data lama" : cacheLabel(weather?.cache)}</p>
          <p role="status">{error ?? weather?.error}</p><button type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Perbarui informasi</button>
        </section>
        <section className="climate-indicators" aria-label="Indikator">{layers.map(layer => <button type="button" key={layer.id} className={`climate-indicator${activeLayer === layer.id ? " active" : ""}`} onClick={() => setActiveLayer(layer.id)}><span>{layer.label}</span><strong>{value(layer.id)}</strong><small>{layer.id === "hotspot" ? `NASA FIRMS · ${label(hotspots?.status)}` : "Open-Meteo · prakiraan/model"}</small></button>)}</section>
        <div className="climate-layout">
          <section className="map-panel climate-panel">
            <div className="section-heading"><h2>{layers.find(layer => layer.id === activeLayer)?.label}</h2><span>{label(activeStatus)}</span></div>
            <div className="climate-controls"><label>Periode prakiraan / hotspot<select value={period} onChange={event => setPeriod(event.target.value)}>{[1, 2, 3, 5, 7, 10].map(days => <option key={days} value={days}>{days} hari</option>)}</select></label><label>Sensor FIRMS<select value={sensor} onChange={event => setSensor(event.target.value)}><option value="VIIRS_NOAA20_NRT">VIIRS NOAA-20 NRT</option><option value="VIIRS_NOAA21_NRT">VIIRS NOAA-21 NRT</option><option value="VIIRS_SNPP_NRT">VIIRS SNPP NRT (dapat tidak tersedia)</option></select></label></div>
            <p className="panel-caption">Lokasi hanya digunakan setelah izin browser diberikan. Jika sudah diizinkan, cuaca lokal dimuat otomatis.</p>
            {activeLayer === "hotspot" && <div className="firms-info"><dl className="firms-summary"><div><dt>Satelit</dt><dd>{sensorName}</dd></div><div><dt>Wilayah pantauan</dt><dd>Indonesia dan sekitarnya</dd></div><div><dt>Periode pencarian</dt><dd>{hotspots?.period ? `${formatTime(hotspots.period.start)} sampai ${formatTime(hotspots.period.end)} (batas akhir)` : "Belum tersedia"}</dd></div><div><dt>Deteksi terbaru</dt><dd>{hotspots?.latestAcquiredAt ? formatTime(hotspots.latestAcquiredAt) : hotspots?.status === "empty" ? "Belum ada deteksi pada periode ini" : "Belum tersedia"}</dd></div><div><dt>Pembaruan</dt><dd>{hotspots?.fetchedAt ? formatTime(hotspots.fetchedAt) : "Belum tersedia"} · {cacheLabel(hotspots?.cache)}</dd></div></dl><p className="panel-caption" role="status">{hotspots?.error}</p><details className="firms-technical"><summary>Detail data satelit</summary><p>Cakupan koordinat: {hotspots?.bbox ?? "95,-11,141,6"}. Tingkat keyakinan rendah, sedang, dan tinggi ditampilkan. Periode satu hari mengikuti hari UTC; pilih tiga hari untuk melihat deteksi sebelumnya.</p></details></div>}
            <ClimateMap activeLayer={activeLayer} weather={weather} hotspots={hotspots?.detections ?? []} showWeather={selectedValue != null && weather?.status === "available"} showHotspots={activeLayer === "hotspot"} />
            <p className="panel-caption">{activeLayer === "hotspot" ? "Titik merah adalah deteksi satelit, bukan kebakaran terkonfirmasi. Pilih titik untuk melihat rinciannya." : "Titik cuaca menunjukkan lokasi perangkat yang diizinkan."}</p>
          </section>
          <aside className="climate-detail">
            {activeLayer === "hotspot" ? <><p className="eyebrow">MEMBACA PETA TITIK PANAS</p><h2>{hotspots?.status === "available" || hotspots?.status === "empty" ? `${hotspots.detections.length} deteksi satelit` : "Data belum tersedia"}</h2><p>Titik merah menunjukkan panas yang terdeteksi satelit dalam periode pilihan. Titik ini belum tentu kebakaran; periksa informasi resmi dan kondisi lapangan.</p><div className="climate-data-source"><strong>SUMBER DATA</strong><span>NASA FIRMS · VIIRS</span><p>{hotspots?.latestAcquiredAt ? `Deteksi terbaru: ${formatTime(hotspots.latestAcquiredAt)}` : "Waktu deteksi terbaru belum tersedia."}</p></div></> : !coordinates ? <><p className="eyebrow">CUACA LOKAL</p><h2>Aktifkan lokasi untuk melihat prakiraan</h2><p>Suhu, hujan, dan angin akan ditampilkan untuk area perangkat setelah Anda memberi izin lokasi.</p></> : <><p className="eyebrow">PRAKIRAAN HUJAN 24 JAM</p><h2>{rain?.accumulationMm == null ? "Prakiraan belum lengkap" : `${number(rain.accumulationMm)} mm / 24 jam`}</h2><p>{rain ? `${formatTime(rain.start)} – ${formatTime(rain.end)}` : "Periode belum tersedia"}</p><p>{rain?.probabilityMaxPercent == null ? "Peluang hujan per jam belum tersedia." : `Peluang hujan tertinggi dalam satu jam: ${number(rain.probabilityMaxPercent)}%. Angka ini bukan peluang hujan sepanjang hari.`}</p><p>{rain?.completeHours === 24 ? "Prakiraan mencakup 24 jam penuh." : `Prakiraan baru tersedia untuk ${rain?.completeHours ?? 0} dari 24 jam; total hujan belum bisa dihitung.`}</p><div className="climate-observation"><strong>PRAKIRAAN HUJAN HARIAN</strong>{weather?.daily.slice(0, Number(period)).map(day => <p key={day.date}>{formatDailyDate(day.date, weather.location.timezone)} · {number(day.precipitationMm)} mm · Peluang hujan tertinggi per jam {number(day.probabilityMaxPercent)}%</p>)}</div><div className="climate-data-source"><strong>SUMBER DATA</strong><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo · CC BY 4.0</a><p>Nilai merupakan prakiraan/model, bukan pengukuran hujan aktual.</p></div></>}
          </aside>
        </div>
      </main>
    </div>
  );
}
