"use client";

import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { useEffect } from "react";
import { type DiveLog } from "@/app/api/logs/data";

// Fix default Leaflet icon paths
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const makeDiveIcon = (selected: boolean) =>
  L.divIcon({
    className: "",
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.63 14 24 14 24S28 23.63 28 14C28 6.27 21.73 0 14 0z"
        fill="${selected ? "#f57c00" : "#1565c0"}" stroke="white" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>`,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -40],
  });

function ratingStars(rating?: number) {
  if (!rating) return null;
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

type Props = {
  logs: DiveLog[];
  selectedId?: number | null;
  onSelect?: (id: number) => void;
};

function FitBounds({ logs }: { logs: DiveLog[] }) {
  const map = useMap();
  useEffect(() => {
    const mapped = logs.filter((l) => l.lat != null && l.lng != null);
    if (mapped.length === 0) return;
    setTimeout(() => {
      const bounds = L.latLngBounds(
        mapped.map((l) => [l.lat as number, l.lng as number] as [number, number])
      );
      map.fitBounds(bounds, { padding: [40, 40] });
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs.length]);
  return null;
}

export default function DiveMap({ logs, selectedId, onSelect }: Props) {
  const mappedLogs = logs.filter((l) => l.lat != null && l.lng != null);

  const centerLat =
    mappedLogs.length > 0
      ? mappedLogs.reduce((s, l) => s + (l.lat as number), 0) / mappedLogs.length
      : 20;
  const centerLng =
    mappedLogs.length > 0
      ? mappedLogs.reduce((s, l) => s + (l.lng as number), 0) / mappedLogs.length
      : 0;

  const selected = mappedLogs.find((l) => l.id === selectedId);

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={mappedLogs.length === 0 ? 2 : 4}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />
      <FitBounds logs={mappedLogs} />
      {selected && (
        <CircleMarker
          center={[selected.lat as number, selected.lng as number]}
          radius={22}
          pathOptions={{ color: "#f57c00", weight: 3, fill: false }}
        />
      )}
      <MarkerClusterGroup chunkedLoading>
        {mappedLogs.map((log) => (
          <Marker
            key={log.id}
            position={[log.lat as number, log.lng as number]}
            icon={makeDiveIcon(log.id === selectedId)}
            eventHandlers={{ click: () => onSelect?.(log.id) }}
          >
            <Popup>
              <div style={{ minWidth: 180, fontSize: 13 }}>
                <strong style={{ fontSize: 15, color: "#1565c0" }}>{log.location}</strong>
                <div style={{ marginTop: 6, color: "#444" }}>
                  <div>📅 {log.date}</div>
                  <div>⬇️ {log.depth} ft · ⏱ {log.duration} min</div>
                  {log.diveType && <div>🤿 {log.diveType}</div>}
                  {log.buddy && <div>👤 {log.buddy}</div>}
                  {log.visibility != null && <div>👁 Visibility: {log.visibility} ft</div>}
                  {log.waterTemp != null && <div>🌡 Water Temp: {log.waterTemp}°F</div>}
                  {log.rating != null && (
                    <div style={{ color: "#f57c00" }}>{ratingStars(log.rating)}</div>
                  )}
                  {log.firstName && (
                    <div style={{ marginTop: 4, color: "#888", fontSize: 12 }}>
                      {log.firstName} {log.lastName}
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
