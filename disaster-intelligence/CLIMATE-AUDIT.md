# PantauBencana: audit iklim dan navigasi

## Perubahan

File yang diubah/ditambahkan: `app/_components/sidebar.tsx`, `app/_components/dashboard-shell.tsx`, `app/_components/alerts-page.tsx`, `app/_components/climate-page.tsx`, `app/_components/climate-map.tsx`, `app/_lib/api/climate.ts`, `app/about/page.tsx`, `app/globals.css`, `public/logos/its.png`, `public/logos/upnvjt.png`, `.env.local`, dan laporan ini.

- Semua halaman memakai `app/_components/sidebar.tsx` untuk logo, ikon, urutan menu, active state, dan footer yang sama.
- Menu `/about` memuat nama serta afiliasi kedua developer, dua logo kampus, dan satu frame placeholder foto bersama.
- Tombol lonceng tanpa aksi di header homepage dihapus.
- BMKG tetap diakses di server. Timeout mencakup pembacaan response body; respons upstream tidak disimpan dalam cache fetch Next. Cache aplikasi 15 menit dan cache kegagalan 30 detik tetap berlaku.
- Prakiraan diurutkan berdasarkan waktu UTC. UI memakai interval prakiraan yang masih relevan pada saat pengambilan data, memformat angka Indonesia satu desimal, dan mengonversi angin km/jam ke m/s.
- Curah hujan adalah `tp` prakiraan pada waktu tertera, bukan observasi aktual atau total harian. BMKG menyediakan horizon hingga tiga hari; periode lebih panjang berlaku untuk deteksi hotspot.
- Peta cuaca menampilkan titik lokasi prakiraan, bukan interpolasi cakupan nasional. Layer kekeringan tidak menampilkan titik cuaca. Indikator tanpa nilai tidak mendapat marker cuaca.
- NASA FIRMS memakai `NASA_FIRMS_MAP_KEY` server-only. Tanpa key, respons `not_configured` dan daftar deteksi kosong. Keberhasilan BMKG tidak mengubah status NASA menjadi aktif.

## Verifikasi langsung, 5 November 2026

- Lint, TypeScript, dan build produksi berhasil.
- `/`, `/climate`, `/alerts`, `/about`, dan kedua file logo: HTTP 200.
- `/api/v1/climate`: success, BMKG available, Gambir, 21 prakiraan nyata. NASA not_configured.
- Kode adm4 invalid dan days=4: HTTP 400.
- `/api/v1/earthquakes`: HTTP 200.
- POST `/api/v1/assistant` dengan body kosong: HTTP 400. Generasi AI berbayar tidak diuji.
- `/api/v1/map/events`: HTTP 200. `/api/v1/map/overview`: timeout pada percobaan dengan batas 12 dan 20 detik; koneksi/query database belum terverifikasi berhasil untuk overview.
- Tidak ada test runner yang dikonfigurasi; verifikasi menggunakan pemeriksaan statis, build, dan HTTP langsung. Interaksi peta/WebGL di browser belum diverifikasi secara visual.

## Sumber dan aset

- Dokumentasi BMKG: https://data.bmkg.go.id/prakiraan-cuaca/
- Dokumentasi NASA: https://firms.modaps.eosdis.nasa.gov/api/area/
- Logo ITS: https://www.its.ac.id/wp-content/uploads/2020/07/Logo-ITS-1.png
- Logo UPNVJT: https://mku.upnjatim.ac.id/UPN.png
- Kedua logo disimpan lokal di `public/logos/`, tanpa perubahan bentuk atau warna.
- Foto bersama belum disediakan. Frame placeholder tersedia.
- Key NASA yang kemudian diberikan pengguna telah dipasang di `.env.local` server-only. Pengujian langsung NASA mengembalikan HTTP 400, `Invalid MAP_KEY.` Endpoint aplikasi menampilkan status error dan tidak menampilkan deteksi buatan. Diperlukan MAP_KEY valid dari NASA FIRMS untuk mengaktifkan deteksi; key yang diberikan belum berhasil diautentikasi.
- Repo target tidak memiliki `.git`; perintah git dari direktori induk gagal mengakses worktree. Daftar perubahan dicatat melalui file yang disentuh, tanpa commit.
