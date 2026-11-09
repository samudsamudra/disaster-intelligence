import test from "node:test";
import assert from "node:assert/strict";
import { parseFeed, rankArticles, summarizeResults } from "./news-google-core.ts";

const feed = { name: "Google Gempa", provider: "google", category: "gempa", locale: "id", url: "https://news.google.com/rss/search?q=gempa" };
const article = (index, source, category = "gempa") => ({ id: `https://news.google.com/rss/articles/${index}`, articleUrl: `https://news.google.com/rss/articles/${index}`, title: `Gempa bumi di Kabupaten${index} Indonesia`, source, publishedAt: new Date(Date.UTC(2026, 10, 9, 12, index)).toISOString(), category, imageUrl: null, description: null, linkKind: "google-news" });

test("parses publisher metadata and rejects invalid XML", () => {
  const xml = `<rss><channel><item><title>Gempa bumi mengguncang wilayah Indonesia</title><link>https://news.google.com/rss/articles/abc</link><pubDate>Mon, 09 Nov 2026 12:00:00 GMT</pubDate><source url="https://example.com">Media Nasional</source></item></channel></rss>`;
  const result = parseFeed(xml, feed);
  assert.equal(result.length, 1);
  assert.equal(result[0].source, "Media Nasional");
  assert.equal(result[0].publishedAt, "2026-11-09T12:00:00.000Z");
  assert.equal(result[0].linkKind, "google-news");
  assert.throws(() => parseFeed("<rss><item>", feed), /invalid XML/);
});

test("deduplicates URLs and similar titles while diversifying first twelve", () => {
  const items = [...Array.from({ length: 12 }, (_, index) => article(index, "Media Satu")), ...Array.from({ length: 8 }, (_, index) => article(index + 12, `Media ${index + 2}`))];
  items.push({ ...article(99, "Media Lain"), title: items[0].title });
  items.push({ ...items[1] });
  const ranked = rankArticles(items);
  assert.equal(ranked.length, 20);
  assert.ok(ranked.slice(0, 12).filter(item => item.source === "Media Satu").length <= 3);
  assert.ok(new Set(ranked.slice(0, 12).map(item => item.source)).size >= 8);
});

test("prefers a matching publisher RSS article with a real feed image", () => {
  const google = article(1, "ANTARA News");
  const publisher = { ...article(2, "ANTARA News"), title: google.title, articleUrl: "https://www.antaranews.com/berita/123", id: "https://www.antaranews.com/berita/123", imageUrl: "https://img.antaranews.com/cover.jpg", linkKind: "publisher" };
  const result = rankArticles([google, publisher]);
  assert.equal(result.length, 1);
  assert.equal(result[0].articleUrl, publisher.articleUrl);
  assert.equal(result[0].imageUrl, publisher.imageUrl);
});

test("partial failure keeps valid articles and all-feed failure throws", () => {
  const feeds = [feed, { ...feed, name: "Second", url: "https://example.com/rss" }];
  const partial = summarizeResults(feeds, [{ status: "rejected", reason: new Error("HTTP 429") }, { status: "fulfilled", value: [article(1, "Media Dua"), article(2, "Media Dua", "banjir")] }], "gempa");
  assert.equal(partial.failed, true);
  assert.equal(partial.articles.length, 1);
  assert.equal(partial.statuses[0].status, "error");
  assert.throws(() => summarizeResults(feeds, [{ status: "rejected", reason: new Error("HTTP 403") }, { status: "rejected", reason: new Error("timeout") }], "all"), /all feeds failed/);
});
