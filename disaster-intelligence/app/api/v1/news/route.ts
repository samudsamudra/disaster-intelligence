import { NextRequest, NextResponse } from "next/server";
import { getGoogleNews } from "../../../_lib/api/news-google";
import { NEWS_CATEGORIES, type NewsCategory } from "../../../_lib/api/news-google-types";

const aliases: Record<string, NewsCategory> = { earthquake: "gempa", flood: "banjir", extremeWeather: "cuaca-ekstrem", wildfire: "karhutla", climate: "iklim" };
function integer(value: string | null, fallback: number, maximum: number): number | null {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= maximum ? parsed : null;
}

export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("category") ?? "all";
  const category = aliases[requested] ?? requested;
  const limit = integer(request.nextUrl.searchParams.get("limit"), 12, 24);
  const offset = integer(request.nextUrl.searchParams.get("offset"), 0, 120);
  if (!NEWS_CATEGORIES.includes(category as NewsCategory) || limit === null || limit < 1 || offset === null) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Kategori, limit, atau offset berita tidak valid." } }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const data = await getGoogleNews(category as NewsCategory);
    const articles = data.articles.slice(offset, offset + limit);
    return NextResponse.json({ success: true, data: { ...data, articles }, meta: { count: articles.length, total: data.total, category, limit, offset } }, { headers: { "Cache-Control": data.stale ? "no-store" : "public, s-maxage=900, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("[news] all providers unavailable", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Berita belum dapat dimuat dari sumber saat ini. Coba lagi nanti." } }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
