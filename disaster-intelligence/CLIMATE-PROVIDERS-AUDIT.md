# Audit migrasi provider — 5 November 2026

## SIPONGI

Situs resmi saat ini: https://sipongi.gakkum.kehutanan.go.id/ (Kementerian Kehutanan). GET homepage dan robots.txt: HTTP 200. Robots mengizinkan crawler, tetapi itu bukan izin redistribusi data. Halaman disclaimer https://sipongi.gakkum.kehutanan.go.id/disclaimer-ft memuat batas penggunaan dan penyalinan/pemindahan konten. Audit halaman resmi, peta, kebijakan privasi, disclaimer dan pencarian dokumentasi tidak menemukan kontrak API publik stabil yang dapat diverifikasi beserta izin penggunaan ulang dan skema koordinat/waktu/metadata. Ini tidak membuktikan tidak ada API internal atau akses kerja sama.

Karena itu tidak ada scraping maupun endpoint yang ditebak. Adapter getSipongiHotspots mengembalikan not_configured, jumlah belum diketahui dan tautan peta resmi ditampilkan. NASA FIRMS dihapus dari kode aplikasi dan UI. Untuk integrasi data SIPONGI diperlukan akses resmi, dokumentasi endpoint, skema dan persetujuan pemanfaatan dari pengelola.

## Cuaca

- app/_lib/api/current-weather.ts: adapter OpenWeather Current Weather API, fallback estimasi model Open-Meteo, cache lama maksimum enam jam jika kedua sumber gagal, lalu prakiraan BMKG terdekat bila wilayahnya dekat. Prakiraan BMKG tetap tersedia terpisah. Tidak ada angka sintetis ketika semua sumber gagal.
- app/_lib/api/climate.ts: BMKG dipertahankan; adapter hotspot berstatus belum terhubung menggantikan NASA.
- app/api/v1/climate/route.ts: mengembalikan currentWeather terpisah dari prakiraan BMKG dan status hotspot; memvalidasi input lokasi.
- app/_components/climate-page.tsx: lokasi dengan tombol/izin browser, penjelasan penerima koordinat, sumber, waktu UTC ISO, cache hit/miss/stale, alasan fallback, model versus current versus forecast. Pembaruan otomatis lima menit dan tombol manual. Gaya dark/red menggunakan kelas yang sudah ada.
- app/_components/climate-map.tsx: teks sumber diperbarui menjadi SIPONGI.
- .env.example dan .env.local: entri OPENWEATHER_API_KEY kosong untuk diisi kunci baru oleh pengguna; tidak menggunakan kunci yang dibagikan di chat. .env.local diabaikan Git. Kunci NASA lama tidak dipakai lagi, tidak diubah saat audit ini.
- Cache cuaca lima menit, maksimum 256 lokasi per proses; bukan penyimpanan persisten/distribusi lintas instance. Stale berdasarkan umur data lebih dari 90 menit atau pemakaian cache lama saat upstream gagal. Cache BMKG 15 menit, kegagalan 30 detik.

Dokumentasi: https://openweathermap.org/api/current dan https://open-meteo.com/en/docs . OpenWeather memakai units=metric; hujan 1 jam yang tidak dilaporkan tetap null. Open-Meteo mengembalikan interval 900 detik pada pengujian, nilai presipitasi tidak diberi label total harian. Open-Meteo ditandai estimasi model, atribusi CC BY 4.0; tinjau paket/lisensi layanan bila proyek digunakan komersial.

## Bukti pengujian

- /api/v1/climate?adm4=31.71.01.1001&days=1: HTTP 200; BMKG available, Open-Meteo available (model), suhu 32.5°C, RH 50%, angin 1.05 m/s, presipitasi 0 mm/900 detik. Waktu model 2026-11-05T02:15Z. Permintaan kedua cache hit dengan fetchedAt tetap.
- Koordinat contoh publik Surabaya (-7.2819,112.7956): HTTP 200; Open-Meteo available, 33.6°C, RH 44%, angin 2.33 m/s. Bukan lokasi perangkat pengguna.
- SIPONGI pada kedua respons: not_configured, detections kosong sebagai wadah, UI menyatakan jumlah belum diketahui; tidak diklaim zero detections.
- days=6 dan lat=999: HTTP 400.
- /api/v1/earthquakes: HTTP 200. Kode gempa tidak diedit dalam migrasi ini; respons HTTP tidak membuktikan seluruh interaksi peta berfungsi.
- Uji shell adapter dengan mock: parsing OpenWeather, hujan absen/null versus nol, cache hit, HTTP 401 ke Open-Meteo, semua upstream gagal ke BMKG hanya jika dekat, semua sumber tidak tersedia, stale-cache, respons tidak membawa kunci: lulus.
- npm run lint, npx tsc --noEmit --incremental false, npm run build: lulus.

OpenWeather live belum diuji karena kunci baru belum dikonfigurasi. Rotasi kunci yang pernah dibagikan, isi OPENWEATHER_API_KEY di .env.local dan mulai ulang server. Uji WebGL/izin lokasi secara visual belum dilakukan; tidak membaca koordinat perangkat selama audit. Tidak ada perubahan fitur gempa, commit atau publikasi.
