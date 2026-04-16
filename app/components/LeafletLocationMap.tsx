"use client";

import { useEffect, useRef } from "react";
import type L from "leaflet";

type Props = {
  lat: string;
  lng: string;
  onChange: (lat: string, lng: string) => void;
};

export default function LeafletLocationMap({ lat, lng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Dynamic import to avoid SSR issues
    import("leaflet").then((L) => {
      // Fix default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!containerRef.current) return;

      const initLat = parseFloat(lat) || 20;
      const initLng = parseFloat(lng) || 0;
      const zoom = lat && lng ? 13 : 2;

      const map = L.map(containerRef.current).setView([initLat, initLng], zoom);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      // Place initial marker if coords exist
      if (lat && lng) {
        const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);
        markerRef.current = marker;
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onChange(pos.lat.toFixed(6), pos.lng.toFixed(6));
        });
      }

      // Click to place/move marker
      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([clickLat, clickLng]);
        } else {
          const marker = L.marker([clickLat, clickLng], { draggable: true }).addTo(map);
          markerRef.current = marker;
          marker.on("dragend", () => {
            const pos = marker.getLatLng();
            onChange(pos.lat.toFixed(6), pos.lng.toFixed(6));
          });
        }
        onChange(clickLat.toFixed(6), clickLng.toFixed(6));
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pan map and move marker when lat/lng props change externally
  useEffect(() => {
    if (!mapRef.current) return;
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (isNaN(parsedLat) || isNaN(parsedLng)) return;

    import("leaflet").then((L) => {
      if (!mapRef.current) return;
      mapRef.current.setView([parsedLat, parsedLng], 13);
      if (markerRef.current) {
        markerRef.current.setLatLng([parsedLat, parsedLng]);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
        const marker = L.marker([parsedLat, parsedLng], { draggable: true }).addTo(
          mapRef.current
        );
        markerRef.current = marker;
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onChange(pos.lat.toFixed(6), pos.lng.toFixed(6));
        });
      }
    });
  }, [lat, lng, onChange]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={containerRef} style={{ height: 300, width: "100%", borderRadius: 8 }} />
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(255,255,255,0.85)",
          padding: "4px 10px",
          borderRadius: 4,
          fontSize: 12,
          color: "#555",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          zIndex: 1000,
        }}
      >
        Click to place marker · Drag marker to adjust
      </div>
    </div>
  );
}
