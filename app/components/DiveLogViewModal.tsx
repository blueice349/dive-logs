"use client";

import { Button } from "@/components/ui/form";
import { type DiveLog } from "@/app/api/logs/data";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "" || value === false) return null;
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 14, marginBottom: 6 }}>
      <span style={{ color: "#888", minWidth: 140, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "#222", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

export default function DiveLogViewModal({ log, onClose }: { log: DiveLog; onClose: () => void }) {
  const dateStr = log.date?.split("T")[0].replace(/(\d{4})-(\d{2})-(\d{2})/, "$2/$3/$1");
  const marineLifeTags = log.marineLife
    ? log.marineLife.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const ratingStars = log.rating ? "★".repeat(log.rating) + "☆".repeat(5 - log.rating) : null;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "white", borderRadius: 12, width: "100%", maxWidth: 520, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div style={{ padding: "24px 28px 16px", borderBottom: "1px solid #eee", flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: "#1565c0" }}>{log.location}</h2>
          {log.firstName && (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666" }}>
              Dived by {log.firstName} {log.lastName}
            </p>
          )}
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "20px 28px" }}>
          <Section title="Dive Info">
            <Row label="Date" value={dateStr} />
            <Row label="Depth" value={log.depth != null ? `${log.depth} ft` : null} />
            <Row label="Duration" value={log.duration != null ? `${log.duration} min` : null} />
            <Row label="Dive Type" value={log.diveType} />
            <Row label="Rating" value={ratingStars} />
          </Section>

          <Section title="Conditions">
            <Row label="Visibility" value={log.visibility != null ? `${log.visibility} ft` : null} />
            <Row label="Water Temp" value={log.waterTemp != null ? `${log.waterTemp}°F` : null} />
            <Row label="Buddy" value={log.buddy} />
          </Section>

          <Section title="Tank & Gear">
            <Row label="Tank Start" value={log.tankStart != null ? `${log.tankStart} PSI` : null} />
            <Row label="Tank End" value={log.tankEnd != null ? `${log.tankEnd} PSI` : null} />
            <Row label="Wetsuit" value={(log as unknown as Record<string, unknown>).wetsuit as string} />
            <Row label="BCD" value={(log as unknown as Record<string, unknown>).bcd as string} />
            <Row label="Fins" value={(log as unknown as Record<string, unknown>).fins as string} />
            <Row label="Cylinder Type" value={(log as unknown as Record<string, unknown>).cylinderType as string} />
            <Row label="Cylinder Size" value={(log as unknown as Record<string, unknown>).cylinderSize != null ? `${(log as unknown as Record<string, unknown>).cylinderSize} L` : null} />
            <Row label="Gas Mix" value={(log as unknown as Record<string, unknown>).gasMix as string} />
            <Row label="O2 %" value={(log as unknown as Record<string, unknown>).o2Percent != null ? `${(log as unknown as Record<string, unknown>).o2Percent}%` : null} />
            <Row label="Certification Used" value={(log as unknown as Record<string, unknown>).certUsed as string} />
          </Section>

          {marineLifeTags.length > 0 && (
            <Section title="Marine Life">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {marineLifeTags.map((tag) => (
                  <span key={tag} style={{ background: "#e3f2fd", color: "#1565c0", borderRadius: 4, padding: "2px 10px", fontSize: 13, fontWeight: 500 }}>
                    {tag}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {log.notes && (
            <Section title="Notes">
              <p style={{ margin: 0, fontSize: 14, color: "#444", whiteSpace: "pre-wrap", fontStyle: "italic" }}>{log.notes}</p>
            </Section>
          )}
        </div>

        <div style={{ padding: "16px 28px", borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
