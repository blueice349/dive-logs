"use client";

import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui/form";
import { type DiveLog } from "@/app/api/logs/data";
import { type PublicUser } from "@/app/types/user";
import DiveLogModal from "./DiveLogModal";
import ConfirmModal from "./ConfirmModal";
import ExportPDFButton from "./ExportPDFButton";
import Spinner from "./Spinner";

type Filter = "mine" | "all";

export default function DiveLogPage({ user }: { user: PublicUser }) {
  const [logs, setLogs] = useState<DiveLog[]>([]);
  const [filter, setFilter] = useState<Filter>("mine");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingLog, setEditingLog] = useState<DiveLog | null>(null);
  const [deletingLog, setDeletingLog] = useState<DiveLog | null>(null);

  useEffect(() => {
    setLoading(true);
    const url = filter === "all" ? "/api/logs?filter=all" : "/api/logs";
    fetch(url).then((r) => {
      if (r.ok) r.json().then((data) => { setLogs(data); setLoading(false); });
      else setLoading(false);
    });
  }, [filter]);

  const handleAdded = (log: DiveLog) => {
    if (filter === "all" || log.userId === user.id) {
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
    <main style={{ fontFamily: "system-ui, sans-serif", minHeight: "calc(100vh - 56px)", background: "#f0f4f8" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: 20 }}>
        <div
          className="dive-log-toolbar"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}
        >
          <div style={{ display: "flex", background: "#e0e7ef", borderRadius: 8, padding: 3, gap: 2 }}>
            {(["mine", ...(user.isAdmin ? ["all"] : [])] as Filter[]).map((f) => (
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
          <div style={{ display: "flex", gap: 8 }}>
            <ExportPDFButton user={user} logs={logs} />
            <Button onClick={() => setShowAdd(true)}>➕ Add Dive Log</Button>
          </div>
        </div>

        {loading && <Spinner />}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {logs.map((log) => (
            <li key={log.id}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0, color: "#1565c0" }}>{log.location}</h3>
                      {log.diveType && (
                        <span style={{ fontSize: 12, background: "#e3f2fd", color: "#1565c0", borderRadius: 4, padding: "2px 8px", fontWeight: 600 }}>
                          {log.diveType}
                        </span>
                      )}
                      {log.rating && (
                        <span style={{ fontSize: 13, color: "#f9a825" }}>
                          {"★".repeat(log.rating)}{"☆".repeat(5 - log.rating)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", margin: "8px 0 0", fontSize: 14, color: "#555" }}>
                      {log.firstName && <span>🤿 {log.firstName} {log.lastName}</span>}
                      <span>📅 {log.date.split("T")[0].replace(/(\d{4})-(\d{2})-(\d{2})/, "$2/$3/$1")}</span>
                      <span>⬇️ {log.depth} ft</span>
                      <span>⏱ {log.duration} min</span>
                      {log.buddy && <span>👤 {log.buddy}</span>}
                      {log.visibility != null && <span>👁 {log.visibility} ft vis</span>}
                      {log.waterTemp != null && <span>🌡 {log.waterTemp}°F</span>}
                      {log.tankStart != null && log.tankEnd != null && <span>🪣 {log.tankStart}→{log.tankEnd} PSI</span>}
                    </div>
                    {log.notes && (
                      <p style={{ margin: "8px 0 0", fontSize: 13, color: "#666", fontStyle: "italic", whiteSpace: "pre-wrap" }}>
                        {log.notes}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <Button size="sm" disabled={!user.isAdmin && log.userId !== user.id} onClick={() => setEditingLog(log)}>Edit</Button>
                    <Button size="sm" variant="danger" disabled={!user.isAdmin && log.userId !== user.id} onClick={() => setDeletingLog(log)}>Delete</Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>

      {showAdd && <DiveLogModal mode="add" currentUser={user} onSave={handleAdded} onClose={() => setShowAdd(false)} />}
      {editingLog && <DiveLogModal mode="edit" log={editingLog} currentUser={user} onSave={handleUpdated} onClose={() => setEditingLog(null)} />}
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
