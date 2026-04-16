"use client";

import { useEffect, useState } from "react";
import { type DiveLog } from "@/app/api/logs/data";
import { type PublicUser } from "@/app/types/user";
import AppHeader from "./AppHeader";
import Spinner from "./Spinner";
import { Card } from "@/components/ui/form";

type Filter = "mine" | "all";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: "white", borderRadius: 10, padding: "16px 20px", flex: 1, minWidth: 130, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", border: "1px solid #e0e7ef" }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#1565c0" }}>{value}</div>
      <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function BarChart({ data, label }: { data: { key: string; count: number }[]; label: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div>
      <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#1976d2", fontWeight: 700 }}>{label}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.map(({ key, count }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 100, fontSize: 13, color: "#555", textAlign: "right", flexShrink: 0 }}>{key}</div>
            <div style={{ flex: 1, background: "#f0f4f8", borderRadius: 4, height: 20, overflow: "hidden" }}>
              <div style={{ width: `${(count / max) * 100}%`, background: "linear-gradient(90deg, #1565c0, #42a5f5)", height: "100%", borderRadius: 4, transition: "width 0.4s" }} />
            </div>
            <div style={{ width: 24, fontSize: 13, color: "#1565c0", fontWeight: 600, flexShrink: 0 }}>{count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StatsPage({ user }: { user: PublicUser }) {
  const [logs, setLogs] = useState<DiveLog[]>([]);
  const [filter, setFilter] = useState<Filter>("mine");
  const [loadedFilter, setLoadedFilter] = useState<Filter | null>(null);
  const loading = loadedFilter !== filter;

  useEffect(() => {
    const url = filter === "all" ? "/api/logs?filter=all" : "/api/logs";
    let cancelled = false;
    fetch(url)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        if (!cancelled) { setLogs(data); setLoadedFilter(filter); }
      });
    return () => { cancelled = true; };
  }, [filter]);

  // Computed stats
  const totalDives = logs.length;
  const totalDepth = logs.reduce((s, l) => s + l.depth, 0);
  const totalTime = logs.reduce((s, l) => s + l.duration, 0);
  const avgDepth = totalDives ? (totalDepth / totalDives).toFixed(1) : "—";
  const avgDuration = totalDives ? Math.round(totalTime / totalDives) : 0;
  const maxDepth = totalDives ? Math.max(...logs.map((l) => l.depth)) : 0;
  const avgRating = (() => {
    const rated = logs.filter((l) => l.rating != null);
    if (!rated.length) return null;
    return (rated.reduce((s, l) => s + l.rating!, 0) / rated.length).toFixed(1);
  })();

  // By month (last 12)
  const byMonth: Record<string, number> = {};
  logs.forEach((l) => {
    const m = l.date.slice(0, 7);
    byMonth[m] = (byMonth[m] ?? 0) + 1;
  });
  const monthData = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, count]) => ({ key: key.slice(0, 7), count }));

  // By dive type
  const byType: Record<string, number> = {};
  logs.forEach((l) => { if (l.diveType) byType[l.diveType] = (byType[l.diveType] ?? 0) + 1; });
  const typeData = Object.entries(byType).sort(([, a], [, b]) => b - a).map(([key, count]) => ({ key, count }));

  // By rating
  const byRating: Record<string, number> = {};
  logs.forEach((l) => { if (l.rating) { const k = "★".repeat(l.rating); byRating[k] = (byRating[k] ?? 0) + 1; } });
  const ratingData = Object.entries(byRating).sort(([a], [b]) => b.length - a.length).map(([key, count]) => ({ key, count }));

  // Top locations
  const byLocation: Record<string, number> = {};
  logs.forEach((l) => { byLocation[l.location] = (byLocation[l.location] ?? 0) + 1; });
  const locationData = Object.entries(byLocation).sort(([, a], [, b]) => b - a).slice(0, 8).map(([key, count]) => ({ key, count }));

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f0f4f8" }}>
      <AppHeader user={user} />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Dive Stats</h1>
          {Boolean(user.isAdmin) && (
            <div style={{ display: "flex", background: "#e0e7ef", borderRadius: 8, padding: 3, gap: 2 }}>
              {(["mine", "all"] as Filter[]).map((f) => (
                <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? "white" : "transparent", border: "none", borderRadius: 6, padding: "5px 16px", fontSize: 14, fontWeight: filter === f ? 600 : 400, color: filter === f ? "#1565c0" : "#555", cursor: "pointer", boxShadow: filter === f ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                  {f === "mine" ? "My Dives" : "All Dives"}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && <Spinner />}

        {!loading && totalDives === 0 && (
          <Card>
            <p style={{ margin: 0, textAlign: "center", color: "#888", padding: "32px 0" }}>
              No dives logged yet. Start logging dives to see your stats!
            </p>
          </Card>
        )}

        {!loading && totalDives > 0 && (
          <>
            {/* Summary cards */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
              <StatCard label="Total Dives" value={totalDives} />
              <StatCard label="Total Time" value={`${Math.floor(totalTime / 60)}h ${totalTime % 60}m`} />
              <StatCard label="Avg Duration" value={`${avgDuration} min`} />
              <StatCard label="Avg Depth" value={`${avgDepth} ft`} />
              <StatCard label="Deepest Dive" value={`${maxDepth} ft`} />
              {avgRating && <StatCard label="Avg Rating" value={`${avgRating} ★`} />}
            </div>

            {/* Charts */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
              {monthData.length > 0 && (
                <Card>
                  <BarChart data={monthData} label="Dives by Month" />
                </Card>
              )}
              {typeData.length > 0 && (
                <Card>
                  <BarChart data={typeData} label="Dives by Type" />
                </Card>
              )}
              {locationData.length > 0 && (
                <Card>
                  <BarChart data={locationData} label="Top Locations" />
                </Card>
              )}
              {ratingData.length > 0 && (
                <Card>
                  <BarChart data={ratingData} label="Ratings Distribution" />
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
