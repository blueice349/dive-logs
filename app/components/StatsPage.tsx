"use client";

import { useEffect, useState } from "react";
import { type DiveLog } from "@/app/api/logs/data";
import { type PublicUser } from "@/app/types/user";
import AppHeader from "./AppHeader";
import Spinner from "./Spinner";
import { Card } from "@/components/ui/form";

function sacRate(log: DiveLog): number | null {
  if (log.tankStart == null || log.tankEnd == null || log.depth == null || log.duration == null || log.duration === 0) return null;
  return ((log.tankStart - log.tankEnd) * 33) / ((log.depth + 33) * log.duration);
}

function fmt(n: number, decimals = 1) {
  return n.toFixed(decimals);
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card style={{ textAlign: "center", padding: "20px 16px", marginBottom: 0 }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: "#1565c0" }}>{value}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#333", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{sub}</div>}
    </Card>
  );
}

type Filter = "mine" | "buddy" | "all";

const FILTER_LABEL: Record<Filter, string> = { mine: "My Dives", buddy: "Buddy Dives", all: "All Dives" };

export default function StatsPage({ user }: { user: PublicUser }) {
  const [logs, setLogs] = useState<DiveLog[]>([]);
  const [filter, setFilter] = useState<Filter>("mine");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = filter === "all" ? "/api/logs?filter=all" : filter === "buddy" ? "/api/logs?filter=buddy" : "/api/logs";
    fetch(url).then((r) => {
      if (r.ok) r.json().then((data) => { setLogs(data); setLoading(false); });
      else { setLogs([]); setLoading(false); }
    });
  }, [filter]);

  const tabs: Filter[] = ["mine", "buddy", ...(user.isAdmin ? ["all" as Filter] : [])];
  const toggle = (
    <div style={{ display: "flex", background: "#e0e7ef", borderRadius: 8, padding: 3, gap: 2, width: "fit-content", marginBottom: 20 }}>
      {tabs.map((f) => (
        <button
          key={f}
          onClick={() => setFilter(f)}
          style={{ background: filter === f ? "white" : "transparent", border: "none", borderRadius: 6, padding: "5px 16px", fontSize: 14, fontWeight: filter === f ? 600 : 400, color: filter === f ? "#1565c0" : "#555", cursor: "pointer", boxShadow: filter === f ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
        >
          {FILTER_LABEL[f]}
        </button>
      ))}
    </div>
  );

  if (loading || logs.length === 0) {
    return (
      <main style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f0f4f8" }}>
        <AppHeader user={user} />
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
          <h1 style={{ margin: "0 0 20px", fontSize: 28 }}>{FILTER_LABEL[filter]} Stats</h1>
          {toggle}
          {loading ? <Spinner /> : (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#888" }}>
              {filter === "buddy" ? "No buddy dives yet. Dives where you're confirmed as a buddy will appear here." : "No dive logs yet. Start logging dives to see your stats!"}
            </div>
          )}
        </div>
      </main>
    );
  }

  // Core stats
  const totalDives = logs.length;
  const totalMinutes = logs.reduce((s, l) => s + (l.duration ?? 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;
  const deepest = Math.max(...logs.map((l) => l.depth ?? 0));
  const avgDepth = logs.reduce((s, l) => s + (l.depth ?? 0), 0) / totalDives;
  const avgDuration = totalMinutes / totalDives;

  const ratedLogs = logs.filter((l) => l.rating != null);
  const avgRating = ratedLogs.length ? ratedLogs.reduce((s, l) => s + l.rating!, 0) / ratedLogs.length : null;

  // SAC rate
  const sacLogs = logs.map(sacRate).filter((v): v is number => v !== null);
  const avgSac = sacLogs.length ? sacLogs.reduce((a, b) => a + b, 0) / sacLogs.length : null;

  // Top locations
  const locationCount: Record<string, number> = {};
  logs.forEach((l) => { locationCount[l.location] = (locationCount[l.location] ?? 0) + 1; });
  const topLocations = Object.entries(locationCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Dive type breakdown
  const typeCount: Record<string, number> = {};
  logs.forEach((l) => { if (l.diveType) typeCount[l.diveType] = (typeCount[l.diveType] ?? 0) + 1; });
  const typeEntries = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);

  // Dives per month (last 12 months)
  const now = new Date();
  const months: { label: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const count = logs.filter((l) => l.date.startsWith(key)).length;
    months.push({ label, count });
  }
  const maxMonthCount = Math.max(...months.map((m) => m.count), 1);

  // Visibility & temp averages
  const visLogs = logs.filter((l) => l.visibility != null);
  const avgVis = visLogs.length ? visLogs.reduce((s, l) => s + l.visibility!, 0) / visLogs.length : null;
  const tempLogs = logs.filter((l) => l.waterTemp != null);
  const avgTemp = tempLogs.length ? tempLogs.reduce((s, l) => s + l.waterTemp!, 0) / tempLogs.length : null;

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f0f4f8" }}>
      <AppHeader user={user} />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
        <h1 style={{ margin: "0 0 20px", fontSize: 28 }}>{FILTER_LABEL[filter]} Stats</h1>
        {toggle}

        {/* Top stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16, marginBottom: 24 }}>
          <StatCard label="Total Dives" value={String(totalDives)} />
          <StatCard label="Bottom Time" value={`${totalHours}h ${remainingMins}m`} sub={`${totalMinutes} min total`} />
          <StatCard label="Deepest Dive" value={`${deepest} ft`} />
          <StatCard label="Avg Depth" value={`${fmt(avgDepth)} ft`} />
          <StatCard label="Avg Duration" value={`${fmt(avgDuration)} min`} />
          {avgRating && <StatCard label="Avg Rating" value={`${fmt(avgRating)} / 5`} sub={"★".repeat(Math.round(avgRating))} />}
          {avgSac && <StatCard label="Avg SAC Rate" value={`${fmt(avgSac)} PSI/min`} sub="Surface equivalent" />}
          {avgVis && <StatCard label="Avg Visibility" value={`${fmt(avgVis)} ft`} />}
          {avgTemp && <StatCard label="Avg Water Temp" value={`${fmt(avgTemp)}°F`} />}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {/* Dives per month */}
          <Card>
            <h2 style={{ margin: "0 0 16px", fontSize: 16, color: "#1565c0" }}>Dives Per Month</h2>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 100 }}>
              {months.map((m) => (
                <div key={m.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      width: "100%",
                      background: m.count > 0 ? "#1976d2" : "#e0e7ef",
                      borderRadius: "3px 3px 0 0",
                      height: `${(m.count / maxMonthCount) * 80}px`,
                      minHeight: m.count > 0 ? 4 : 0,
                      transition: "height 0.3s",
                    }}
                    title={`${m.count} dive${m.count !== 1 ? "s" : ""}`}
                  />
                  <span style={{ fontSize: 9, color: "#888", whiteSpace: "nowrap" }}>{m.label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Top locations */}
          <Card>
            <h2 style={{ margin: "0 0 16px", fontSize: 16, color: "#1565c0" }}>Top Locations</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {topLocations.map(([loc, count]) => (
                <li key={loc} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, fontSize: 14, color: "#222", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{loc}</div>
                  <div
                    style={{
                      height: 8,
                      width: `${(count / topLocations[0][1]) * 80}px`,
                      background: "#1976d2",
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ fontSize: 13, color: "#666", width: 24, textAlign: "right", flexShrink: 0 }}>{count}</div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Dive type breakdown */}
        {typeEntries.length > 0 && (
          <Card style={{ marginBottom: 24 }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 16, color: "#1565c0" }}>Dive Types</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {typeEntries.map(([type, count]) => (
                <div key={type} style={{ background: "#e3f2fd", borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#1565c0" }}>{count}</div>
                  <div style={{ fontSize: 13, color: "#444" }}>{type}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* SAC rate per dive */}
        {sacLogs.length > 0 && (
          <Card>
            <h2 style={{ margin: "0 0 4px", fontSize: 16, color: "#1565c0" }}>SAC Rate by Dive</h2>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#888" }}>
              Surface Air Consumption = (tank start − end) × 33 ÷ ((depth + 33) × duration). Lower = more efficient. Typical range: 15–30 PSI/min.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {logs
                .map((l) => ({ log: l, sac: sacRate(l) }))
                .filter((x): x is { log: DiveLog; sac: number } => x.sac !== null)
                .sort((a, b) => a.sac - b.sac)
                .map(({ log: l, sac }) => (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                    <span style={{ width: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#333" }}>{l.location}</span>
                    <span style={{ width: 80, color: "#888" }}>{l.date.split("T")[0]}</span>
                    <div style={{ flex: 1, background: "#e0e7ef", borderRadius: 4, height: 10, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min((sac / 40) * 100, 100)}%`, height: "100%", background: sac < 20 ? "#2e7d32" : sac < 30 ? "#f9a825" : "#d32f2f", borderRadius: 4 }} />
                    </div>
                    <span style={{ width: 70, textAlign: "right", fontWeight: 600, color: sac < 20 ? "#2e7d32" : sac < 30 ? "#f9a825" : "#d32f2f" }}>{fmt(sac)} PSI/min</span>
                  </div>
                ))}
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
