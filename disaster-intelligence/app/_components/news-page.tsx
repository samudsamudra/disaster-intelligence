"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { NEWS_CATEGORIES, type NewsArticle, type NewsCategory, type NewsData } from "../_lib/api/news-types";

const labels: Record<NewsCategory, string> = { all: "Semua", gempa: "Gempa", banjir: "Banjir", "cuaca-ekstrem": "Cuaca Ekstrem", karhutla: "Karhutla", iklim: "Iklim" };

function ArticleImage({ article }: { article: NewsArticle }) {
  const [failed, setFailed] = useState(false);
  return <div className="news-image">
    {article.imageUrl && !failed ? (
      // Remote publisher images have arbitrary hosts; a native image permits a graceful fallback.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={article.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    ) : <div className="news-image-fallback" aria-hidden="true"><span>WARTA<br />BENCANA</span><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="11" width="48" height="42" rx="3"/><path d="M16 21h32M16 29h16M16 37h32M16 45h24"/></svg></div>}
  </div>;
}

function dateLabel(article: NewsArticle) {
  const date = new Date(article.timestamp);
  return `${article.dateKind === "seen" ? "Terpantau" : "Terbit"} ${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta", timeZoneName: "short" }).format(date)}`;
}

export function NewsPage() {
  const [category, setCategory] = useState<NewsCategory>("all");
  const [data, setData] = useState<NewsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/news", { signal: controller.signal }).then(async response => {
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "Berita gagal dimuat.");
      setData(payload.data);
      setError(null);
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Berita gagal dimuat."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const articles = data?.articles.filter(article => category === "all" || article.category === category) ?? [];
  return <div className="dashboard-shell news-shell"><Sidebar active="news" /><main className="dashboard-main news-main">
    <header className="topbar"><div><p className="eyebrow">INDONESIA · INFORMASI TERKINI</p><h1>Warta Bencana</h1></div><span className="news-header-mark">BERITA & IKLIM</span></header>
    <section className="news-intro"><div><p className="eyebrow">DARI PENERBIT ASLI</p><h2>Kenali peristiwa.<br /><span>Siapkan langkah.</span></h2><p>Berita bencana alam dan perubahan iklim yang terhubung langsung ke media penerbit. Informasi ini terpisah dari peringatan resmi.</p></div><div className="news-source-summary"><span className="news-live-dot" />{loading ? "Mengambil berita…" : error ? "Sumber belum tersedia" : `Sumber: ${data?.source}`}{data?.stale && <small>Data tersimpan · belum diperbarui</small>}{data && !data.stale && <small>Diperbarui {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta", timeZoneName: "short" }).format(new Date(data.fetchedAt))}</small>}</div></section>
    <div className="news-tabs" role="group" aria-label="Kategori berita">{NEWS_CATEGORIES.map(item => <button key={item} type="button" className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>{labels[item]}</button>)}</div>
    {data?.notice && <p className="news-notice">{data.notice}</p>}
    {error && <div className="news-state" role="alert"><strong>Berita belum dapat dimuat.</strong><p>{error}</p><button type="button" onClick={() => { setLoading(true); setRetry(value => value + 1); }}>Coba lagi</button></div>}
    {loading && !data && <div className="news-grid" aria-label="Memuat berita">{Array.from({ length: 6 }, (_, index) => <div key={index} className="news-card news-skeleton"><div className="news-image" /><div className="news-card-body"><span /><span /><span /><span /></div></div>)}</div>}
    {!loading && !error && !articles.length && <div className="news-state"><strong>Belum ada berita pada kategori {labels[category]}.</strong><p>{data?.source === "ANTARA RSS" ? "Cakupan saat ini mengikuti feed ANTARA. Coba kategori lain atau perbarui nanti." : "Coba kategori lain atau perbarui nanti."}</p></div>}
    {articles.length > 0 && <div className="news-grid">{articles.map(article => <article className="news-card" key={article.url}><ArticleImage article={article} /><div className="news-card-body"><div className="news-card-meta"><span className="news-category">{labels[article.category]}</span><time dateTime={article.timestamp}>{dateLabel(article)}</time></div><h2><a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a></h2><div className="news-card-footer"><span>{article.source}</span><a href={article.url} target="_blank" rel="noopener noreferrer" aria-label={`Baca selengkapnya di ${article.source}: ${article.title}`}>Baca selengkapnya <span aria-hidden="true">↗</span></a></div></div></article>)}</div>}
    <footer className="news-footer">Judul, waktu, media, dan tautan berasal dari metadata sumber. Baca artikel lengkap di situs penerbit. Untuk instruksi darurat, ikuti peringatan resmi.</footer>
  </main></div>;
}
