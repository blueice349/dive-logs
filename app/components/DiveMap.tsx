"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { type DiveLog } from "@/app/api/logs/data";

// Custom dive pin SVG — blue for normal, orange for selected
const makeIcon = (selected: boolean) =>
  L.divIcon({
    className: "",
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
      <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27S30 25.5 30 15C30 6.716 23.284 0 15 0z"
        fill="${selected ? "#e65100" : "#1565c0"}" stroke="white" stroke-width="2"/>
      <text x="15" y="20" text-anchor="middle" font-size="13" fill="white">🤿</text>
    </svg>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -44],
  });

function FitBounds({ logs }: { logs: DiveLog[] }) {
  const map = useMap();
  useEffect(() => {
    const points = logs
      .filter((l) => l.lat != null && l.lng != null)
      .map((l) => [l.lat!, l.lng!] as [number, number]);
    if (points.length === 0) return;
    // Defer so clusters have time to render before fitBounds runs
    const id = setTimeout(() => {
      if (points.length === 1) {
        map.setView(points[0], 12);
      } else {
        map.fitBounds(L.latLngBounds(points), { padding: [60, 60] });
      }
    }, 100);
    return () => clearTimeout(id);
  }, [logs, map]);
  return null;
}

export default function DiveMap({
  logs,
  selectedId,
  onSelect,
}: {
  logs: DiveLog[];
  selectedId?: number | null;
  onSelect?: (id: number) => void;
}) {
  const mappable = logs.filter((l) => l.lat != null && l.lng != null);

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <FitBounds logs={mappable} />

      <MarkerClusterGroup
        chunkedLoading
        showCoverageOnHover={false}
        maxClusterRadius={50}
      >
        {mappable.map((log) => {
          const isSelected = log.id === selectedId;
          return (
            <Marker
              key={log.id}
              position={[log.lat!, log.lng!]}
              icon={makeIcon(isSelected)}
              eventHandlers={{ click: () => onSelect?.(log.id) }}
            >
              <Popup>
                <div style={{ minWidth: 180, fontFamily: "system-ui, sans-serif" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1565c0", marginBottom: 6, borderBottom: "1px solid #e0e7ef", paddingBottom: 6 }}>
                    {log.location}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 13, color: "#444" }}>
                    <span>📅 {log.date.split("T")[0]}</span>
                    <span>⬇️ {log.depth} ft</span>
                    <span>⏱ {log.duration} min</span>
                    {log.diveType && <span>🤿 {log.diveType}</span>}
                    {log.buddy && <span>👤 {log.buddy}</span>}
                    {log.visibility != null && <span>👁 {log.visibility} ft visibility</span>}
                    {log.waterTemp != null && <span>🌡 {log.waterTemp}°F</span>}
                    {log.rating != null && (
                      <span style={{ color: "#f59e0b" }}>
                        {"★".repeat(log.rating)}{"☆".repeat(5 - log.rating)}
                      </span>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>

      {/* Highlight ring for selected marker */}
      {mappable.filter((l) => l.id === selectedId).map((log) => (
        <CircleMarker
          key={`sel-${log.id}`}
          center={[log.lat!, log.lng!]}
          radius={22}
          pathOptions={{ color: "#e65100", weight: 3, fillOpacity: 0, opacity: 0.7, dashArray: "6 4" }}
        />
      ))}
    </MapContainer>
  );
}
