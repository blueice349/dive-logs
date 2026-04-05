"use client";

import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui/form";
import { type DiveLog } from "@/app/api/logs/data";
import { type User } from "@/app/types/user";
import AppHeader from "./AppHeader";
import DiveLogModal from "./DiveLogModal";

type Filter = "mine" | "all";

export default function DiveLogPage({ user }: { user: User }) {
  const [logs, setLogs] = useState<DiveLog[]>([]);
  const [filter, setFilter] = useState<Filter>("mine");
  const [showAdd, setShowAdd] = useState(false);
  const [editingLog, setEditingLog] = useState<DiveLog | null>(null);

  useEffect(() => {
    const url = filter === "all" ? "/api/logs?filter=all" : "/api/logs";
    fetch(url)
      .then((r) => r.json())
      .then(setLogs);
  }, [filter]);

  const handleAdded = (log: DiveLog) => {
    setLogs((prev) => [...prev, log]);
    setShowAdd(false);
  };

  const handleUpdated = (updated: DiveLog) => {
    setLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setEditingLog(null);
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/logs/${id}`, { method: "DELETE" });
    setLogs((prev) => prev.filter((l) => l.id !== id));
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", background: "#e0e7ef", borderRadius: 8, padding: 3, gap: 2 }}>
            {(["mine", "all"] as Filter[]).map((f) => (
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
                  boxShadow: filter === f ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {f === "mine" ? "My Dives" : "All Dives"}
              </button>
            ))}
          </div>
          <Button onClick={() => setShowAdd(true)}>➕ Add Dive Log</Button>
        </div>

        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {logs.map((log) => (
            <li key={log.id}>
              <Card>
                <h3 style={{ margin: 0, color: "#1565c0" }}>{log.location}</h3>
                <p style={{ margin: "6px 0", color: "#444" }}>
                  {log.date
                    .split("T")[0]
                    .replace(/(\d{4})-(\d{2})-(\d{2})/, "$2/$3/$1")}{" "}
                  — {log.depth} ft — {log.duration} min
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <Button size="sm" onClick={() => setEditingLog(log)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(log.id)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>

      {showAdd && (
        <DiveLogModal mode="add" currentUser={user} onSave={handleAdded} onClose={() => setShowAdd(false)} />
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
    </main>
  );
}
