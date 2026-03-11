"use client";

import { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import { Field, Card, Button, FormGrid } from "@/components/ui/form";
import {
  type DiveLog,
  type DiveLogBase,
  diveLogBaseSchema,
} from "@/app/api/logs/data";

type FormValues = { [K in keyof DiveLogBase]: string };

const defaultValues: FormValues = {
  location: "",
  depth: "",
  duration: "",
  date: new Date().toISOString().split("T")[0],
};

const toPayload = (data: FormValues): DiveLogBase => ({
  location: data.location,
  depth: Number(data.depth),
  duration: Number(data.duration),
  date: data.date,
});

function DiveFormFields() {
  return (
    <FormGrid cols={2}>
      <Field<FormValues>
        name="location"
        label="Location"
        placeholder="Location"
        rules={{ required: true }}
      />
      <Field<FormValues>
        name="depth"
        label="Depth (ft)"
        placeholder="Depth (ft)"
        rules={{ required: true }}
      />
      <Field<FormValues>
        name="duration"
        label="Duration (min)"
        placeholder="Duration (min)"
        rules={{ required: true }}
      />
      <Field<FormValues>
        name="date"
        label="Date"
        type="date"
        rules={{ required: true }}
      />
    </FormGrid>
  );
}

function EditDiveForm({
  log,
  onSave,
  onCancel,
}: {
  log: DiveLog;
  onSave: (updated: DiveLog) => void;
  onCancel: () => void;
}) {
  const form = useForm<FormValues>({
    defaultValues: {
      location: log.location,
      depth: String(log.depth),
      duration: String(log.duration),
      date: log.date,
    },
    mode: "onChange",
    resolver: joiResolver(diveLogBaseSchema),
  });

  const handleSave = form.handleSubmit(async (data) => {
    const res = await fetch(`/api/logs/${log.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(data)),
    });
    onSave(await res.json());
  });

  return (
    <FormProvider {...form}>
      <DiveFormFields />
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <Button
          variant="success"
          size="sm"
          onClick={handleSave}
          disabled={!form.formState.isValid}
        >
          Save
        </Button>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </FormProvider>
  );
}

export default function Home() {
  const [logs, setLogs] = useState<DiveLog[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const addForm = useForm<FormValues>({
    defaultValues,
    mode: "onChange",
    resolver: joiResolver(diveLogBaseSchema),
  });

  useEffect(() => {
    fetch("/api/logs")
      .then((res) => res.json())
      .then(setLogs);
  }, []);

  const handleAdd = addForm.handleSubmit(async (data) => {
    const res = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(data)),
    });
    const newLog = await res.json();
    setLogs((prev) => [...prev, newLog]);
    addForm.reset(defaultValues);
    setShowAddForm(false);
  });

  const handleDelete = async (id: number) => {
    await fetch(`/api/logs/${id}`, { method: "DELETE" });
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <main
      style={{
        maxWidth: 700,
        margin: "40px auto",
        padding: 20,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: 30, fontSize: 32 }}>
        Dive Log
      </h1>

      {!showAddForm && (
        <Button onClick={() => setShowAddForm(true)}>➕ Add Dive Log</Button>
      )}

      {showAddForm && (
        <Card>
          <h2 style={{ marginTop: 0, fontSize: 24, color: "#1976d2" }}>
            New Dive Entry
          </h2>
          <FormProvider {...addForm}>
            <DiveFormFields />
          </FormProvider>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <Button
              variant="success"
              onClick={() => handleAdd()}
              disabled={!addForm.formState.isValid}
            >
              Save Dive
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                addForm.reset(defaultValues);
                setShowAddForm(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <ul style={{ listStyle: "none", padding: 0, marginTop: 30 }}>
        {logs.map((log) => (
          <li key={log.id}>
            <Card>
              {editingId === log.id ? (
                <EditDiveForm
                  log={log}
                  onSave={(updated) => {
                    setLogs((prev) =>
                      prev.map((l) => (l.id === updated.id ? updated : l))
                    );
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <h3 style={{ margin: 0, color: "#1565c0" }}>
                    {log.location}
                  </h3>
                  <p style={{ margin: "6px 0", color: "#444" }}>
                    {log.date
                      .split("T")[0]
                      .replace(/(\d{4})-(\d{2})-(\d{2})/, "$2/$3/$1")}{" "}
                    — {log.depth} ft — {log.duration} min
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <Button size="sm" onClick={() => setEditingId(log.id)}>
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
                </>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}
