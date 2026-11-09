import { NextRequest, NextResponse } from "next/server";
import { getNews } from "../../../_lib/api/news";
import { NEWS_CATEGORIES, type NewsCategory } from "../../../_lib/api/news-types";

export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("category") ?? "all";
  if (!NEWS_CATEGORIES.includes(requested as NewsCategory)) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Kategori berita tidak dikenal." } }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const data = await getNews();
    const articles = requested === "all" ? data.articles : data.articles.filter(article => article.category === requested);
    return NextResponse.json({ success: true, data: { ...data, articles }, meta: { count: articles.length, category: requested } }, { headers: { "Cache-Control": data.stale ? "no-store" : "public, s-maxage=900, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("[news] all providers unavailable", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Berita belum dapat dimuat dari sumber saat ini. Coba lagi nanti." } }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
