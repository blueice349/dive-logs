"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon paths broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Props = {
  lat: string;
  lng: string;
  onChange: (lat: string, lng: string) => void;
};

export default function LeafletLocationMap({ lat, lng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const hasCoords = !isNaN(parsedLat) && !isNaN(parsedLng);

  const defaultCenter: [number, number] = hasCoords ? [parsedLat, parsedLng] : [20, 0];
  const defaultZoom = hasCoords ? 10 : 2;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    if (hasCoords) {
      const marker = L.marker(defaultCenter, { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChange(pos.lat.toFixed(6), pos.lng.toFixed(6));
      });
      markerRef.current = marker;
    }

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      onChange(clickLat.toFixed(6), clickLng.toFixed(6));
      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        const marker = L.marker([clickLat, clickLng], { draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onChange(pos.lat.toFixed(6), pos.lng.toFixed(6));
        });
        markerRef.current = marker;
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When lat/lng change from outside (address search), update marker and pan
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!hasCoords) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const pos: [number, number] = [parsedLat, parsedLng];
    if (markerRef.current) {
      markerRef.current.setLatLng(pos);
    } else {
      const marker = L.marker(pos, { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        onChange(p.lat.toFixed(6), p.lng.toFixed(6));
      });
      markerRef.current = marker;
    }
    map.setView(pos, Math.max(map.getZoom(), 10));
  }, [parsedLat, parsedLng, hasCoords, onChange]);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      <div style={{
        position: "absolute",
        bottom: 8,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(255,255,255,0.9)",
        borderRadius: 6,
        padding: "4px 10px",
        fontSize: 12,
        color: "#555",
        pointerEvents: "none",
        zIndex: 1000,
        boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
      }}>
        Click to place marker · Drag marker to adjust
      </div>
    </div>
  );
}
