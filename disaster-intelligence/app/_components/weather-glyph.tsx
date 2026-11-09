type WeatherKind = "unknown" | "sun" | "partly" | "cloud" | "fog" | "rain" | "snow" | "storm";

function kindFor(code?: number | null): WeatherKind {
  if (code == null) return "unknown";
  if ([95, 96, 99].includes(code)) return "storm";
  if (code >= 71 && code <= 77 || code === 85 || code === 86) return "snow";
  if (code >= 51) return "rain";
  if (code >= 45) return "fog";
  if (code === 0) return "sun";
  if (code <= 2) return "partly";
  return "cloud";
}

export function WeatherGlyph({ code, label }: { code?: number | null; label: string }) {
  const kind = kindFor(code);
  const hasSun = kind === "sun" || kind === "partly";
  const hasCloud = !["sun", "unknown"].includes(kind);

  return (
    <svg className="weather-glyph" viewBox="0 0 128 128" role="img" aria-label={label} xmlns="http://www.w3.org/2000/svg">
      <title>{label}</title>
      {hasSun && <g fill="none" stroke="#ffb84d" strokeLinecap="round" strokeWidth="5">
        <path d="M43 10v10M43 74v10M10 47h10M66 47h10M19 23l7 7M60 64l7 7M67 23l-7 7M26 64l-7 7" />
        <circle cx="43" cy="47" r="22" fill="#ffcb55" stroke="#ffa733" strokeWidth="4" />
      </g>}
      {hasCloud && <path d="M34 91h59c12 0 21-9 21-20 0-11-9-20-20-20-3 0-6 1-9 2-5-10-15-16-27-16-15 0-27 11-29 25-10 1-17 8-17 18 0 7 5 11 10 11h12Z" fill="#e8eef5" stroke="#a8b8c9" strokeLinejoin="round" strokeWidth="3" />}
      {kind === "fog" && <g stroke="#9db0c1" strokeLinecap="round" strokeWidth="4"><path d="M24 103h68M37 113h66" /></g>}
      {kind === "rain" && <g stroke="#58baf4" strokeLinecap="round" strokeWidth="5"><path d="M37 103l-5 12M62 103l-5 12M87 103l-5 12" /></g>}
      {kind === "snow" && <g fill="#bde7ff" fontFamily="sans-serif" fontSize="22" fontWeight="700"><text x="30" y="117">✳</text><text x="59" y="117">✳</text><text x="88" y="117">✳</text></g>}
      {kind === "storm" && <path d="m65 95-11 17h12l-6 14 23-22H70l8-9Z" fill="#ffcb55" stroke="#e59e32" strokeLinejoin="round" strokeWidth="2" />}
      {kind === "unknown" && <><circle cx="64" cy="64" r="42" fill="#262b32" stroke="#83909f" strokeWidth="3" /><text x="64" y="84" fill="#d4dbe4" fontFamily="sans-serif" fontSize="64" textAnchor="middle">?</text></>}
    </svg>
  );
}
