import "server-only";
import { parseFeed, summarizeResults, type FeedSpec } from "./news-google-core";
import type { FeedStatus, NewsCategory, NewsData, NewsArticle } from "./news-google-types";

const TTL_MS = 15 * 60_000;
const STALE_MS = 6 * 60 * 60_000;
const ARTICLE_MAX_AGE_MS = 14 * 24 * 60 * 60_000;
const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 10_000;

const googleFeed = (name: string, q: string, category: FeedSpec["category"], locale: FeedSpec["locale"] = "id"): FeedSpec => {
  const url = new URL("https://news.google.com/rss/search");
  url.search = new URLSearchParams({ q, hl: locale === "id" ? "id" : "en-US", gl: locale === "id" ? "ID" : "US", ceid: locale === "id" ? "ID:id" : "US:en" }).toString();
  return { name, provider: "google", url: url.toString(), category, locale };
};
const googleFeeds: FeedSpec[] = [
  googleFeed("Google Gempa", '"gempa bumi" Indonesia when:7d', "gempa"),
  googleFeed("Google Banjir", 'banjir Indonesia when:7d', "banjir"),
  googleFeed("Google Cuaca Ekstrem", '("cuaca ekstrem" OR "angin kencang" OR "puting beliung") Indonesia when:7d', "cuaca-ekstrem"),
  googleFeed("Google Karhutla", '(karhutla OR "kebakaran hutan") Indonesia when:14d', "karhutla"),
  googleFeed("Google Iklim", '("perubahan iklim" OR "pemanasan global") Indonesia when:14d', "iklim"),
  googleFeed("Google Global Disaster", '(earthquake OR flood OR wildfire OR cyclone) disaster when:7d', "mixed", "en"),
  googleFeed("Google Global Climate", '"climate change" (impact OR disaster) when:14d', "iklim", "en"),
];
const publisherFeeds: FeedSpec[] = [
  { name: "ANTARA Terkini", provider: "antara", url: "https://www.antaranews.com/rss/terkini.xml", category: "mixed", locale: "id" },
  { name: "ANTARA Top News", provider: "antara", url: "https://www.antaranews.com/rss/top-news.xml", category: "mixed", locale: "id" },
  { name: "ANTARA Warta Bumi", provider: "antara", url: "https://www.antaranews.com/rss/warta-bumi.xml", category: "mixed", locale: "id" },
  { name: "ANTARA Humaniora", provider: "antara", url: "https://www.antaranews.com/rss/humaniora.xml", category: "mixed", locale: "id" },
];
type Stored = { articles: NewsArticle[]; source: string; lastUpdated: string; status: "ok" | "partial" | "empty"; feeds: FeedStatus[]; notice: string | null };
const cache = new Map<NewsCategory, { value: Stored; at: number }>();
const inflight = new Map<NewsCategory, Promise<Stored>>();
const feedCache = new Map<string, { articles: NewsArticle[]; at: number }>();
const feedInflight = new Map<string, Promise<NewsArticle[]>>();

async function readBounded(response: Response): Promise<string> {
  if (Number(response.headers.get("content-length")) > MAX_BYTES) throw new Error("response too large");
  if (!response.body) throw new Error("empty body");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) throw new Error("response too large");
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const joined = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(joined);
}
async function fetchFeed(feed: FeedSpec): Promise<NewsArticle[]> {
  const response = await fetch(feed.url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: "application/rss+xml, application/xml, text/xml" }, cache: "no-store" });
  console.info("[news] feed", feed.name, response.status, response.headers.get("content-type"));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!/xml|rss/i.test(response.headers.get("content-type") ?? "")) throw new Error("unexpected content type");
  const now = Date.now();
  return parseFeed(await readBounded(response), feed).filter(article => {
    const published = Date.parse(article.publishedAt);
    return published >= now - ARTICLE_MAX_AGE_MS && published <= now + 6 * 60 * 60_000;
  });
}
function getFeed(feed: FeedSpec): Promise<NewsArticle[]> {
  const cached = feedCache.get(feed.url);
  if (cached && Date.now() - cached.at < TTL_MS) return Promise.resolve(cached.articles);
  let work = feedInflight.get(feed.url);
  if (!work) {
    work = fetchFeed(feed).then(articles => { feedCache.set(feed.url, { articles, at: Date.now() }); return articles; }).finally(() => feedInflight.delete(feed.url));
    feedInflight.set(feed.url, work);
  }
  return work;
}
function feedsFor(category: NewsCategory): FeedSpec[] {
  return [...googleFeeds.filter(feed => category === "all" || feed.category === category), ...publisherFeeds];
}
async function refresh(category: NewsCategory): Promise<Stored> {
  const feeds = feedsFor(category);
  const results: PromiseSettledResult<NewsArticle[]>[] = [];
  // Three concurrent requests per batch limits upstream bursts.
  for (let start = 0; start < feeds.length; start += 3) results.push(...await Promise.allSettled(feeds.slice(start, start + 3).map(getFeed)));
  const { statuses, articles, failed } = summarizeResults(feeds, results, category);
  for (let index = 0; index < results.length; index++) if (results[index].status === "rejected") {
    const reason = (results[index] as PromiseRejectedResult).reason;
    console.warn("[news] feed failed", feeds[index].name, reason instanceof Error ? reason.message : "unknown error");
  }
  const googleAvailable = statuses.some((feed, index) => feeds[index].provider === "google" && feed.status === "ok");
  const publisherAvailable = statuses.some((feed, index) => feeds[index].provider === "antara" && feed.status === "ok");
  const source = googleAvailable && publisherAvailable ? "Google News RSS · ANTARA RSS" : googleAvailable ? "Google News RSS" : "ANTARA RSS";
  const status = failed ? "partial" : articles.length ? "ok" : "empty";
  const stored: Stored = { articles, source, lastUpdated: new Date().toISOString(), status, feeds: statuses, notice: failed ? "Sebagian feed belum dapat diperbarui. Artikel yang tersedia tetap ditampilkan." : null };
  cache.set(category, { value: stored, at: Date.now() });
  return stored;
}
export async function getGoogleNews(category: NewsCategory): Promise<NewsData> {
  const existing = cache.get(category);
  if (existing && Date.now() - existing.at < TTL_MS) return { ...existing.value, total: existing.value.articles.length, stale: false, cache: "hit" };
  let work = inflight.get(category);
  if (!work) { work = refresh(category).finally(() => inflight.delete(category)); inflight.set(category, work); }
  try {
    const fresh = await work;
    return { ...fresh, total: fresh.articles.length, stale: false, cache: "miss" };
  } catch (error) {
    if (existing && Date.now() - existing.at < STALE_MS) return { ...existing.value, total: existing.value.articles.length, status: "stale", stale: true, cache: "stale", notice: "Sumber berita gagal diperbarui. Menampilkan data terakhir yang tersimpan." };
    throw error;
  }
}
