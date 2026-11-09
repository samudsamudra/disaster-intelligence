# PantauBencana

**Real-Time Disaster Monitoring & Environmental Intelligence Platform**

PantauBencana adalah platform pemantauan kebencanaan berbasis web yang dirancang untuk menyajikan informasi gempa bumi, kondisi cuaca, prakiraan iklim, dan deteksi titik panas dalam satu dashboard interaktif.

Platform ini mengintegrasikan data dari berbagai penyedia informasi geospasial dan meteorologi untuk membantu masyarakat mengakses informasi kebencanaan secara lebih mudah, cepat, dan terstruktur.

PantauBencana dikembangkan dengan pendekatan **data-driven, location-aware, dan responsive web design**, dengan fokus pada transparansi sumber data, visualisasi geografis, dan pengalaman pengguna.

> **Disclaimer:** PantauBencana merupakan platform informasi dan pemantauan, bukan sistem peringatan dini resmi. Untuk keputusan keselamatan dan evakuasi, selalu ikuti informasi serta arahan instansi berwenang.

---

## 01. Overview

Informasi kebencanaan sering tersebar di berbagai platform dengan format, cakupan geografis, dan metode penyajian yang berbeda.

PantauBencana berupaya menyederhanakan akses informasi tersebut melalui sistem terintegrasi yang menggabungkan data kebencanaan, meteorologi, dan geospasial dalam satu antarmuka.

### Objectives

- Menyediakan dashboard pemantauan kebencanaan yang informatif.
- Mengintegrasikan sumber data dari penyedia nasional dan internasional.
- Memvisualisasikan aktivitas gempa dan titik panas melalui peta interaktif.
- Menyajikan informasi cuaca dan prakiraan berdasarkan lokasi pengguna.
- Membedakan data aktual, prakiraan, dan data yang tidak tersedia.
- Meningkatkan kemudahan akses informasi kebencanaan melalui perangkat desktop maupun mobile.

## 02. Core Features

### Earthquake Monitoring

Pemantauan aktivitas gempa bumi menggunakan integrasi data dari BMKG dan USGS.

Fitur utama:

- Informasi aktivitas gempa terbaru.
- Magnitudo, kedalaman, koordinat, dan waktu kejadian.
- Visualisasi lokasi episentrum pada peta interaktif.
- Daftar kejadian gempa yang dapat dipilih pengguna.
- Integrasi informasi gempa nasional dan internasional.

### Weather & Climate Monitoring

Pemantauan kondisi meteorologi dan prakiraan menggunakan Open-Meteo.

Indikator yang didukung:

- Suhu udara.
- Kelembapan relatif.
- Kecepatan dan arah angin.
- Kondisi cuaca.
- Prakiraan curah hujan.
- Peluang hujan.
- Informasi cuaca berdasarkan koordinat geografis.

Data cuaca disajikan dengan memperhatikan waktu pembaruan, periode prakiraan, dan sumber informasi.

### Satellite Hotspot Monitoring

Pemantauan titik panas menggunakan NASA FIRMS (*Fire Information for Resource Management System*).

Data hotspot berasal dari pengamatan satelit dan digunakan untuk mengidentifikasi lokasi yang menunjukkan indikasi anomali termal.

Informasi yang dapat disajikan bergantung pada data dan metadata yang tersedia dari sumber.

**Penting:** titik panas merupakan hasil deteksi satelit dan tidak selalu menunjukkan kebakaran yang telah terkonfirmasi di lapangan.

### Interactive Geospatial Visualization

PantauBencana menggunakan MapLibre GL JS untuk menampilkan data berbasis lokasi.

Kemampuan visualisasi mencakup:

- Peta geografis interaktif.
- Marker lokasi kejadian.
- Navigasi dan perubahan skala peta.
- Interaksi antara daftar kejadian dan lokasi pada peta.
- Layer informasi geografis sesuai ketersediaan data.

### Location-Aware Weather

PantauBencana mendukung penyesuaian informasi cuaca berdasarkan lokasi pengguna melalui izin geolokasi browser.

Jika izin lokasi tidak diberikan, sistem dapat menggunakan lokasi bawaan atau mekanisme fallback yang tersedia.

## 03. Technology Stack

| Category | Technology |
|---|---|
| Programming Language | TypeScript, JavaScript |
| Frontend Framework | Next.js 16 |
| UI Library | React 19 |
| Styling | CSS dan sistem styling proyek |
| Geospatial Visualization | MapLibre GL JS |
| Data Communication | REST API, Fetch API |
| Weather Data | Open-Meteo |
| Earthquake Data | BMKG, USGS |
| Satellite Hotspot Data | NASA FIRMS |
| Deployment | Vercel |
| Version Control | Git |
| Repository Hosting | GitHub |

### Why Next.js?

Next.js dipilih karena mendukung pengembangan aplikasi web modern dengan integrasi frontend dan backend dalam satu codebase.

Arsitektur ini memungkinkan pemrosesan request API melalui server-side route, sehingga integrasi layanan eksternal, pengelolaan cache, dan penyimpanan kredensial dapat dilakukan tanpa mengekspos seluruh proses ke browser.

### Why TypeScript?

TypeScript digunakan untuk meningkatkan konsistensi struktur data dan mengurangi risiko kesalahan tipe ketika mengolah respons dari berbagai API.

Hal ini penting karena data kebencanaan dapat memiliki format, satuan, dan metadata yang berbeda antarpenyedia.

### Why MapLibre GL JS?

MapLibre GL JS merupakan library pemetaan open-source yang mendukung visualisasi geografis interaktif berbasis WebGL.

Library ini dipilih karena fleksibel untuk membangun peta dengan marker, layer, serta interaksi berbasis koordinat yang dibutuhkan oleh platform pemantauan kebencanaan.

## 04. Data Sources & API Integration

### BMKG

**Badan Meteorologi, Klimatologi, dan Geofisika**

Digunakan sebagai sumber informasi gempa bumi di Indonesia.

Website: https://www.bmkg.go.id/

Open Data: https://data.bmkg.go.id/

### USGS Earthquake API

**United States Geological Survey**

Menyediakan informasi aktivitas gempa bumi secara global, termasuk lokasi, magnitudo, kedalaman, dan waktu kejadian.

Dokumentasi: https://earthquake.usgs.gov/fdsnws/event/1/

### Open-Meteo API

Penyedia data cuaca dan prakiraan meteorologi berbasis koordinat.

Digunakan untuk informasi suhu, kelembapan, angin, kondisi cuaca, peluang hujan, dan akumulasi curah hujan.

Dokumentasi: https://open-meteo.com/en/docs

### NASA FIRMS

**Fire Information for Resource Management System**

Menyediakan data deteksi titik panas dari instrumen pengamatan satelit, termasuk produk VIIRS.

Digunakan untuk mendukung pemantauan indikasi aktivitas kebakaran melalui informasi geospasial.

Website: https://firms.modaps.eosdis.nasa.gov/

Dokumentasi API: https://firms.modaps.eosdis.nasa.gov/api/

Akses dan penggunaan data mengikuti ketentuan penyedia.

## 05. System Architecture

PantauBencana menerapkan pendekatan integrasi data berbasis API.

```text
                 USER / BROWSER
                       |
                       v
                NEXT.JS FRONTEND
                       |
          +------------+------------+
          |                         |
          v                         v
   DASHBOARD & UI             MAPLIBRE GL JS
          |                         |
          +------------+------------+
                       |
                       v
               NEXT.JS API LAYER
                       |
        +--------------+--------------+
        |              |              |
        v              v              v
   EARTHQUAKE       WEATHER        HOTSPOT
    PROVIDER        PROVIDER       PROVIDER
        |              |              |
    BMKG/USGS       OPEN-METEO     NASA FIRMS
        |              |              |
        +--------------+--------------+
                       |
                       v
             NORMALIZED RESPONSE
                       |
                       v
              DASHBOARD UPDATES
```

### Data Handling Principles

PantauBencana dirancang dengan prinsip:

1. **Source transparency:** menampilkan asal informasi.
2. **Data normalization:** menyelaraskan struktur respons dari berbagai sumber.
3. **Error handling:** membedakan data kosong dari kegagalan layanan.
4. **Caching:** membantu mengurangi request berulang dan menjaga ketersediaan informasi.
5. **Graceful degradation:** menjaga bagian aplikasi lain tetap dapat digunakan ketika salah satu penyedia bermasalah.
6. **Temporal context:** menyertakan waktu pembaruan dan periode prakiraan jika tersedia.

## 06. Design System & Color Philosophy

PantauBencana menggunakan pendekatan visual **dark interface with red accent**, yang terinspirasi dari karakteristik sistem pemantauan, pusat kendali operasional, dan komunikasi risiko kebencanaan.

### Primary Palette

| Color | Role | Design Rationale |
|---|---|---|
| Black / Near Black | Background | Membangun tampilan monitoring yang fokus dan mengurangi distraksi visual |
| Dark Gray | Surface & Panels | Memisahkan hierarki informasi tanpa kontras berlebihan |
| Red | Primary Accent | Mengomunikasikan urgensi, kewaspadaan, dan identitas kebencanaan |
| White / Off-White | Primary Text | Memperjelas informasi utama di atas latar gelap |
| Muted Gray | Secondary Text | Membedakan metadata dari informasi prioritas |

### Why Red?

Merah dipilih karena secara visual memiliki asosiasi kuat dengan perhatian, peringatan, dan kondisi darurat.

Dalam konteks PantauBencana, warna merah digunakan untuk membangun identitas visual yang relevan dengan tema mitigasi bencana.

Namun, warna merah tidak selalu berarti sebuah kejadian memiliki tingkat bahaya tinggi. Status risiko harus ditentukan berdasarkan data dan klasifikasi yang sesuai, bukan semata-mata warna antarmuka.

### Why Dark Mode?

Antarmuka gelap dipilih untuk mendukung tampilan dashboard yang memiliki banyak elemen data, panel statistik, dan peta geografis.

Latar gelap membantu membangun hierarki visual antara informasi utama, metadata, dan komponen interaktif.

### Visual Design Principles

- **Clarity over decoration:** mengutamakan keterbacaan informasi.
- **Information hierarchy:** memisahkan informasi penting dari informasi pendukung.
- **Consistent components:** mempertahankan konsistensi kartu, navigasi, dan indikator.
- **Responsive layout:** menyesuaikan tampilan untuk berbagai ukuran layar.
- **Risk communication:** menghindari penyajian informasi yang dapat menimbulkan interpretasi keliru.

## 07. Getting Started

### Prerequisites

Pastikan lingkungan pengembangan memiliki:

- Node.js versi yang kompatibel dengan Next.js 16.
- npm.
- Git.
- API key NASA FIRMS jika integrasi hotspot diaktifkan.

### Installation

Clone repository:

```bash
git clone https://github.com/USERNAME/REPOSITORY.git
cd REPOSITORY
```

Install dependencies:

```bash
npm install
```

### Environment Variables

Buat file `.env.local` pada direktori utama proyek.

Contoh konfigurasi untuk integrasi NASA FIRMS:

```env
NASA_FIRMS_MAP_KEY=your_firms_map_key
```

Variabel environment lain perlu disesuaikan dengan konfigurasi aplikasi yang digunakan.

**Security notice:**

- Jangan commit `.env.local` ke repository publik.
- Jangan menyimpan API key langsung di source code.
- Jangan mengekspos secret menggunakan prefix `NEXT_PUBLIC_`.
- Gunakan environment variables pada Vercel untuk konfigurasi production.

### Development Server

```bash
npm run dev
```

Buka:

http://localhost:3000

### Production Build

```bash
npm run build
npm run start
```

## 08. Deployment

PantauBencana dirancang untuk dapat di-deploy menggunakan Vercel.

Tahapan deployment:

1. Push source code ke GitHub.
2. Hubungkan repository dengan Vercel.
3. Pastikan framework terdeteksi sebagai Next.js.
4. Konfigurasikan environment variables yang diperlukan.
5. Jalankan deployment.
6. Verifikasi halaman dashboard, API routes, peta, dan integrasi data eksternal.

Pastikan seluruh secret yang diperlukan telah dikonfigurasi pada environment production.

Website: *Production URL will be added after deployment.*

## 09. Data Reliability & Limitations

PantauBencana mengintegrasikan informasi dari berbagai penyedia eksternal. Oleh karena itu, ketersediaan dan ketepatan waktu data dapat dipengaruhi oleh kondisi layanan masing-masing penyedia.

Beberapa batasan penting:

- Prakiraan cuaca merupakan hasil pemodelan dan dapat berbeda dari kondisi aktual.
- Nilai curah hujan harus dibaca sesuai periode dan satuannya.
- Deteksi hotspot satelit tidak selalu menunjukkan kebakaran terkonfirmasi.
- Tidak adanya deteksi hotspot tidak menjamin tidak terjadi kebakaran.
- Kegagalan API tidak boleh diinterpretasikan sebagai tidak adanya kejadian.
- Informasi gempa dapat mengalami pembaruan atau revisi dari penyedia.
- Lokasi pengguna hanya dapat diperoleh melalui mekanisme yang didukung browser dan izin yang relevan.

Platform ini tidak menggantikan informasi resmi maupun instruksi tanggap darurat dari instansi berwenang.

## 10. Future Development

Potensi pengembangan PantauBencana meliputi:

- Peningkatan reliabilitas integrasi API kebencanaan.
- Penambahan sumber informasi bencana lainnya.
- Analisis spasial dan temporal kejadian.
- Peningkatan visualisasi data historis.
- Sistem notifikasi berbasis lokasi.
- Pengembangan analitik risiko berbasis data.
- Peningkatan performa dan aksesibilitas dashboard.

Fitur pada bagian ini merupakan rencana pengembangan, bukan klaim fitur yang telah tersedia.

## 11. Acknowledgements

PantauBencana memanfaatkan teknologi dan sumber data dari:

- Badan Meteorologi, Klimatologi, dan Geofisika (BMKG).
- United States Geological Survey (USGS).
- Open-Meteo.
- NASA FIRMS.
- MapLibre.
- Next.js dan React.

Hak kepemilikan, atribusi, serta ketentuan penggunaan data tetap mengikuti masing-masing penyedia.

---

**PantauBencana — Making Disaster Information More Accessible, Understandable, and Actionable.**

Dev: Yohanes Capelliou Samudra
