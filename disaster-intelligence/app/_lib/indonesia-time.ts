export function formatIndonesiaTime(value: string, timezone = "Asia/Jakarta") {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Belum tersedia";
  try {
    const formatted = new Intl.DateTimeFormat("id-ID", {
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: timezone,
    }).format(date);
    const offset = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "shortOffset" })
      .formatToParts(date).find((part) => part.type === "timeZoneName")?.value;
    const zone = offset === "GMT+7" ? "WIB" : offset === "GMT+8" ? "WITA" : offset === "GMT+9" ? "WIT" : offset ?? timezone;
    return `${formatted} ${zone}`;
  } catch {
    return "Zona waktu belum tersedia";
  }
}
