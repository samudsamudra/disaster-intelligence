import Image from "next/image";
import { Sidebar } from "../_components/sidebar";
import { TeamPhoto } from "../_components/team-photo";

export default function AboutPage() {
  return <div className="dashboard-shell">
    <Sidebar active="about" />
    <main className="dashboard-main">
      <header className="topbar"><div><p className="eyebrow">PANTAUBENCANA · TIM PENGEMBANG</p><h1>Tentang Kami</h1></div></header>
      <section className="hero"><div className="hero-copy"><p className="eyebrow">KOLABORASI LINTAS KAMPUS</p><h2>Informasi yang mudah dipahami untuk kesiapsiagaan bersama.</h2><p>PantauBencana dikembangkan untuk membantu masyarakat membaca informasi kebencanaan dan kondisi lingkungan dari sumber resmi.</p></div></section>
      <section className="team-content" aria-label="Tim developer">
        <div className="campus-logos">
          <a href="https://www.its.ac.id/" className="campus-card"><Image src="/logos/its.png" alt="Logo resmi Institut Teknologi Sepuluh Nopember" width={160} height={120} /><strong>Institut Teknologi Sepuluh Nopember</strong><span>ITS · Surabaya</span></a>
          <a href="https://www.upnjatim.ac.id/" className="campus-card"><Image src="/logos/upnvjt.png" alt="Logo resmi UPN Veteran Jawa Timur" width={160} height={120} /><strong>UPN “Veteran” Jawa Timur</strong><span>UPNVJT · Surabaya</span></a>
        </div>
        <TeamPhoto />
        <div className="team-members"><article><p className="eyebrow">ITS</p><h2>Y. Capelliou Samudra</h2><p>Bagian dari tim pengembang PantauBencana dari Institut Teknologi Sepuluh Nopember.</p></article><article><p className="eyebrow">UPNVJT</p><h2>Rasti Oktavianny W.</h2><p>Bagian dari tim pengembang PantauBencana dari UPN “Veteran” Jawa Timur.</p></article></div>
        <p className="panel-caption">Kami berkolaborasi untuk menghadirkan pemantauan bencana yang jelas, mudah diakses, dan mendukung kesiapsiagaan. Afiliasi kampus menunjukkan asal anggota tim.</p>
      </section>
    </main>
  </div>;
}
