import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { AssistantContextProvider } from "./_components/assistant-context";
import { FloatingDisasterBot } from "./_components/floating-disaster-bot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PantauBencana | Intelijen Bencana Indonesia",
  description: "Fondasi dashboard untuk pemantauan risiko bencana Indonesia.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AssistantContextProvider>
          {children}
          <FloatingDisasterBot />
        </AssistantContextProvider>
      </body>
    </html>
  );
}
