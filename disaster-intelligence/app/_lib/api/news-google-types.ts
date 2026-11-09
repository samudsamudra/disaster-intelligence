export const NEWS_CATEGORIES = ["all", "gempa", "banjir", "cuaca-ekstrem", "karhutla", "iklim"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];
export type ArticleCategory = Exclude<NewsCategory, "all">;
export type NewsArticle = {
  id: string;
  title: string;
  source: string;
  sourceUrl?: string;
  articleUrl: string;
  publishedAt: string;
  category: ArticleCategory;
  imageUrl: string | null;
  description: string | null;
  linkKind: "publisher" | "google-news";
};
export type FeedStatus = { name: string; status: "ok" | "empty" | "error"; count: number };
export type NewsData = {
  articles: NewsArticle[];
  total: number;
  source: string;
  lastUpdated: string | null;
  status: "ok" | "partial" | "empty" | "stale";
  stale: boolean;
  cache: "hit" | "miss" | "stale";
  feeds: FeedStatus[];
  notice: string | null;
};
