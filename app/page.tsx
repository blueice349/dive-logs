"use client";

import { useEffect, useState } from "react";

type DiveLog = {
  id: number;
  location: string;
  depth: number;
  duration: number;
  date: string;
};

export default function Home() {
  const [logs, setLogs] = useState<DiveLog[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  const [form, setForm] = useState({
    location: "",
    depth: "",
    duration: "",
    date: "",
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    location: "",
    depth: "",
    duration: "",
    date: "",
  });

  const isValid =
    form.location.trim() !== "" &&
    form.depth.trim() !== "" &&
    !isNaN(Number(form.depth)) &&
    form.duration.trim() !== "" &&
    !isNaN(Number(form.duration)) &&
    form.date.trim() !== "";

  const isEditValid =
    editForm.location.trim() !== "" &&
    editForm.depth.trim() !== "" &&
    !isNaN(Number(editForm.depth)) &&
    editForm.duration.trim() !== "" &&
    !isNaN(Number(editForm.duration)) &&
    editForm.date.trim() !== "";

  useEffect(() => {
    fetch("/api/logs")
      .then((res) => res.json())
      .then(setLogs);
  }, []);

  const submit = async () => {
    if (!isValid) return;

    const res = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: form.location,
        depth: Number(form.depth),
        duration: Number(form.duration),
        date: form.date,
      }),
    });

    const newLog = await res.json();
    setLogs([...logs, newLog]);

    setForm({ location: "", depth: "", duration: "", date: "" });
    setShowAddForm(false);
  };

  const deleteLog = async (id: number) => {
    await fetch(`/api/logs/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    setLogs(logs.filter((log) => log.id !== id));
  };

  const startEdit = (log: DiveLog) => {
    setEditingId(log.id);
    setEditForm({
      location: log.location,
      depth: String(log.depth),
      duration: String(log.duration),
      date: log.date,
    });
  };

  const saveEdit = async () => {
    if (!editingId || !isEditValid) return;

    const res = await fetch(`/api/logs/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: editForm.location,
        depth: Number(editForm.depth),
        duration: Number(editForm.duration),
        date: editForm.date,
      }),
    });

    const updated = await res.json();

    setLogs(logs.map((log) => (log.id === editingId ? updated : log)));
    setEditingId(null);
  };

  const Label = ({ children }: { children: string }) => (
    <label style={{ fontWeight: 600, fontSize: 14, color: "#222" }}>
      {children} <span style={{ color: "red" }}>*</span>
    </label>
  );

  const styledInput = (value: string, mustBeNumber = false) => {
    const isEmpty = value.trim() === "";
    const isInvalidNumber = mustBeNumber && isNaN(Number(value));
    return {
      ...inputStyle,
      border:
        isEmpty || isInvalidNumber ? "1px solid #e57373" : "1px solid #ccc",
      boxShadow:
        isEmpty || isInvalidNumber ? "0 0 4px rgba(255,0,0,0.3)" : "none",
    };
  };

  return (
    <main
      style={{
        maxWidth: 700,
        margin: "40px auto",
        padding: "20px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: 30, fontSize: 32 }}>
        Dive Log
      </h1>

      {!showAddForm && (
        <button style={primaryButton} onClick={() => setShowAddForm(true)}>
          ➕ Add Dive Log
        </button>
      )}

      {showAddForm && (
        <div style={card}>
          <h2
            style={{
              marginTop: 0,
              fontSize: 32,
              color: "#1976d2",
            }}
          >
            New Dive Entry
          </h2>

          <div style={formGrid}>
            <Label>Location</Label>
            <input
              placeholder="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              style={styledInput(form.location)}
            />

            <Label>Depth (ft)</Label>
            <input
              placeholder="Depth (ft)"
              value={form.depth}
              onChange={(e) => setForm({ ...form, depth: e.target.value })}
              style={styledInput(form.depth, true)}
            />

            <Label>Duration (min)</Label>
            <input
              placeholder="Duration (min)"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              style={styledInput(form.duration, true)}
            />

            <Label>Date</Label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              style={styledInput(form.date)}
            />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              onClick={submit}
              disabled={!isValid}
              style={{
                ...primaryButton,
                background: isValid ? "#2e7d32" : "#9e9e9e",
                cursor: isValid ? "pointer" : "not-allowed",
              }}
            >
              Save Dive
            </button>

            <button
              onClick={() => setShowAddForm(false)}
              style={secondaryButton}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ul style={{ listStyle: "none", padding: 0, marginTop: 30 }}>
        {logs.map((log) => (
          <li key={log.id} style={card}>
            {editingId === log.id ? (
              <>
                {" "}
                <div style={formGrid}>
                  {" "}
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 4 }}
                  >
                    {" "}
                    <Label>Location</Label>{" "}
                    <input
                      value={editForm.location}
                      onChange={(e) =>
                        setEditForm({ ...editForm, location: e.target.value })
                      }
                      style={styledInput(editForm.location)}
                    />{" "}
                  </div>{" "}
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 4 }}
                  >
                    {" "}
                    <Label>Depth (ft)</Label>{" "}
                    <input
                      value={editForm.depth}
                      onChange={(e) =>
                        setEditForm({ ...editForm, depth: e.target.value })
                      }
                      style={styledInput(editForm.depth)}
                    />{" "}
                  </div>{" "}
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 4 }}
                  >
                    {" "}
                    <Label>Duration (min)</Label>{" "}
                    <input
                      value={editForm.duration}
                      onChange={(e) =>
                        setEditForm({ ...editForm, duration: e.target.value })
                      }
                      style={styledInput(editForm.duration)}
                    />{" "}
                  </div>{" "}
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 4 }}
                  >
                    {" "}
                    <Label>Date</Label>{" "}
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) =>
                        setEditForm({ ...editForm, date: e.target.value })
                      }
                      style={styledInput(editForm.date)}
                    />{" "}
                  </div>{" "}
                </div>{" "}
                <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                  {" "}
                  <button
                    onClick={saveEdit}
                    disabled={!isEditValid}
                    style={{
                      ...primaryButton,
                      background: isEditValid ? "#2e7d32" : "#9e9e9e",
                    }}
                  >
                    {" "}
                    Save{" "}
                  </button>{" "}
                  <button
                    onClick={() => setEditingId(null)}
                    style={secondaryButton}
                  >
                    {" "}
                    Cancel{" "}
                  </button>{" "}
                </div>{" "}
              </>
            ) : (
              <>
                <h3 style={{ margin: 0, color: "#1565c0" }}>{log.location}</h3>
                <p style={{ margin: "6px 0", color: "#444" }}>
                  {log.date} — {log.depth} ft — {log.duration} min
                </p>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => startEdit(log)}
                    style={primaryButtonSmall}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteLog(log.id)}
                    style={dangerButtonSmall}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

const inputStyle = {
  padding: "10px 12px",
  borderRadius: 6,
  fontSize: 16,
  width: "100%",
  color: "#222",
};

const card = {
  padding: 20,
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "white",
  boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
  marginBottom: 20,
};

const formGrid = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns: "2fr 2fr",
  gap: 12,
};

const primaryButton = {
  padding: "10px 16px",
  borderRadius: 6,
  border: "none",
  background: "#1976d2",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButton = {
  padding: "10px 16px",
  borderRadius: 6,
  border: "1px solid #aaa",
  background: "#f5f5f5",
  color: "#333",
  fontWeight: 600,
  cursor: "pointer",
};

const primaryButtonSmall = {
  padding: "6px 12px",
  borderRadius: 6,
  border: "none",
  background: "#1976d2",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};

const dangerButtonSmall = {
  padding: "6px 12px",
  borderRadius: 6,
  border: "none",
  background: "#d32f2f",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};
