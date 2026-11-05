# Open-Meteo + NASA FIRMS — 5 November 2026

Keputusan final menggantikan laporan provider sebelumnya. Tidak ada perubahan kode gempa dalam sesi migrasi ini. File gempa sudah memiliki perubahan pengguna/pekerjaan sebelumnya dan tidak ditimpa.

## Perubahan

- app/_lib/api/current-weather.ts: seluruh cuaca, suhu, kelembapan, kode cuaca, angin/hembusan, prakiraan per jam dan harian dari Open-Meteo saja. OpenWeather dan fallback cuaca BMKG dihapus.
- app/_lib/api/climate.ts: provider FIRMS dengan key server-only, status terpisah, parser CSV quoted/BOM/CRLF, HHMM dipadatkan menjadi empat digit, waktu UTC, validasi bbox dan periode. Semua confidence l/n/h dipertahankan, bukan filter numerik yang bisa membuang kategori VIIRS.
- app/api/v1/climate/route.ts: permintaan cuaca/hotspot paralel, default tiga hari NOAA20, pilihan NOAA21/SNPP, validasi sensor/koordinat/periode. Kode adm4 lama ditolak dengan HTTP 400; Open-Meteo menggunakan lat/lon. Tanpa lokasi, contoh Gambir diberi label eksplisit.
- app/_components/climate-page.tsx: model cuaca, periode, peluang hujan, sumber, cache/stale, status sumber, default tiga hari, pilihan sensor, geolokasi hanya melalui tombol dan izin browser. Tidak mengirim koordinat ke reverse geocoder lagi.
- app/_components/climate-map.tsx: GeoJSON [longitude,latitude], titik merah nyata, fitBounds bbox saat layer hotspot dipilih, popup sensor/waktu/confidence/sumber dan disclaimer.
- .env.example: NASA_FIRMS_MAP_KEY server-only; konfigurasi OpenWeather dihapus dari contoh. Entri OpenWeather lokal ternyata sudah berubah sejak sesi sebelumnya, sehingga nilainya tidak dibaca/ditampilkan/ditimpa. Bila masih ada, entri itu tidak lagi dibaca kode aplikasi dan dapat dihapus pengguna. Key FIRMS lokal tersedia dan tidak diubah/dicetak.
- app/_lib/api/climate-location.ts: resolver adm4 cuaca yang tidak lagi dipakai dihapus. Integrasi gempa BMKG+USGS tetap menggunakan jalurnya sendiri.

## Hujan dan waktu

Akumulasi dihitung dari tepat 24 interval presipitasi satu jam. Timestamp presipitasi Open-Meteo menunjukkan akhir interval satu jam sebelumnya: gunakan timestamp > awal hingga <= akhir. Awal adalah jam penuh berikutnya, akhir 24 jam kemudian. Semua 24 nilai wajib tersedia; satu null membuat akumulasi null. Nol asli tetap nol. Peluang ditampilkan sebagai maksimum peluang presipitasi per jam dalam jendela, bukan probabilitas total kejadian hujan 24 jam. Akumulasi kalender harian lokal ditampilkan terpisah dari jendela bergulir. Unix timestamp upstream dipetakan ke UTC dan diformat sesuai timezone lokasi pada UI.

Cache cuaca lima menit, cache lama maksimal enam jam dengan penanda stale bila pembaruan gagal. Cache FIRMS lima menit, error 30 detik, dipisah sensor/periode/tanggal UTC. Respons cache mempertahankan fetchedAt asli. Respons error tidak dihitung sebagai nol deteksi. Diagnostik server hanya status, content type, ukuran, durasi, jenis endpoint, sensor, bbox, tanggal, jumlah dan filter confidence; tanpa key, URL rahasia atau body error mentah.

## Bukti upstream FIRMS aktual

Key status: HTTP 200, transaction_limit 5000 dan current_transactions 0. Ini membuktikan status key/kuota, bukan keberadaan deteksi.

Semua pengujian area memakai bbox 95,-11,141,6 dan HTTP 200, content type text/plain;charset=UTF-8, header latitude/longitude/acq_date/acq_time/confidence/satellite valid.

| Sensor | 1 hari | 2 hari | 3 hari |
| --- | ---: | ---: | ---: |
| VIIRS_NOAA20_NRT | 0 | 2800 | 5630 |
| VIIRS_NOAA21_NRT | 0 | 2958 | 5087 |
| VIIRS_SNPP_NRT | 0 | 0 | 0 |

NOAA20/21 periode dua hari hanya berisi 4 November; tiga hari berisi 3–4 November. Hari UTC berjalan 5 November belum berisi deteksi pada saat pengujian. Inilah penyebab terverifikasi label kosong untuk days=1 pada sesi ini; bukan kegagalan key. SNPP kosong sepanjang jendela yang diuji. NASA mengumumkan penghentian pengiriman Suomi-NPP mulai 2 November 2026 dan menyarankan NOAA20/21; tidak dipakai sebagai default.

Route days=3 NOAA20: available, 5630 deteksi; terbaru 2026-11-04T19:08:00Z. Contoh nyata: latitude -4.88338, longitude 105.63855, confidence n, satellite N20, VIIRS, frp 2.38. NOAA21: available, 5087 deteksi, terbaru 2026-11-04T18:13:00Z. SNPP: empty, CSV valid. Tidak menggabungkan dua sensor sebagai hitungan kejadian kebakaran unik.

Bbox mencakup pula wilayah negara sekitar; UI menyatakan cakupan bbox, bukan mengklaim polygon administratif Indonesia. Deteksi satelit bukan kebakaran terkonfirmasi.

## Bukti cuaca dan verifikasi

- Gambir: Open-Meteo available, model 2026-11-05T02:45:00Z, 32.9°C, RH49%, angin1.8 m/s, hembusan6.5 m/s. Hujan24h 1.8 mm dengan peluang maksimum94%, 24/24 interval, 5 November10.00 hingga 6 November10.00 WIB.
- Koordinat contoh Surabaya (-7.2819,112.7956): 33.9°C, RH45%, angin2.89 m/s, hembusan8.3 m/s; hujan24h0.2 mm, peluang maksimum35%, 24/24 interval. Bukan koordinat perangkat pengguna.
- days=6, lat=999 dan sensor=bogus: HTTP400. Endpoint gempa: HTTP200; tidak mengubah kode/adapter gempa.
- Uji shell adapter: batas24h, akumulasi24 interval, null versus nol, peluang hilang, weather malformed, CSV header-only/BOM/CRLF, jam442 menjadi04:42, confidence l tidak dibuang, koordinat/tanggal/kutip invalid, key absen, HTTP200 berisi teks error, HTTP401/429/503, respons tanpa secret: lulus.
- Browser: halaman memuat data; tombol Titik panas memperlihatkan 5630 deteksi dan sebaran titik merah nyata pada peta MapLibre. Tampilan dark/red terjaga. Tidak menekan tombol izin lokasi perangkat saat audit.
- Lint, tsc --noEmit --incremental false, build produksi: lulus. Bukti HTTP dan browser menggunakan server dev yang sudah berjalan pada port3000.

## Referensi

- https://open-meteo.com/en/docs
- https://firms.modaps.eosdis.nasa.gov/api/area/
- https://firms.modaps.eosdis.nasa.gov/content/notifications/firms/news.html

Jika key FIRMS dihapus kemudian: isi NASA_FIRMS_MAP_KEY hanya di .env.local server dan mulai ulang proses. Jangan memakai NEXT_PUBLIC_ atau membagikan key di chat. Key yang pernah dibagikan sebaiknya dirotasi oleh pemilik akun.
