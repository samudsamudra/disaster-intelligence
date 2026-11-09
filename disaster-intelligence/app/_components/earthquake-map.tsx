"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
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

function focusCamera(map: maplibregl.Map, longitude: number, latitude: number) {
  map.stop();
  map.resize();
  map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
  map.flyTo({
    center: [longitude, latitude],
    zoom: 12,
    bearing: 0,
    pitch: 0,
    padding: { top: 24, bottom: 24, left: 24, right: 24 },
    duration: 900,
  });
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function hasValidCoordinates(event: Earthquake) {
  return Number.isFinite(event.longitude)
    && Number.isFinite(event.latitude)
    && event.longitude >= -180
    && event.longitude <= 180
    && event.latitude >= -90
    && event.latitude <= 90;
}

function showEventPopup(
  map: maplibregl.Map,
  popupRef: MutableRefObject<maplibregl.Popup | null>,
  event: Earthquake,
) {
  if (!hasValidCoordinates(event)) return;

  const popupContent = document.createElement("div");
  popupContent.className = "earthquake-popup";
  const eyebrow = document.createElement("span");
  const title = document.createElement("strong");
  const place = document.createElement("p");
  const details = document.createElement("small");

  eyebrow.textContent = "GEMPA BUMI";
  title.textContent = `Gempa M ${event.magnitude.toFixed(1)}`;
  place.textContent = event.place || "Lokasi tidak diketahui";
  details.textContent = `${formatEventTime(event.occurredAt)} WIB\n${event.source} · Kedalaman ${event.depthKm ?? "Tidak diketahui"} km\n${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)}`;
  details.style.whiteSpace = "pre-line";
  popupContent.append(eyebrow, title, place, details);

  popupRef.current?.remove();
  popupRef.current = new maplibregl.Popup({ anchor: "bottom", maxWidth: "240px", focusAfterOpen: false })
    .setOffset(14)
    .setLngLat([event.longitude, event.latitude])
    .setDOMContent(popupContent)
    .addTo(map);
}

export function EarthquakeMap({
  userLocation,
  onEventSelect,
  selectedEvent,
}: {
  userLocation: UserLocation | null;
  onEventSelect: (eventId: string) => void;
  selectedEvent: Earthquake | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onEventSelectRef = useRef(onEventSelect);
  const selectedEventRef = useRef(selectedEvent);
  const selectedFeatureIdRef = useRef<string | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    onEventSelectRef.current = onEventSelect;
  }, [onEventSelect]);

  useEffect(() => {
    selectedEventRef.current = selectedEvent;
  }, [selectedEvent]);

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
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

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

      map.addLayer({
        id: "earthquake-selected-ring",
        type: "circle",
        source: "earthquakes",
        paint: {
          "circle-radius": 18,
          "circle-color": "#ffffff",
          "circle-opacity": 0,
          "circle-stroke-color": "#e32626",
          "circle-stroke-width": 3,
          "circle-stroke-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            1,
            0,
          ],
        },
      });

      function validCoordinates(event: Earthquake) {
        return hasValidCoordinates(event);
      }

      function focusEvent(event: Earthquake) {
        if (!validCoordinates(event)) return;

        map.resize();
        if (selectedFeatureIdRef.current) {
          map.setFeatureState(
            { source: "earthquakes", id: selectedFeatureIdRef.current },
            { selected: false },
          );
        }

        selectedFeatureIdRef.current = event.id;
        map.setFeatureState(
          { source: "earthquakes", id: event.id },
          { selected: true },
        );
        focusCamera(map, event.longitude, event.latitude);
        showEventPopup(map, popupRef, event);
      }

      map.on("click", "earthquake-circles", (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;

        const properties = feature.properties ?? {};
        const eventId = String(feature.id ?? "");
        onEventSelectRef.current(eventId);
        const coordinates = [...feature.geometry.coordinates] as [number, number];
        map.resize();
        focusCamera(map, coordinates[0], coordinates[1]);
        showEventPopup(map, popupRef, {
          id: eventId,
          source: String(properties.source) as Earthquake["source"],
          magnitude: Number(properties.magnitude),
          place: String(properties.place ?? ""),
          longitude: coordinates[0],
          latitude: coordinates[1],
          depthKm: properties.depthKm == null ? null : Number(properties.depthKm),
          occurredAt: String(properties.occurredAt),
        });
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
            features: result.data.filter(hasValidCoordinates).map((earthquake) => ({
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
          const currentEvent = selectedEventRef.current;
          if (currentEvent && validCoordinates(currentEvent) && selectedFeatureIdRef.current !== currentEvent.id) {
            window.requestAnimationFrame(() => focusEvent(currentEvent));
          }
        } catch (error) {
          console.error("Earthquake map error:", error);
        }
      }

      const currentEvent = selectedEventRef.current;
      if (currentEvent) focusEvent(currentEvent);
      await refreshEarthquakes();
      const interval = window.setInterval(refreshEarthquakes, 60_000);
      map.once("remove", () => window.clearInterval(interval));
    });

    const popupAtSetup = popupRef.current;
    return () => {
      resizeObserver.disconnect();
      popupAtSetup?.remove();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userLocation || !Number.isFinite(userLocation.latitude) || !Number.isFinite(userLocation.longitude)) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    if (!userMarkerRef.current) {
      const element = document.createElement("div");
      element.className = "user-location-pin";
      element.setAttribute("aria-label", "Lokasi Anda");
      element.setAttribute("title", "Lokasi Anda");
      userMarkerRef.current = new maplibregl.Marker({ element, anchor: "bottom" })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map);
    }
    userMarkerRef.current.setLngLat([userLocation.longitude, userLocation.latitude]);
    if (selectedEventRef.current) return;
    map.resize();
    map.flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 13,
      essential: true,
    });
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedEvent || !map.isStyleLoaded()) return;

    const event = selectedEvent;
    if (!hasValidCoordinates(event)) return;

    map.resize();
    if (selectedFeatureIdRef.current) {
      map.setFeatureState(
        { source: "earthquakes", id: selectedFeatureIdRef.current },
        { selected: false },
      );
    }

    selectedFeatureIdRef.current = event.id;
    map.setFeatureState({ source: "earthquakes", id: event.id }, { selected: true });
    focusCamera(map, event.longitude, event.latitude);
    showEventPopup(map, popupRef, event);
  }, [selectedEvent]);

  return (
    <div className="earthquake-map-wrapper">
      {userLocation && <button type="button" className="climate-map-view" onClick={() => mapRef.current?.flyTo({ center: [userLocation.longitude, userLocation.latitude], zoom: 13, essential: true })}>Kembali ke lokasi saya</button>}
      <div
        ref={containerRef}
        className="earthquake-map"
        aria-label="Peta Indonesia dengan marker gempa bumi"
      />
    </div>
  );
}
