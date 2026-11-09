export const NEWS_CATEGORIES = ["all", "gempa", "banjir", "cuaca-ekstrem", "karhutla", "iklim"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];
export type ArticleCategory = Exclude<NewsCategory, "all">;

export type NewsArticle = {
  url: string;
  title: string;
  source: string;
  imageUrl: string | null;
  timestamp: string;
  dateKind: "published" | "seen";
  category: ArticleCategory;
};

export type NewsData = {
  articles: NewsArticle[];
  source: "GDELT" | "ANTARA RSS";
  gdeltStatus: "available" | "empty" | "error";
  fetchedAt: string;
  stale: boolean;
  cache: "hit" | "miss" | "stale";
  notice: string | null;
};
