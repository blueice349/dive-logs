"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { type DiveLog } from "@/app/api/logs/data";
import { type PublicUser } from "@/app/types/user";
import AppHeader from "./AppHeader";
import Spinner from "./Spinner";
import "leaflet/dist/leaflet.css";

const DiveMap = dynamic(() => import("./DiveMap"), { ssr: false });

type Filter = "mine" | "buddy" | "all";

const FILTER_LABEL: Record<Filter, string> = { mine: "My Dives", buddy: "Buddy Dives", all: "All Dives" };

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 10,
        padding: "14px 18px",
        flex: 1,
        minWidth: 110,
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        border: "1px solid #e0e7ef",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color: "#1565c0" }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{label}</div>
      {sub && (
        <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{sub}</div>
      )}
    </div>
  );
}

export default function MapPage({ user }: { user: PublicUser }) {
  const [logs, setLogs] = useState<DiveLog[]>([]);
  const [filter, setFilter] = useState<Filter>("mine");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const listRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    setLoading(true);
    setSelectedId(null);
    const url = filter === "all" ? "/api/logs?filter=all" : filter === "buddy" ? "/api/logs?filter=buddy" : "/api/logs";
    fetch(url).then((r) => {
      if (r.ok)
        r.json().then((data) => {
          setLogs(data);
          setLoading(false);
        });
      else { setLogs([]); setLoading(false); }
    });
  }, [filter]);

  const mappable = logs.filter((l) => l.lat != null && l.lng != null);

  // Stats
  const totalDives = logs.length;
  const mappedCount = mappable.length;
  const uniqueLocations = new Set(
    mappable.map((l) => `${l.lat?.toFixed(2)},${l.lng?.toFixed(2)}`)
  ).size;
  const deepest = mappable.length
    ? Math.max(...mappable.map((l) => l.depth))
    : 0;
  const avgRating = (() => {
    const rated = logs.filter((l) => l.rating != null);
    if (!rated.length) return null;
    return (rated.reduce((s, l) => s + l.rating!, 0) / rated.length).toFixed(1);
  })();

  const handleSelectMarker = (id: number) => {
    setSelectedId(id);
    const el = listRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const formatDate = (d: string) => {
    const parts = d.split("T")[0].split("-");
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  };

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        minHeight: "100vh",
        background: "#f0f4f8",
      }}
    >
      <AppHeader user={user} />

      {/* Hero map — full width */}
      <div style={{ position: "relative", height: 480, background: "#0d47a1" }}>
        {/* Always keep DiveMap mounted to avoid Leaflet _leaflet_pos errors on remount */}
        <DiveMap
          logs={logs}
          selectedId={selectedId}
          onSelect={handleSelectMarker}
        />
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(13,71,161,0.6)",
              zIndex: 999,
            }}
          >
            <Spinner />
          </div>
        )}

        {/* Overlay: title + filter pill */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 50,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 12,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              background: "rgba(13,71,161,0.85)",
              backdropFilter: "blur(6px)",
              borderRadius: 10,
              padding: "8px 16px",
              color: "white",
              fontWeight: 700,
              fontSize: 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            🗺 {FILTER_LABEL[filter]}
          </div>
        </div>

        {/* Filter toggle — top right */}
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 1000,
            display: "flex",
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(6px)",
            borderRadius: 8,
            padding: 3,
            gap: 2,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {(["mine", "buddy", ...(user.isAdmin ? ["all"] : [])] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? "#1565c0" : "transparent",
                border: "none",
                borderRadius: 6,
                padding: "5px 14px",
                fontSize: 13,
                fontWeight: filter === f ? 700 : 400,
                color: filter === f ? "white" : "#555",
                cursor: "pointer",
              }}
            >
              {FILTER_LABEL[f]}
            </button>
          ))}
        </div>

        {/* Bottom legend */}
        {!loading && (
          <div
            style={{
              position: "absolute",
              bottom: 12,
              right: 12,
              zIndex: 1000,
              background: "rgba(255,255,255,0.88)",
              backdropFilter: "blur(4px)",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              color: "#555",
              boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
            }}
          >
            {mappedCount === 0
              ? "No dive locations yet"
              : `${mappedCount} dive${mappedCount !== 1 ? "s" : ""} on map`}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
        {/* Stat cards */}
        {!loading && (
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            <StatCard label="Total Dives" value={totalDives} />
            <StatCard label="Mapped Dives" value={mappedCount} />
            <StatCard label="Unique Locations" value={uniqueLocations} />
            {deepest > 0 && (
              <StatCard label="Deepest Dive" value={`${deepest} ft`} />
            )}
            {avgRating && (
              <StatCard label="Avg Rating" value={`${avgRating} ★`} />
            )}
          </div>
        )}

        {/* Dive list */}
        {!loading && mappable.length === 0 && (
          <div
            style={{
              background: "white",
              borderRadius: 10,
              padding: "32px 20px",
              textAlign: "center",
              color: "#888",
              border: "1px solid #e0e7ef",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🗺</div>
            <p style={{ margin: 0, fontSize: 15 }}>
              No dives with coordinates yet.
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13 }}>
              Add a location when logging a dive to see it on the map.
            </p>
          </div>
        )}

        {!loading && mappable.length > 0 && (
          <>
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: 17,
                color: "#1976d2",
                fontWeight: 700,
              }}
            >
              Dive Locations
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {mappable.map((log) => {
                const isSelected = log.id === selectedId;
                return (
                  <div
                    key={log.id}
                    ref={(el) => {
                      listRefs.current[log.id] = el;
                    }}
                    onClick={() => setSelectedId(isSelected ? null : log.id)}
                    style={{
                      background: "white",
                      borderRadius: 10,
                      padding: "12px 16px",
                      border: `2px solid ${isSelected ? "#e65100" : "#e0e7ef"}`,
                      display: "flex",
                      gap: 14,
                      alignItems: "center",
                      cursor: "pointer",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                      boxShadow: isSelected
                        ? "0 2px 12px rgba(230,81,0,0.12)"
                        : "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: isSelected ? "#fff3e0" : "#e3f0ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      🤿
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 15,
                          color: isSelected ? "#e65100" : "#1565c0",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {log.location}
                      </div>
                      <div
                        style={{ fontSize: 12, color: "#888", marginTop: 2 }}
                      >
                        {formatDate(log.date)}
                        {log.diveType && ` · ${log.diveType}`}
                        {log.buddy && ` · 👤 ${log.buddy}`}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        fontSize: 13,
                        color: "#555",
                        flexShrink: 0,
                      }}
                    >
                      <span title="Depth">⬇️ {log.depth} ft</span>
                      <span title="Duration">⏱ {log.duration} min</span>
                      {log.rating != null && (
                        <span style={{ color: "#f59e0b" }}>
                          {"★".repeat(log.rating)}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#bbb",
                        flexShrink: 0,
                        textAlign: "right",
                      }}
                    >
                      {log.lat?.toFixed(4)}
                      <br />
                      {log.lng?.toFixed(4)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
