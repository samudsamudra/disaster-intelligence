    import { NextResponse } from "next/server";

    type Earthquake = {
    id: string;
    source: "BMKG" | "USGS";
    magnitude: number;
    place: string;
    longitude: number;
    latitude: number;
    depthKm: number | null;
    occurredAt: string;
    felt: string | null;
    };

    type JsonRecord = Record<string, unknown>;

    function isJsonRecord(value: unknown): value is JsonRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
    }

    function stringValue(value: unknown): string | null {
    return typeof value === "string" ? value : null;
    }

    const BMKG_LATEST =
    "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json";

    const BMKG_RECENT =
    "https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json";

    const USGS_FEED =
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

    async function fetchJson(url: string) {
    const response = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
        headers: { Accept: "application/json" },
    });

    if (!response.ok) {
        throw new Error(`Provider returned HTTP ${response.status}`);
    }

    return response.json();
    }

    function numberFrom(value: unknown): number | null {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value !== "string") return null;

    const parsed = Number.parseFloat(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
    }

    function parseBmkCoordinate(
    value: unknown,
    direction: "LS" | "LU" | "BT" | "BB",
    ): number | null {
    if (typeof value !== "string") return numberFrom(value);

    const parsed = numberFrom(value);
    if (parsed === null) return null;

    if (direction === "LS" || direction === "BB") {
        return -Math.abs(parsed);
    }

    return Math.abs(parsed);
    }

    function parseBmkEvent(value: unknown): Earthquake | null {
    if (!isJsonRecord(value)) return null;
    const raw = value;

    const coordinates =
        typeof raw.Coordinates === "string"
        ? raw.Coordinates.split(",").map((v) => v.trim())
        : [];

    const latitude =
        coordinates.length === 2
        ? numberFrom(coordinates[0])
        : parseBmkCoordinate(raw?.Lintang, "LS");

    const longitude =
        coordinates.length === 2
        ? numberFrom(coordinates[1])
        : parseBmkCoordinate(raw?.Bujur, "BT");

    const magnitude = numberFrom(raw?.Magnitude);
    const dateTime = stringValue(raw.DateTime);
    const occurredAt = dateTime
        ? new Date(dateTime).toISOString()
        : null;

    if (
        latitude === null ||
        longitude === null ||
        magnitude === null ||
        !occurredAt ||
        Number.isNaN(Date.parse(occurredAt))
    ) {
        return null;
    }

    return {
        id: `bmkg-${occurredAt}-${latitude}-${longitude}`,
        source: "BMKG",
        magnitude,
        place: stringValue(raw.Wilayah) ?? "Lokasi tidak diketahui",
        longitude,
        latitude,
        depthKm: numberFrom(
        String(raw?.Kedalaman ?? "").replace(/[^\d.-]/g, ""),
        ),
        occurredAt,
        felt: stringValue(raw.Dirasakan),
    };
    }

    function parseUsgsEvent(value: unknown): Earthquake | null {
    if (!isJsonRecord(value)) return null;
    const raw = value;

    const geometry = isJsonRecord(raw.geometry) ? raw.geometry : null;
    const coordinates = geometry?.coordinates;
    const properties = isJsonRecord(raw.properties) ? raw.properties : null;

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
        return null;
    }

    const [longitude, latitude, depth] = coordinates;

    if (
        typeof longitude !== "number" ||
        typeof latitude !== "number" ||
        !properties ||
        typeof properties.mag !== "number" ||
        typeof properties.time !== "number"
    ) {
        return null;
    }

    // Batasi USGS pada area geografis Indonesia.
    const isIndonesia =
        longitude >= 94 &&
        longitude <= 142 &&
        latitude >= -12 &&
        latitude <= 7;

    if (!isIndonesia) return null;

    return {
        id: `usgs-${String(raw.id ?? "unknown")}`,
        source: "USGS",
        magnitude: properties.mag,
        place: stringValue(properties.place) ?? "Lokasi tidak diketahui",
        longitude,
        latitude,
        depthKm: typeof depth === "number" ? depth : null,
        occurredAt: new Date(properties.time).toISOString(),
        felt: null,
    };
    }

    export async function GET() {
    const checkedAt = new Date().toISOString();

    const results = await Promise.allSettled([
        fetchJson(BMKG_LATEST),
        fetchJson(BMKG_RECENT),
        fetchJson(USGS_FEED),
    ]);

    const [latestResult, recentResult, usgsResult] = results;

    const events: Earthquake[] = [];

    if (latestResult.status === "fulfilled") {
        const latest = parseBmkEvent(
        latestResult.value?.Infogempa?.gempa,
        );

        if (latest) events.push(latest);
    }

    if (recentResult.status === "fulfilled") {
        const recent = recentResult.value?.Infogempa?.gempa;

        if (Array.isArray(recent)) {
        for (const raw of recent) {
            const event = parseBmkEvent(raw);
            if (event) events.push(event);
        }
        }
    }

    if (usgsResult.status === "fulfilled") {
        const features = usgsResult.value?.features;

        if (Array.isArray(features)) {
        for (const raw of features) {
            const event = parseUsgsEvent(raw);
            if (event) events.push(event);
        }
        }
    }

    // Hilangkan duplikasi berdasarkan waktu, koordinat, dan magnitude.
    const uniqueEvents = Array.from(
        new Map(
        events.map((event) => [
            [
            event.occurredAt,
            event.latitude.toFixed(3),
            event.longitude.toFixed(3),
            event.magnitude,
            ].join("-"),
            event,
        ]),
        ).values(),
    ).sort(
        (a, b) =>
        new Date(b.occurredAt).getTime() -
        new Date(a.occurredAt).getTime(),
    );

    const sources = [
        {
        name: "BMKG",
        status:
            latestResult.status === "fulfilled" ||
            recentResult.status === "fulfilled"
            ? "available"
            : "unavailable",
        },
        {
        name: "USGS",
        status:
            usgsResult.status === "fulfilled"
            ? "available"
            : "unavailable",
        },
    ];

    const availableSources = sources.filter(
        (source) => source.status === "available",
    ).length;

    return NextResponse.json(
        {
        success: true,
        data: uniqueEvents,
        meta: {
            checkedAt,
            total: uniqueEvents.length,
            availableSources,
            status:
            availableSources === 0
                ? "unavailable"
                : availableSources < sources.length
                ? "partial"
                : "available",
            sources,
        },
        },
        {
        headers: {
            "Cache-Control": "no-store",
        },
        },
    );
    }