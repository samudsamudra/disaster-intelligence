
"use client";

import { FormEvent, useState } from "react";
import AssistantMessage from "./assistant-message";

type BotEarthquake = {
  magnitude: number;
  place: string;
  source: "BMKG" | "USGS";
  occurredAt: string;
};

type ChatMessage = {
  role: "bot" | "user";
  text: string;
};

function createFallbackReply(question: string, events: BotEarthquake[]) {
  const prompt = question.toLowerCase();
  const strongest = [...events].sort(
    (a, b) => b.magnitude - a.magnitude
  )[0];

  if (
    prompt.includes("aman") ||
    prompt.includes("status") ||
    prompt.includes("risiko")
  ) {
    if (!strongest) {
      return "Belum ada data gempa yang bisa saya baca. Coba muat ulang data terlebih dahulu.";
    }

    return `Status nasional berdasarkan data yang tampil: pantau informasi resmi dan tetap siaga.

**Gempa terbesar yang terdeteksi:** M${strongest.magnitude.toFixed(1)} di ${strongest.place}.`;
  }

  if (
    prompt.includes("harus") ||
    prompt.includes("tindakan") ||
    prompt.includes("evakuasi")
  ) {
    return `Jika merasakan gempa, lakukan langkah berikut:

1. Lindungi kepala dan leher.
2. Berlindung di bawah meja yang kuat.
3. Jauhi kaca dan benda yang berpotensi jatuh.
4. Keluar dengan tenang setelah guncangan berhenti.
5. Ikuti arahan BPBD/BNPB setempat.

> Jangan menyebarkan informasi yang belum terverifikasi.`;
  }

  if (
    prompt.includes("gempa") ||
    prompt.includes("kejadian") ||
    prompt.includes("terbaru")
  ) {
    if (!strongest) {
      return "Belum ada kejadian gempa yang tersedia dari sumber saat ini.";
    }

    return `Berdasarkan data yang tersedia pada antarmuka ini, terdapat **${events.length} kejadian gempa**.

**Gempa terbesar:**
- Magnitudo: M${strongest.magnitude.toFixed(1)}
- Lokasi: ${strongest.place}
- Sumber: ${strongest.source}`;
  }

  return "Saya bisa membantu membaca gempa terbaru, menjelaskan status risiko, atau memberi rekomendasi tindakan kesiapsiagaan.";
}

export function FloatingDisasterBot({
  events,
}: {
  events: BotEarthquake[];
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Halo, saya asisten PantauBencana. Tanyakan kondisi gempa atau tindakan yang perlu dilakukan.",
    },
  ]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = question.trim();

    if (!trimmed || sending) return;

    setMessages((current) => [
      ...current,
      {
        role: "user",
        text: trimmed,
      },
    ]);

    setQuestion("");
    setSending(true);

    try {
      const response = await fetch("/api/v1/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmed,
          events,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        answer?: string;
        error?: string;
      };

      if (!response.ok || !result.success || !result.answer) {
        throw new Error(result.error ?? "Gagal mendapatkan respons AI.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "bot",
          text: result.answer!,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "bot",
          text: createFallbackReply(trimmed, events),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="floating-bot">
      {open && (
        <section
          className="bot-panel"
          aria-label="Asisten PantauBencana"
        >
          <header className="bot-header">
            <div>
              <strong>Asisten PantauBencana</strong>
              <span>Berbasis data di halaman ini</span>
            </div>

            <button
              type="button"
              className="bot-close"
              onClick={() => setOpen(false)}
              aria-label="Tutup chat"
            >
              ×
            </button>
          </header>

          <div className="bot-messages" aria-live="polite">
            {messages.map((message, index) => (
              <div
                className={`bot-message ${message.role}`}
                key={`${message.role}-${index}`}
              >
                {message.role === "bot" ? (
                  <AssistantMessage content={message.text} />
                ) : (
                  <p>{message.text}</p>
                )}
              </div>
            ))}

            {sending && (
              <div className="bot-message bot">
                <p>Memproses pertanyaan...</p>
              </div>
            )}
          </div>

          <form className="bot-form" onSubmit={submit}>
            <input
              disabled={sending}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Tanyakan kondisi..."
              aria-label="Pertanyaan untuk asisten"
            />

            <button
              disabled={sending || !question.trim()}
              type="submit"
            >
              {sending ? "..." : "Kirim"}
            </button>
          </form>
        </section>
      )}

      {!open && (
        <button
          type="button"
          className="bot-launcher"
          onClick={() => setOpen(true)}
          aria-label="Buka asisten PantauBencana"
        >
          <span className="bot-logo">●</span>
          <span className="bot-pulse" />
        </button>
      )}
    </div>
  );
}
