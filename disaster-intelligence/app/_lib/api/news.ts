import "server-only";
import { XMLParser } from "fast-xml-parser";
import type { ArticleCategory, NewsArticle, NewsData } from "./news-types";

const TTL = 15 * 60 * 1000;
const STALE_TTL = 6 * 60 * 60 * 1000;
const RSS_FEEDS = [
  "https://www.antaranews.com/rss/terkini.xml",
  "https://www.antaranews.com/rss/warta-bumi.xml",
  "https://www.antaranews.com/rss/humaniora.xml",
];

let snapshot: { data: NewsData; at: number } | null = null;
let pending: Promise<NewsData> | null = null;

const categoryMatchers: [ArticleCategory, RegExp][] = [
  ["gempa", /\b(gempa|earthquake|tsunami|seismik)\b/i],
  ["banjir", /\b(banjir|flood|rob|terendam)\b/i],
  ["karhutla", /\b(karhutla|kebakaran (hutan|lahan|gambut)|wildfire|forest fire|titik panas)\b/i],
  ["cuaca-ekstrem", /\b(cuaca ekstrem|hujan lebat|angin kencang|puting beliung|badai|siklon|gelombang tinggi|extreme weather|storm)\b/i],
  ["iklim", /\b(perubahan iklim|krisis iklim|pemanasan global|climate change|global warming|kekeringan|drought|el ni.n?o|la ni.n?a)\b/i],
];

function categoryFor(title: string): ArticleCategory | null {
  return categoryMatchers.find(([, regex]) => regex.test(title))?.[0] ?? null;
}

function safeUrl(value: unknown, host?: string): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || (host && url.hostname !== host)) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch { return null; }
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return clean.length >= 12 && clean.length <= 500 ? clean : null;
}

function dedupeSort(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  return articles.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).filter(article => {
    if (seen.has(article.url)) return false;
    seen.add(article.url);
    return true;
  }).slice(0, 60);
}

async function fetchText(url: string, accept: string): Promise<{ text: string; type: string }> {
  const response = await fetch(url, { headers: { Accept: accept }, signal: AbortSignal.timeout(10000), cache: "no-store" });
  console.info("[news] upstream", new URL(url).hostname, response.status, response.headers.get("content-type"));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { text: await response.text(), type: response.headers.get("content-type") ?? "" };
}

async function gdeltArticles(): Promise<NewsArticle[]> {
  const query = 'Indonesia (gempa OR banjir OR karhutla OR "cuaca ekstrem" OR "perubahan iklim" OR earthquake OR flood OR wildfire OR "climate change")';
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.search = new URLSearchParams({ query, mode: "artlist", format: "json", timespan: "14d", maxrecords: "150", sort: "datedesc" }).toString();
  const result = await fetchText(url.toString(), "application/json");
  if (!/json/i.test(result.type)) throw new Error("Respons GDELT bukan JSON");
  const payload: unknown = JSON.parse(result.text);
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { articles?: unknown }).articles)) throw new Error("Format GDELT tidak valid");
  const articles = (payload as { articles: Record<string, unknown>[] }).articles;
  return dedupeSort(articles.flatMap(item => {
    const title = cleanText(item.title);
    const url = safeUrl(item.url);
    const category = title && categoryFor(title);
    const rawDate = typeof item.seendate === "string" ? item.seendate : "";
    const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(rawDate);
    const timestamp = match ? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z` : "";
    if (!title || !url || !category || !Number.isFinite(Date.parse(timestamp))) return [];
    const domain = new URL(url).hostname.replace(/^www\./, "");
    return [{ title, url, category, timestamp, source: domain, imageUrl: safeUrl(item.socialimage), dateKind: "seen" as const }];
  }));
}

async function rssArticles(): Promise<NewsArticle[]> {
  const results = await Promise.allSettled(RSS_FEEDS.map(async feed => {
    const result = await fetchText(feed, "application/rss+xml, application/xml, text/xml");
    if (!/xml/i.test(result.type)) throw new Error("Respons RSS bukan XML");
    const parsed = new XMLParser({ ignoreAttributes: false }).parse(result.text);
    const raw = parsed?.rss?.channel?.item;
    if (!raw) throw new Error("RSS tidak memuat item");
    const items: Record<string, unknown>[] = Array.isArray(raw) ? raw : [raw];
    const mapped = items.flatMap(item => {
      const title = cleanText(item.title);
      const url = safeUrl(item.link, "www.antaranews.com");
      const category = title && categoryFor(title);
      const dateValue = typeof item.pubDate === "string" ? Date.parse(item.pubDate) : NaN;
      const timestamp = Number.isFinite(dateValue) ? new Date(dateValue).toISOString() : "";
      if (!title || !url || !category || !Number.isFinite(Date.parse(timestamp))) return [];
      const enclosure = item.enclosure as Record<string, unknown> | undefined;
      const imageUrl = safeUrl(enclosure?.["@_url"], "img.antaranews.com");
      return [{ title, url, category, timestamp, source: "ANTARA News", imageUrl, dateKind: "published" as const }];
    });
    console.info("[news] RSS feed", new URL(feed).pathname, "items", items.length, "matched", mapped.length);
    return mapped;
  }));
  const successful = results.filter(result => result.status === "fulfilled");
  if (!successful.length) throw new Error("Semua feed RSS gagal");
  return dedupeSort(successful.flatMap(result => result.status === "fulfilled" ? result.value : []));
}

async function refresh(): Promise<NewsData> {
  let gdeltStatus: NewsData["gdeltStatus"] = "empty";
  try {
    const articles = await gdeltArticles();
    if (articles.length) return { articles, source: "GDELT", gdeltStatus: "available", fetchedAt: new Date().toISOString(), stale: false, cache: "miss", notice: "Waktu GDELT menunjukkan saat artikel pertama terpantau, bukan waktu terbit." };
    console.info("[news] GDELT returned no relevant articles; trying publisher RSS");
  } catch (error) {
    gdeltStatus = "error";
    console.warn("[news] GDELT unavailable", error instanceof Error ? error.message : "unknown error");
  }
  const articles = await rssArticles();
  return { articles, source: "ANTARA RSS", gdeltStatus, fetchedAt: new Date().toISOString(), stale: false, cache: "miss", notice: gdeltStatus === "error" ? "GDELT gagal diakses. Menampilkan artikel dari RSS resmi ANTARA." : "GDELT belum memuat artikel relevan. Menampilkan artikel dari RSS resmi ANTARA." };
}

export async function getNews(): Promise<NewsData> {
  if (snapshot && Date.now() - snapshot.at < TTL) return { ...snapshot.data, cache: "hit" };
  if (!pending) pending = refresh().then(data => {
    snapshot = { data, at: Date.now() };
    return data;
  }).finally(() => { pending = null; });
  try { return await pending; }
  catch (error) {
    if (snapshot && Date.now() - snapshot.at < STALE_TTL) return { ...snapshot.data, cache: "stale", stale: true, notice: "Sumber berita belum dapat diperbarui. Menampilkan data terakhir yang tersimpan." };
    throw error;
  }
}
