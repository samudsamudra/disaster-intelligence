"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Hotspot, WeatherData } from "../_lib/api/climate";

export type ClimateLayer = "rainfall" | "hotspot" | "drought" | "temperature" | "wind";

const INDONESIA_CENTER: [number, number] = [118, -2];

export function ClimateMap({
  activeLayer,
  weather,
  hotspots,
  showWeather,
  showHotspots,
}: {
  activeLayer: ClimateLayer;
  weather: WeatherData | null;
  hotspots: Hotspot[];
  showWeather: boolean;
  showHotspots: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);

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
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm", minzoom: 0, maxzoom: 19 }],
      },
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.on("load", () => {
    setReady(true);
    map.addSource("climate-hotspots", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: "climate-hotspots",
      type: "circle",
      source: "climate-hotspots",
      layout: { visibility: "none" },
      paint: {
        "circle-radius": 5,
        "circle-color": "#e32626",
        "circle-stroke-color": "#fff",
        "circle-stroke-width": 1,
      },
    });
    map.addSource("climate-weather-location", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: "climate-weather-location",
      type: "circle",
      source: "climate-weather-location",
      layout: { visibility: "none" },
      paint: {
        "circle-radius": 8,
        "circle-color": "#fff",
        "circle-stroke-color": "#111",
        "circle-stroke-width": 2,
      },
    });

    map.on("click", "climate-hotspots", (event) => {
      const feature = event.features?.[0];
      if (!feature || feature.geometry.type !== "Point") return;
      const properties = feature.properties ?? {};
      new maplibregl.Popup({ offset: 12 })
        .setLngLat(feature.geometry.coordinates as [number, number])
        .setText(`NASA FIRMS · ${String(properties.sensor ?? "VIIRS")} · Waktu UTC: ${String(properties.acquiredAt ?? "Tidak tersedia")} · Confidence: ${String(properties.confidence ?? "Tidak tersedia")} · Satelit: ${String(properties.satellite ?? "Tidak tersedia")} · Deteksi satelit bukan kebakaran terkonfirmasi.`)
        .addTo(map);
    });
    map.on("mouseenter", "climate-hotspots", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "climate-hotspots", () => { map.getCanvas().style.cursor = ""; });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const hotspotSource = map.getSource("climate-hotspots") as maplibregl.GeoJSONSource | undefined;
    hotspotSource?.setData({
      type: "FeatureCollection",
      features: hotspots.filter((hotspot) => Number.isFinite(hotspot.latitude) && Number.isFinite(hotspot.longitude) && Math.abs(hotspot.latitude) <= 90 && Math.abs(hotspot.longitude) <= 180).map((hotspot, index) => ({
        type: "Feature",
        id: `hotspot-${index}`,
        geometry: { type: "Point", coordinates: [hotspot.longitude, hotspot.latitude] },
        properties: hotspot,
      })),
    });
    const weatherSource = map.getSource("climate-weather-location") as maplibregl.GeoJSONSource | undefined;
    const location = weather?.location;
    weatherSource?.setData({
      type: "FeatureCollection",
      features: location?.latitude != null && location.longitude != null && Number.isFinite(location.latitude) && Number.isFinite(location.longitude) && Math.abs(location.latitude) <= 90 && Math.abs(location.longitude) <= 180 ? [{
        type: "Feature",
        geometry: { type: "Point", coordinates: [location.longitude, location.latitude] },
        properties: {},
      }] : [],
    });
    if (map.getLayer("climate-hotspots")) map.setLayoutProperty("climate-hotspots", "visibility", showHotspots ? "visible" : "none");
    if (map.getLayer("climate-weather-location")) map.setLayoutProperty("climate-weather-location", "visibility", showWeather ? "visible" : "none");
    map.resize();
    if (showHotspots) map.fitBounds([[95, -11], [141, 6]], { padding: 30, duration: 400 });
    if (showWeather && location?.longitude != null && location.latitude != null && Math.abs(location.latitude) <= 90 && Math.abs(location.longitude) <= 180) map.easeTo({ center: [location.longitude, location.latitude], zoom: 10 });
  }, [hotspots, showHotspots, showWeather, weather, ready]);

  return (
    <div className="climate-map-wrapper">
      <div ref={containerRef} className="climate-map" aria-label={`Peta Pantau Iklim, layer ${activeLayer}`} />
      {(activeLayer === "drought" || (showHotspots ? hotspots.length === 0 : !showWeather)) && <div className="climate-map-empty" role="status">
        <strong>Layer belum tersedia</strong>
        <span>{activeLayer === "drought" ? "Sumber kekeringan belum terintegrasi." : showHotspots ? "Belum ada titik untuk ditampilkan. Periksa status NASA FIRMS dan periode di halaman ini." : "Prakiraan wilayah belum tersedia."}</span>
      </div>}
    </div>
  );
}
