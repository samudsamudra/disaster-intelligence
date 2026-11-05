# Audit lanjutan climate — 5 November 2026

Laporan ini mencatat pengujian sesi audit lanjutan; laporan CLIMATE-AUDIT.md berasal dari pekerjaan sebelumnya.

## Bukti upstream dan endpoint

- FIRMS area/csv, bbox 95,-11,141,6, periode 1 hari: SNPP, NOAA20 dan NOAA21 semuanya HTTP 200, CSV berheader valid tanpa baris deteksi. Status kuota bukan bukti isi endpoint area.
- NOAA20 periode 3 hari: HTTP 200, 5630 baris; 5 hari: HTTP 200, 9351 baris.
- Endpoint lokal port 3000: 1 hari empty/0; 3 hari available/5630; 7 hari available/13361; 10 hari available/20246. Periode 7/10 dibagi permintaan maksimal 5 hari, tanggal UTC eksplisit, validasi waktu terhadap setiap potongan.
- BMKG Gambir HTTP 200: dua nilai tp awal 0 dan 0.4. Nol asli dipertahankan; null tidak dikonversi menjadi nol. Nilai tp ditampilkan pada waktu prakiraan, bukan total harian. Dokumentasi publik menjelaskan frekuensi prakiraan 3 jam, tetapi tidak mendefinisikan interval akumulasi tp; UI menyatakan keterbatasan ini.
- Koordinat contoh publik Surabaya (-7.2819,112.7956) dipetakan ke Keputih 35.78.09.1001; endpoint mengembalikan prakiraan BMKG lokal available.
- days=6 dan lat=999 menghasilkan HTTP 400.
- Pengujian shell dengan mock: CSV header-only/BOM, koordinat/waktu/baris rusak, HTTP 503, teks error berstatus 200, tp null/0/0.4, UTC, konversi angin km/jam ke m/s: lulus.
- Lint, tsc --noEmit --incremental false dan build produksi: lulus. Tidak ada test runner terkonfigurasi.

## Perbaikan dan batas

- Sensor aktif diganti NOAA20. NASA mengumumkan penghentian pengiriman Suomi-NPP pada 2 November 2026. Ketiga sensor sama-sama kosong pada satu hari saat pengujian, jadi pergantian sensor tidak membuktikan penyebab tunggal kosongnya hari tersebut.
- Error upstream tidak ditampilkan sebagai nol deteksi. CSV valid tanpa data tetap empty; status per sumber terpisah dari HTTP agregator.
- Diagnostik server mencatat status HTTP, tipe respons, ukuran, durasi, sensor, bbox, periode, jumlah dan cache hit tanpa URL/key/body rahasia. Cache sukses 15 menit, error 30 detik; cache FIRMS dibedakan tanggal UTC dan sensor.
- Pemetaan lokasi hanya setelah tombol perangkat ditekan dan izin browser diberikan, melalui Nominatim + hierarki wilayah.id. Pengguna menyetujui alur tersebut pada sesi ini. Nama ambigu/koneksi gagal menggunakan fallback Gambir yang dijelaskan. Pencocokan nama bukan uji polygon batas wilayah dan dapat gagal pada variasi penamaan.
- Peta memvalidasi koordinat, berpusat pada wilayah lokal, dan popup memakai teks aman.
- Interaksi izin geolokasi dan WebGL belum diverifikasi secara visual di browser. Koordinat perangkat pengguna tidak dibaca saat audit.
- MAP_KEY tidak diubah atau dicetak. Karena pernah dibagikan, rotasi melalui NASA FIRMS dan perbarui konfigurasi server sendiri.

## Referensi

- https://firms.modaps.eosdis.nasa.gov/api/area/
- https://firms.modaps.eosdis.nasa.gov/content/notifications/firms/news.html
- https://data.bmkg.go.id/prakiraan-cuaca/
- https://wilayah.id/
