"use client";

import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui/form";
import { type DiveLog } from "@/app/api/logs/data";
import { type PublicUser } from "@/app/types/user";
import AppHeader from "./AppHeader";
import DiveLogModal from "./DiveLogModal";
import DiveLogViewModal from "./DiveLogViewModal";
import ConfirmModal from "./ConfirmModal";

type Filter = "mine" | "all" | "buddy";

type BuddyRequest = {
  id: number;
  diveLogId: number;
  fromUserId: number;
  location?: string;
  date?: string;
  depth?: number;
  duration?: number;
  fromFirstName?: string;
  fromLastName?: string;
};

type MenuItem = { label: string; action: () => void; color: string; disabled?: boolean };

function ActionsMenu({ items, open, onToggle }: { items: MenuItem[]; open: boolean; onToggle: () => void }) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        style={{ background: "#e3eaf4", border: "1px solid #c5d0de", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#1565c0", display: "flex", alignItems: "center", gap: 4 }}
      >
        Actions <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "white", border: "1px solid #dde3ec", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 140, overflow: "hidden" }}>
          {items.map(({ label, action, color, disabled }) => (
            <button
              key={label}
              disabled={disabled}
              onClick={(e) => { e.stopPropagation(); action(); onToggle(); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 16px", background: "none", border: "none", fontSize: 14, color: disabled ? "#aaa" : color, cursor: disabled ? "not-allowed" : "pointer" }}
              onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = "#f0f4f8"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DiveLogPage({ user }: { user: PublicUser }) {
  const [logs, setLogs] = useState<DiveLog[]>([]);
  const [filter, setFilter] = useState<Filter>("mine");
  const [showAdd, setShowAdd] = useState(false);
  const [editingLog, setEditingLog] = useState<DiveLog | null>(null);
  const [deletingLog, setDeletingLog] = useState<DiveLog | null>(null);
  const [viewingLog, setViewingLog] = useState<DiveLog | null>(null);
  const [buddyRequests, setBuddyRequests] = useState<BuddyRequest[]>([]);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => {
    if (openMenuId === null) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenuId]);

  useEffect(() => {
    fetch("/api/buddy-requests")
      .then((r) => r.ok ? r.json() : [])
      .then(setBuddyRequests);
  }, []);

  const handleBuddyAction = async (id: number, action: "confirm" | "decline") => {
    const res = await fetch("/api/buddy-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) setBuddyRequests((prev) => prev.filter((r) => r.id !== id));
  };

  useEffect(() => {
    const url = filter === "all" ? "/api/logs?filter=all" : filter === "buddy" ? "/api/logs?filter=buddy" : "/api/logs";
    fetch(url).then((r) => {
      if (r.ok) r.json().then(setLogs);
      else setLogs([]);
    });
  }, [filter]);

  const handleAdded = (log: DiveLog) => {
    if (filter === "all" || filter === "buddy" || log.userId === user.id) {
      setLogs((prev) => [...prev, log]);
    }
    setShowAdd(false);
  };

  const handleUpdated = (updated: DiveLog) => {
    setLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setEditingLog(null);
  };

  const handleDelete = async () => {
    if (!deletingLog) return;
    const res = await fetch(`/api/logs/${deletingLog.id}`, { method: "DELETE" });
    if (res.ok) {
      setLogs((prev) => prev.filter((l) => l.id !== deletingLog.id));
      setDeletingLog(null);
    } else {
      const { error } = await res.json().catch(() => ({ error: null }));
      setDeletingLog(null);
      if (res.status === 401) {
        alert("You must be logged in to delete a dive log.");
      } else if (res.status === 403) {
        alert(error ?? "You do not have permission to delete this dive log.");
      } else if (res.status === 404) {
        alert(error ?? "This dive log could not be found.");
        setLogs((prev) => prev.filter((l) => l.id !== deletingLog.id));
      } else {
        alert(error ?? "Failed to delete dive log. Please try again.");
      }
    }
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

      <div style={{ maxWidth: 700, margin: "0 auto", padding: 20 }}>
        <div
          className="dive-log-toolbar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              background: "#e0e7ef",
              borderRadius: 8,
              padding: 3,
              gap: 2,
            }}
          >
            {(["mine", "buddy", ...(user.isAdmin ? ["all"] : [])] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: filter === f ? "white" : "transparent",
                  border: "none",
                  borderRadius: 6,
                  padding: "5px 16px",
                  fontSize: 14,
                  fontWeight: filter === f ? 600 : 400,
                  color: filter === f ? "#1565c0" : "#555",
                  cursor: "pointer",
                  boxShadow:
                    filter === f ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {f === "mine" ? "My Dives" : f === "buddy" ? "Buddy Dives" : "All Dives"}
              </button>
            ))}
          </div>
          <Button onClick={() => setShowAdd(true)}>➕ Add Dive Log</Button>
        </div>

        {buddyRequests.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 15, color: "#1565c0", fontWeight: 700 }}>
              🤿 Buddy Requests ({buddyRequests.length})
            </h3>
            {buddyRequests.map((req) => (
              <div key={req.id} style={{ background: "white", border: "1px solid #bbdefb", borderRadius: 8, padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div style={{ fontSize: 14, color: "#333" }}>
                  <strong>{req.fromFirstName} {req.fromLastName}</strong> logged a dive
                  {req.location && <> at <strong>{req.location}</strong></>}
                  {req.date && <> on {req.date.split("T")[0].replace(/(\d{4})-(\d{2})-(\d{2})/, "$2/$3/$1")}</>}
                  {req.depth != null && req.duration != null && <> ({req.depth}ft, {req.duration}min)</>}
                  {" "}and tagged you as their buddy.
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <Button size="sm" variant="success" onClick={() => handleBuddyAction(req.id, "confirm")}>Confirm</Button>
                  <Button size="sm" variant="secondary" onClick={() => handleBuddyAction(req.id, "decline")}>Decline</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {logs.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px", background: "white", borderRadius: 12, border: "1px dashed #c5d0de", color: "#888" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🤿</div>
            <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, color: "#555" }}>
              {filter === "buddy" ? "No buddy dives yet" : filter === "all" ? "No dives logged yet" : "No dives logged yet"}
            </p>
            <p style={{ margin: 0, fontSize: 14 }}>
              {filter === "buddy"
                ? "Dives where another diver confirms you as their buddy will appear here."
                : "Start logging your dives to see them here."}
            </p>
          </div>
        )}

        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {logs.map((log) => (
            <li key={log.id}>
              <Card>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <h3 style={{ margin: 0, color: "#1565c0" }}>
                        {log.location}
                      </h3>
                      {log.diveType && (
                        <span
                          style={{
                            fontSize: 12,
                            background: "#e3f2fd",
                            color: "#1565c0",
                            borderRadius: 4,
                            padding: "2px 8px",
                            fontWeight: 600,
                          }}
                        >
                          {log.diveType}
                        </span>
                      )}
                      {log.rating && (
                        <span style={{ fontSize: 13, color: "#f9a825" }}>
                          {"★".repeat(log.rating)}
                          {"☆".repeat(5 - log.rating)}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px 16px",
                        margin: "8px 0 0",
                        fontSize: 14,
                        color: "#555",
                      }}
                    >
                      {log.firstName && <span>🤿 {log.firstName} {log.lastName}</span>}
                      <span>
                        📅 {log.date
                          .split("T")[0]
                          .replace(/(\d{4})-(\d{2})-(\d{2})/, "$2/$3/$1")}
                      </span>
                      <span>⬇️ {log.depth} ft</span>
                      <span>⏱ {log.duration} min</span>
                      {log.buddy && <span>👤 {log.buddy}</span>}
                      {log.visibility != null && (
                        <span>👁 {log.visibility} ft vis</span>
                      )}
                      {log.waterTemp != null && (
                        <span>🌡 {log.waterTemp}°F</span>
                      )}
                      {log.tankStart != null && log.tankEnd != null && (
                        <span>
                          🪣 {log.tankStart}→{log.tankEnd} PSI
                        </span>
                      )}
                    </div>
                    {log.notes && (
                      <p
                        style={{
                          margin: "8px 0 0",
                          fontSize: 13,
                          color: "#666",
                          fontStyle: "italic",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {log.notes}
                      </p>
                    )}
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <ActionsMenu
                      open={openMenuId === log.id}
                      onToggle={() => setOpenMenuId((prev) => (prev === log.id ? null : log.id))}
                      items={
                        filter === "buddy"
                          ? [{ label: "View", action: () => setViewingLog(log), color: "#1565c0" }]
                          : [
                              { label: "View", action: () => setViewingLog(log), color: "#1565c0" },
                              { label: "Edit", action: () => setEditingLog(log), color: "#1565c0", disabled: !user.isAdmin && log.userId !== user.id },
                              { label: "Delete", action: () => setDeletingLog(log), color: "#c62828", disabled: !user.isAdmin && log.userId !== user.id },
                            ]
                      }
                    />
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>

      {showAdd && (
        <DiveLogModal
          mode="add"
          currentUser={user}
          onSave={handleAdded}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editingLog && (
        <DiveLogModal
          mode="edit"
          log={editingLog}
          currentUser={user}
          onSave={handleUpdated}
          onClose={() => setEditingLog(null)}
        />
      )}

      {viewingLog && (
        <DiveLogViewModal log={viewingLog} onClose={() => setViewingLog(null)} />
      )}

      {deletingLog && (
        <ConfirmModal
          title="Delete Dive Log"
          message={`Are you sure you want to delete the dive at ${deletingLog.location}? This cannot be undone.`}
          onConfirm={handleDelete}
          onClose={() => setDeletingLog(null)}
        />
      )}
    </main>
  );
}
