"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";

type Earthquake = {
  id: string;
  source: "BMKG" | "USGS";
  magnitude: number;
  place: string;
  longitude: number;
  latitude: number;
  depthKm: number | null;
  occurredAt: string;
};

type EarthquakeResponse = {
  success: boolean;
  data: Earthquake[];
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

const INDONESIA_CENTER: [number, number] = [118, -2];

export function EarthquakeMap({ userLocation }: { userLocation: UserLocation | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: INDONESIA_CENTER,
      zoom: 4,
      minZoom: 3,
      maxZoom: 12,
      attributionControl: {},
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
    });

    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: true,
        showZoom: true,
      }),
      "top-right",
    );

    map.on("load", async () => {
      map.addSource("earthquakes", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "earthquake-circles",
        type: "circle",
        source: "earthquakes",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "magnitude"],
            0,
            4,
            3,
            6,
            5,
            10,
            7,
            15,
          ],
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "magnitude"],
            0,
            "#ffffff",
            4,
            "#ff7777",
            6,
            "#ff2525",
            8,
            "#b90000",
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.85,
        },
      });

      map.on("click", "earthquake-circles", (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;

        const coordinates = [...feature.geometry.coordinates] as [number, number];
        const properties = feature.properties ?? {};
        const popupContent = document.createElement("div");
        const title = document.createElement("strong");
        const place = document.createElement("p");
        const details = document.createElement("small");

        title.textContent = `Gempa M ${Number(properties.magnitude).toFixed(1)}`;
        place.textContent = String(properties.place ?? "Lokasi tidak diketahui");
        details.textContent = `Sumber: ${String(properties.source)}\nKedalaman: ${properties.depthKm ?? "Tidak diketahui"} km`;
        details.style.whiteSpace = "pre-line";
        popupContent.append(title, place, details);

        new maplibregl.Popup()
          .setLngLat(coordinates)
          .setDOMContent(popupContent)
          .addTo(map);
      });

      map.on("mouseenter", "earthquake-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "earthquake-circles", () => {
        map.getCanvas().style.cursor = "";
      });

      async function refreshEarthquakes() {
        try {
          const response = await fetch("/api/v1/earthquakes", {
            cache: "no-store",
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const result = (await response.json()) as EarthquakeResponse;
          if (!result.success || !Array.isArray(result.data)) {
            throw new Error("API returned unsuccessful response");
          }

          const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
            type: "FeatureCollection",
            features: result.data.map((earthquake) => ({
              type: "Feature",
              id: earthquake.id,
              geometry: {
                type: "Point",
                coordinates: [earthquake.longitude, earthquake.latitude],
              },
              properties: {
                magnitude: earthquake.magnitude,
                place: earthquake.place,
                source: earthquake.source,
                depthKm: earthquake.depthKm,
                occurredAt: earthquake.occurredAt,
              },
            })),
          };

          const source = map.getSource("earthquakes") as
            | maplibregl.GeoJSONSource
            | undefined;
          source?.setData(geojson);
        } catch (error) {
          console.error("Earthquake map error:", error);
        }
      }

      await refreshEarthquakes();
      const interval = window.setInterval(refreshEarthquakes, 60_000);
      map.once("remove", () => window.clearInterval(interval));
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    mapRef.current.flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 7,
      essential: true,
    });
  }, [userLocation]);

  return (
    <div className="earthquake-map-wrapper">
      <div
        ref={containerRef}
        className="earthquake-map"
        aria-label="Peta Indonesia dengan marker gempa bumi"
      />
    </div>
  );
}
