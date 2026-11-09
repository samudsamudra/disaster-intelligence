"use client";

import { useEffect, useRef, useState } from "react";
import { Sidebar } from "./sidebar";
import { NEWS_CATEGORIES, type NewsArticle, type NewsCategory, type NewsData } from "../_lib/api/news-google-types";

const labels: Record<NewsCategory, string> = { all: "Semua Berita", gempa: "Gempa Bumi", banjir: "Banjir", "cuaca-ekstrem": "Cuaca Ekstrem", karhutla: "Kebakaran Hutan", iklim: "Perubahan Iklim" };
const coverPaths: Record<Exclude<NewsCategory, "all">, string> = {
  gempa: "M4 34h12l6-12 9 23 8-29 7 18h14",
  banjir: "M4 20c8 0 8 7 16 7s8-7 16-7 8 7 16 7 8-7 16-7M4 37c8 0 8 7 16 7s8-7 16-7 8 7 16 7 8-7 16-7",
  "cuaca-ekstrem": "M12 35a13 13 0 0 1 5-25 19 19 0 0 1 34 8 11 11 0 0 1 1 22H12m20-11-7 14h8l-5 15 15-22h-9l5-9",
  karhutla: "M32 5c4 12-9 16-5 25 2-3 6-6 6-11 13 9 18 20 13 30-4 8-12 12-21 11C8 64 3 49 11 37c3 9 10 11 12 9C20 33 22 18 32 5Z",
  iklim: "M32 5a27 27 0 1 0 0 54 27 27 0 0 0 0-54ZM5 32h54M32 5c-9 8-13 17-13 27s4 19 13 27m0-54c9 8 13 17 13 27s-4 19-13 27",
};

function ArticleImage({ article }: { article: NewsArticle }) {
  const [failed, setFailed] = useState(false);
  return <div className="news-image">
    {article.imageUrl && !failed ? (
      // Remote publisher images have arbitrary hosts; a native image permits a graceful fallback.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={article.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    ) : <div className={`news-image-fallback news-cover-${article.category}`} role="img" aria-label={`Ilustrasi ${labels[article.category]}; foto artikel tidak tersedia`}><span className="news-cover-kicker">ILUSTRASI · {labels[article.category]}</span><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={coverPaths[article.category]} /></svg><span className="news-cover-note">Foto artikel tidak tersedia</span></div>}
  </div>;
}

function dateLabel(article: NewsArticle) {
  const date = new Date(article.publishedAt);
  return `Terbit ${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta", timeZoneName: "short" }).format(date)}`;
}

export function NewsPage() {
  const [category, setCategory] = useState<NewsCategory>("all");
  const [data, setData] = useState<NewsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [moreLoading, setMoreLoading] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const requestEpoch = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/v1/news?category=${category}&limit=12`, { signal: controller.signal }).then(async response => {
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "Berita gagal dimuat.");
      setData(payload.data);
      setError(null);
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Berita gagal dimuat."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [category, retry]);

  const articles = data?.articles ?? [];
  async function loadMore() {
    if (!data || moreLoading || articles.length >= data.total) return;
    const epoch = requestEpoch.current;
    setMoreLoading(true);
    setMoreError(null);
    try {
      const response = await fetch(`/api/v1/news?category=${category}&limit=12&offset=${articles.length}`);
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "Berita berikutnya gagal dimuat.");
      if (requestEpoch.current === epoch) setData(current => current ? { ...current, articles: [...current.articles, ...payload.data.articles.filter((article: NewsArticle) => !current.articles.some(existing => existing.id === article.id))] } : current);
    } catch (reason) { if (requestEpoch.current === epoch) setMoreError(reason instanceof Error ? reason.message : "Berita berikutnya gagal dimuat."); }
    finally { if (requestEpoch.current === epoch) setMoreLoading(false); }
  }
  return <div className="dashboard-shell news-shell"><Sidebar active="news" /><main className="dashboard-main news-main">
    <header className="topbar"><div><p className="eyebrow">INDONESIA · INFORMASI TERKINI</p><h1>Warta Bencana</h1></div><span className="news-header-mark">BERITA & IKLIM</span></header>
    <section className="news-intro"><div><p className="eyebrow">DARI PENERBIT ASLI</p><h2>Kenali peristiwa.<br /><span>Siapkan langkah.</span></h2><p>Berita bencana alam dan perubahan iklim dari berbagai media. Informasi jurnalistik ini terpisah dari peringatan resmi.</p></div><div className="news-source-summary"><span className="news-live-dot" />{loading ? "Mengambil berita…" : error ? "Sumber belum tersedia" : `Sumber: ${data?.source}`}{data?.stale && <small>Data tersimpan · belum diperbarui</small>}{data?.lastUpdated && !data.stale && <small>Diperbarui {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta", timeZoneName: "short" }).format(new Date(data.lastUpdated))}</small>}</div></section>
    <div className="news-tabs" role="group" aria-label="Kategori berita">{NEWS_CATEGORIES.map(item => <button key={item} type="button" className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => { if (item !== category) { requestEpoch.current++; setData(null); setError(null); setLoading(true); setMoreLoading(false); setMoreError(null); setCategory(item); } }}>{labels[item]}</button>)}</div>
    {data?.notice && <p className="news-notice">{data.notice}</p>}
    {error && <div className="news-state" role="alert"><strong>Berita belum dapat dimuat.</strong><p>{error}</p><button type="button" onClick={() => { requestEpoch.current++; setData(null); setError(null); setLoading(true); setRetry(value => value + 1); }}>Coba lagi</button></div>}
    {loading && !data && <div className="news-grid" aria-label="Memuat berita">{Array.from({ length: 6 }, (_, index) => <div key={index} className="news-card news-skeleton"><div className="news-image" /><div className="news-card-body"><span /><span /><span /><span /></div></div>)}</div>}
    {!loading && !error && !articles.length && <div className="news-state"><strong>Belum ada artikel yang dapat ditampilkan untuk {labels[category]}.</strong><p>{data?.status === "partial" ? "Sebagian feed gagal diperbarui; cakupan berita saat ini terbatas. Coba lagi nanti." : "Feed berhasil diakses, tetapi belum memuat artikel yang cocok. Coba kategori lain atau perbarui nanti."}</p></div>}
    {articles.length > 0 && <div className="news-grid">{articles.map(article => <article className="news-card" key={article.id}><ArticleImage article={article} /><div className="news-card-body"><div className="news-card-meta"><span className="news-category">{labels[article.category]}</span><time dateTime={article.publishedAt}>{dateLabel(article)}</time></div><h2><a href={article.articleUrl} target="_blank" rel="noopener noreferrer">{article.title}</a></h2>{article.description && <p className="news-description">{article.description}</p>}<div className="news-card-footer"><span>{article.source}</span><a href={article.articleUrl} target="_blank" rel="noopener noreferrer" aria-label={`Baca selengkapnya: ${article.title}`}>{article.linkKind === "google-news" ? "Baca via Google News" : "Baca selengkapnya"} <span aria-hidden="true">↗</span></a></div></div></article>)}</div>}
    {data && articles.length < data.total && <div className="news-more"><button type="button" onClick={loadMore} disabled={moreLoading}>{moreLoading ? "Memuat…" : "Muat lebih banyak"}</button>{moreError && <p role="alert">{moreError}</p>}<small>{articles.length} dari {data.total} artikel</small></div>}
    <footer className="news-footer">Judul, waktu, media, dan tautan berasal dari metadata RSS. Artikel Google News dibuka melalui tautan Google menuju media asal. Untuk instruksi darurat, ikuti peringatan resmi.</footer>
  </main></div>;
}
