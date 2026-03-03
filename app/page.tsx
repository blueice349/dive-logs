"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import Joi from "joi";

type DiveLog = {
  id: number;
  location: string;
  depth: number;
  duration: number;
  date: string;
};

type FormValues = {
  location: string;
  depth: string;
  duration: string;
  date: string;
};

const schema = Joi.object<FormValues>({
  location: Joi.string().trim().required().label("Location"),
  depth: Joi.number().required().label("Depth"),
  duration: Joi.number().required().label("Duration"),
  date: Joi.string().required().label("Date"),
});

const defaultValues: FormValues = {
  location: "",
  depth: "",
  duration: "",
  date: new Date().toISOString().split("T")[0],
};

export default function Home() {
  const [logs, setLogs] = useState<DiveLog[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const addForm = useForm<FormValues>({
    defaultValues,
    mode: "onChange",
    resolver: joiResolver(schema),
  });
  const editForm = useForm<FormValues>({
    defaultValues,
    mode: "onChange",
    resolver: joiResolver(schema),
  });

  useEffect(() => {
    fetch("/api/logs")
      .then((res) => res.json())
      .then(setLogs);
  }, []);

  const submit = addForm.handleSubmit(async (data) => {
    const res = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: data.location,
        depth: Number(data.depth),
        duration: Number(data.duration),
        date: data.date,
      }),
    });
    const newLog = await res.json();
    setLogs([...logs, newLog]);
    addForm.reset(defaultValues);
    setShowAddForm(false);
  });

  const deleteLog = async (id: number) => {
    await fetch(`/api/logs/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    setLogs(logs.filter((log) => log.id !== id));
  };

  const startEdit = (log: DiveLog) => {
    setEditingId(log.id);
    editForm.reset({
      location: log.location,
      depth: String(log.depth),
      duration: String(log.duration),
      date: log.date,
    });
  };

  const saveEdit = editForm.handleSubmit(async (data) => {
    if (!editingId) return;
    const res = await fetch(`/api/logs/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: data.location,
        depth: Number(data.depth),
        duration: Number(data.duration),
        date: data.date,
      }),
    });
    const updated = await res.json();
    setLogs(logs.map((log) => (log.id === editingId ? updated : log)));
    setEditingId(null);
  });

  const Label = ({
    children,
    htmlFor,
  }: {
    children: string;
    htmlFor: string;
  }) => (
    <label
      htmlFor={htmlFor}
      style={{ fontWeight: 600, fontSize: 14, color: "#222" }}
    >
      {children} <span style={{ color: "red" }}>*</span>
    </label>
  );

  const styledInput = (hasError: boolean) => ({
    ...inputStyle,
    border: hasError ? "1px solid #e57373" : "1px solid #ccc",
    boxShadow: hasError ? "0 0 4px rgba(255,0,0,0.3)" : "none",
  });

  const FormFields = ({
    form,
  }: {
    form: ReturnType<typeof useForm<FormValues>>;
  }) => {
    const {
      register,
      formState: { errors },
    } = form;
    return (
      <div style={formGrid}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Label htmlFor="location">Location</Label>
          <input
            id="location"
            placeholder="Location"
            {...register("location")}
            style={styledInput(!!errors.location)}
          />
          {errors.location && (
            <span style={errorText}>{errors.location.message}</span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Label htmlFor="depth">Depth (ft)</Label>
          <input
            id="depth"
            placeholder="Depth (ft)"
            {...register("depth")}
            style={styledInput(!!errors.depth)}
          />
          {errors.depth && (
            <span style={errorText}>{errors.depth.message}</span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Label htmlFor="duration">Duration (min)</Label>
          <input
            id="duration"
            placeholder="Duration (min)"
            {...register("duration")}
            style={styledInput(!!errors.duration)}
          />
          {errors.duration && (
            <span style={errorText}>{errors.duration.message}</span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Label htmlFor="date">Date</Label>
          <input
            id="date"
            type="date"
            {...register("date")}
            style={styledInput(!!errors.date)}
          />
          {errors.date && <span style={errorText}>{errors.date.message}</span>}
        </div>
      </div>
    );
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
          <h2 style={{ marginTop: 0, fontSize: 32, color: "#1976d2" }}>
            New Dive Entry
          </h2>
          <FormFields form={addForm} />
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              onClick={submit}
              disabled={!addForm.formState.isValid}
              style={{
                ...primaryButton,
                background: addForm.formState.isValid ? "#2e7d32" : "#9e9e9e",
                cursor: addForm.formState.isValid ? "pointer" : "not-allowed",
              }}
            >
              Save Dive
            </button>
            <button
              onClick={() => {
                addForm.reset(defaultValues);
                setShowAddForm(false);
              }}
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
                <FormFields form={editForm} />
                <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                  <button
                    onClick={saveEdit}
                    disabled={!editForm.formState.isValid}
                    style={{
                      ...primaryButton,
                      background: editForm.formState.isValid
                        ? "#2e7d32"
                        : "#9e9e9e",
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    style={secondaryButton}
                  >
                    Cancel
                  </button>
                </div>
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

const errorText = {
  fontSize: 12,
  color: "#e57373",
  marginTop: 2,
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
