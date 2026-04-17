"use client";

import { type PublicProfile } from "@/app/api/store";

function formatDate(dateStr: string): string {
  const d = dateStr.split("T")[0];
  const [y, m, day] = d.split("-");
  return `${m}/${day}/${y}`;
}

export default function PublicProfilePage({ profile }: { profile: PublicProfile }) {
  const { user, stats, certifications, recentDives } = profile;

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f0f4f8" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)", padding: "32px 20px 48px", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🤿</div>
        <h1 style={{ margin: "0 0 6px", color: "white", fontSize: 28, fontWeight: 700 }}>
          {user.firstName} {user.lastName}
        </h1>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: 14 }}>Dive Logbook</p>
      </div>

      <div style={{ maxWidth: 700, margin: "-24px auto 0", padding: "0 20px 40px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Dives", value: stats.totalDives },
            { label: "Deepest Dive", value: `${stats.deepestDive} ft` },
            { label: "Longest Dive", value: `${stats.longestDive} min` },
            { label: "Unique Locations", value: stats.uniqueLocations },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "white", borderRadius: 10, padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#1565c0" }}>{value}</div>
              <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Certifications */}
        {certifications.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18, color: "#1565c0", fontWeight: 700 }}>Certifications</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {certifications.map((cert, i) => (
                <div key={i} style={{ background: "white", borderRadius: 8, padding: "12px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#222", fontSize: 15 }}>{cert.certName}</div>
                    {cert.agency && <div style={{ fontSize: 13, color: "#666" }}>{cert.agency}</div>}
                  </div>
                  {cert.certDate && (
                    <div style={{ fontSize: 13, color: "#888" }}>{formatDate(cert.certDate)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent dives */}
        {recentDives.length > 0 && (
          <div>
            <h2 style={{ margin: "0 0 12px", fontSize: 18, color: "#1565c0", fontWeight: 700 }}>Recent Dives</h2>
            <div style={{ background: "white", borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#e3f2fd" }}>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#1565c0" }}>Location</th>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#1565c0" }}>Date</th>
                    <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#1565c0" }}>Depth</th>
                    <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#1565c0" }}>Duration</th>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#1565c0" }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDives.map((dive, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "10px 14px", color: "#222", fontWeight: 500 }}>{dive.location}</td>
                      <td style={{ padding: "10px 14px", color: "#555" }}>{formatDate(dive.date)}</td>
                      <td style={{ padding: "10px 14px", color: "#555", textAlign: "right" }}>{dive.depth} ft</td>
                      <td style={{ padding: "10px 14px", color: "#555", textAlign: "right" }}>{dive.duration} min</td>
                      <td style={{ padding: "10px 14px", color: "#888", fontSize: 13 }}>{dive.diveType ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: 32, fontSize: 12, color: "#aaa" }}>
          Powered by 🤿 Dive Log
        </p>
      </div>
    </main>
  );
}
