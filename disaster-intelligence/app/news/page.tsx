import type { Metadata } from "next";
import { NewsPage } from "../_components/news-page";
import "./news.css";

export const metadata: Metadata = { title: "Warta Bencana | PantauBencana", description: "Berita bencana dan perubahan iklim dari sumber penerbit asli." };

export default function NewsRoute() { return <NewsPage />; }
