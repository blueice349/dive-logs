"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { type DiveLog } from "@/app/api/logs/data";
import { type PublicUser } from "@/app/types/user";
import AppHeader from "./AppHeader";
import Spinner from "./Spinner";

const DiveMap = dynamic(() => import("./DiveMap"), { ssr: false });

type Props = {
  user: PublicUser;
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 10,
        padding: "14px 18px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        minWidth: 0,
        flex: 1,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color: "#1565c0" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function MapPage({ user }: Props) {
  const [logs, setLogs] = useState<DiveLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    const url =
      user.isAdmin && showAll ? "/api/logs?all=true" : "/api/logs";
    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((data: DiveLog[]) => {
        setLogs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user.isAdmin, showAll]);

  const mappedLogs = logs.filter((l) => l.lat != null && l.lng != null);
  const uniqueLocations = new Set(logs.map((l) => l.location)).size;
  const deepest = logs.length > 0 ? Math.max(...logs.map((l) => l.depth)) : 0;
  const avgRating =
    logs.filter((l) => l.rating != null).length > 0
      ? (
          logs.filter((l) => l.rating != null).reduce((s, l) => s + (l.rating as number), 0) /
          logs.filter((l) => l.rating != null).length
        ).toFixed(1)
      : "—";

  const handleSelect = (id: number) => {
    setSelectedId(id);
    const el = rowRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa" }}>
      <AppHeader user={user} />

      {/* Hero map */}
      <div style={{ position: "relative", height: 480, background: "#dce8f5" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <DiveMap logs={logs} selectedId={selectedId} onSelect={handleSelect} />
        </div>
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,255,255,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 600,
            }}
          >
            <Spinner />
          </div>
        )}
        {/* Title overlay */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            background: "rgba(255,255,255,0.92)",
            borderRadius: 8,
            padding: "8px 14px",
            zIndex: 500,
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 16, color: "#1565c0" }}>Dive Map</span>
        </div>
        {/* Admin filter toggle */}
        {user.isAdmin === 1 && (
          <div
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              zIndex: 500,
            }}
          >
            <button
              onClick={() => setShowAll((v) => !v)}
              style={{
                background: showAll ? "#1565c0" : "white",
                color: showAll ? "white" : "#1565c0",
                border: "1px solid #1565c0",
                borderRadius: 6,
                padding: "7px 14px",
                fontSize: 13,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              }}
            >
              {showAll ? "All Divers" : "My Dives"}
            </button>
          </div>
        )}
        {/* Dive count legend */}
        <div
          style={{
            position: "absolute",
            bottom: 14,
            right: 14,
            background: "rgba(255,255,255,0.92)",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 13,
            color: "#444",
            zIndex: 500,
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}
        >
          {mappedLogs.length} of {logs.length} dives mapped
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>
        {/* Stat cards */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          <StatCard label="Total Dives" value={logs.length} />
          <StatCard label="Mapped Dives" value={mappedLogs.length} />
          <StatCard label="Unique Locations" value={uniqueLocations} />
          <StatCard label="Deepest Dive" value={deepest > 0 ? `${deepest} ft` : "—"} />
          <StatCard label="Avg Rating" value={avgRating} />
        </div>

        {/* Dive list */}
        {logs.length === 0 && !loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              color: "#888",
              background: "white",
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌊</div>
            <p style={{ fontSize: 17, fontWeight: 600, color: "#555" }}>No dive logs yet</p>
            <p style={{ fontSize: 14, marginTop: 6 }}>
              Add a dive with coordinates to see it appear on the map.
            </p>
          </div>
        ) : (
          <div
            style={{
              background: "white",
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid #eee",
                fontWeight: 600,
                fontSize: 14,
                color: "#444",
              }}
            >
              Dive Log
            </div>
            {logs.map((log) => {
              const isSel = log.id === selectedId;
              return (
                <div
                  key={log.id}
                  ref={(el) => { rowRefs.current[log.id] = el; }}
                  onClick={() => {
                    if (log.lat != null && log.lng != null) {
                      setSelectedId(log.id === selectedId ? null : log.id);
                    }
                  }}
                  style={{
                    padding: "12px 18px",
                    borderBottom: "1px solid #f0f0f0",
                    cursor: log.lat != null ? "pointer" : "default",
                    background: isSel ? "#fff8e1" : "white",
                    borderLeft: isSel ? "3px solid #f57c00" : "3px solid transparent",
                    transition: "background 0.15s",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        color: isSel ? "#f57c00" : "#222",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {log.location}
                    </div>
                    <div style={{ fontSize: 13, color: "#777", marginTop: 2 }}>
                      {log.date} · {log.depth} ft · {log.duration} min
                      {log.diveType ? ` · ${log.diveType}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                    {log.rating != null && (
                      <span style={{ fontSize: 12, color: "#f57c00" }}>
                        {"★".repeat(log.rating)}{"☆".repeat(5 - log.rating)}
                      </span>
                    )}
                    {log.lat != null ? (
                      <span style={{ fontSize: 11, color: "#1565c0" }}>📍 mapped</span>
                    ) : (
                      <span style={{ fontSize: 11, color: "#bbb" }}>no coords</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
