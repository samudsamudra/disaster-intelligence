import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { ArticleCategory, FeedStatus, NewsArticle, NewsCategory } from "./news-google-types";

export type FeedSpec = { name: string; provider: "google" | "antara"; url: string; category: ArticleCategory | "mixed"; locale: "id" | "en" };
const matches: [ArticleCategory, RegExp][] = [
  ["gempa", /\b(gempa(?: bumi)?|earthquake|tsunami|seismic)\b/i],
  ["banjir", /\b(banjir|flood(?:ing)?|banjir bandang|rob|terendam)\b/i],
  ["karhutla", /\b(karhutla|kebakaran (?:hutan|lahan|gambut)|wildfire|forest fire|bushfire)\b/i],
  ["cuaca-ekstrem", /\b(cuaca ekstrem|hujan lebat|angin kencang|puting beliung|badai|siklon|gelombang tinggi|extreme weather|cyclone|typhoon|hurricane|tornado|severe storm)\b/i],
  ["iklim", /\b(perubahan iklim|krisis iklim|pemanasan global|climate change|climate crisis|global warming|kekeringan|drought|el ni.n?o|la ni.n?a)\b/i],
];
export function categoryFor(title: string): ArticleCategory | null {
  return matches.find(([, expression]) => expression.test(title))?.[0] ?? null;
}
export function safeUrl(value: unknown, hostname?: string): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || (hostname && url.hostname !== hostname)) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    return url.toString();
  } catch { return null; }
}
function text(value: unknown, minimum = 12): string | null {
  if (typeof value !== "string") return null;
  const entities: Record<string, string> = { nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…", quot: '"', apos: "'", amp: "&" };
  const clean = value.replace(/<[^>]+>/g, " ")
    .replace(/&(nbsp|rsquo|lsquo|rdquo|ldquo|hellip|quot|apos|amp);/gi, (_, entity: string) => entities[entity.toLowerCase()] ?? "")
    .replace(/&#(\d+);/g, (_, code: string) => { const point = Number(code); return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : ""; })
    .replace(/\s+/g, " ").trim();
  return clean.length >= minimum && clean.length <= 500 ? clean : null;
}
function articleCategory(title: string, feed: FeedSpec): ArticleCategory | null {
  const found = categoryFor(title);
  if (feed.category === "mixed") return found;
  return found === feed.category ? found : null;
}
export function parseFeed(xml: string, feed: FeedSpec): NewsArticle[] {
  if (XMLValidator.validate(xml) !== true) throw new Error("invalid XML");
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
  const channel = parsed?.rss?.channel;
  if (!channel || !channel.item) throw new Error("invalid RSS channel");
  const items: Record<string, unknown>[] = Array.isArray(channel.item) ? channel.item : [channel.item];
  return items.flatMap(item => {
    const title = text(item.title);
    const category = title ? articleCategory(title, feed) : null;
    const articleUrl = safeUrl(item.link, feed.provider === "google" ? "news.google.com" : "www.antaranews.com");
    const dateValue = typeof item.pubDate === "string" ? Date.parse(item.pubDate) : NaN;
    if (!title || !category || !articleUrl || !Number.isFinite(dateValue)) return [];
    const sourceNode = item.source as Record<string, unknown> | undefined;
    const source = feed.provider === "google" ? text(sourceNode?.["#text"], 2) : "ANTARA News";
    if (!source) return [];
    const sourceUrl = feed.provider === "google" ? safeUrl(sourceNode?.["@_url"]) : "https://www.antaranews.com";
    const enclosure = item.enclosure as Record<string, unknown> | undefined;
    const imageUrl = feed.provider === "antara" ? safeUrl(enclosure?.["@_url"], "img.antaranews.com") : null;
    // Google descriptions duplicate title/link markup; ANTARA supplies a short RSS excerpt.
    const excerpt = feed.provider === "antara" ? text(item["content:encoded"]) : null;
    return [{ id: articleUrl, title, source, ...(sourceUrl ? { sourceUrl } : {}), articleUrl, publishedAt: new Date(dateValue).toISOString(), category, imageUrl, description: excerpt?.slice(0, 180) ?? null, linkKind: feed.provider === "google" ? "google-news" as const : "publisher" as const }];
  });
}
function normalizedTitle(title: string): string[] {
  return title.toLowerCase().replace(/\s+-\s+[^-]+$/, "").normalize("NFKD").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(word => word.length > 2);
}
export function similarTitle(a: string, b: string): boolean {
  const first = new Set(normalizedTitle(a));
  const second = new Set(normalizedTitle(b));
  if (!first.size || !second.size) return false;
  const overlap = [...first].filter(word => second.has(word)).length;
  return overlap / Math.max(first.size, second.size) >= 0.82;
}
export function rankArticles(input: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  const unique: NewsArticle[] = [];
  for (const article of input.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))) {
    if (seen.has(article.articleUrl)) continue;
    seen.add(article.articleUrl);
    const matchIndex = unique.findIndex(existing => similarTitle(existing.title, article.title));
    if (matchIndex !== -1) {
      const current = unique[matchIndex];
      const quality = (item: NewsArticle) => Number(item.linkKind === "publisher") * 2 + Number(Boolean(item.imageUrl));
      if (quality(article) > quality(current)) unique[matchIndex] = article;
      continue;
    }
    unique.push(article);
  }
  // Keep recent Indonesian coverage near the front, while retaining global stories.
  const ranked = unique.sort((a, b) => (Number(/\b(indonesia|ri|jakarta|jawa|sumatra|kalimantan|sulawesi|papua|bali)\b/i.test(b.title)) - Number(/\b(indonesia|ri|jakarta|jawa|sumatra|kalimantan|sulawesi|papua|bali)\b/i.test(a.title))) * 43_200_000 + Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const first: NewsArticle[] = [];
  const remaining = [...ranked];
  const counts = new Map<string, number>();
  for (let i = 0; i < remaining.length && first.length < 12;) {
    const article = remaining[i];
    const key = article.source.toLocaleLowerCase("id-ID").replace(/[^a-z0-9]/g, "");
    if ((counts.get(key) ?? 0) < 3) {
      first.push(article);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      remaining.splice(i, 1);
    } else i++;
  }
  while (first.length < 12 && remaining.length) first.push(remaining.shift()!);
  return [...first, ...remaining].slice(0, 120);
}

export function summarizeResults(feeds: FeedSpec[], results: PromiseSettledResult<NewsArticle[]>[], category: NewsCategory): { articles: NewsArticle[]; statuses: FeedStatus[]; failed: boolean } {
  const statuses: FeedStatus[] = results.map((result, index) => ({ name: feeds[index].name, status: result.status === "rejected" ? "error" : result.value.length ? "ok" : "empty", count: result.status === "fulfilled" ? result.value.length : 0 }));
  if (!statuses.length || statuses.every(feed => feed.status === "error")) throw new Error("all feeds failed");
  return {
    statuses,
    articles: rankArticles(results.flatMap(result => result.status === "fulfilled" ? result.value : []).filter(article => category === "all" || article.category === category)),
    failed: statuses.some(feed => feed.status === "error"),
  };
}
