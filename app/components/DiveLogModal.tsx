"use client";

import { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import { Field, Button, FormGrid } from "@/components/ui/form";
import { type DiveLog, type DiveLogBase, diveLogBaseSchema } from "@/app/api/logs/data";
import { type PublicUser } from "@/app/types/user";

type FormValues = { [K in keyof DiveLogBase]: string };

const toPayload = (data: FormValues): DiveLogBase => ({
  location: data.location,
  depth: Number(data.depth),
  duration: Number(data.duration),
  date: data.date,
});

type Props =
  | { mode: "add"; currentUser: PublicUser; onSave: (log: DiveLog) => void; onClose: () => void }
  | { mode: "edit"; log: DiveLog; currentUser: PublicUser; onSave: (log: DiveLog) => void; onClose: () => void };

export default function DiveLogModal(props: Props) {
  const { mode, currentUser, onSave, onClose } = props;

  const [users, setUsers] = useState<PublicUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number>(
    mode === "edit" ? (props.log.userId ?? currentUser.id) : currentUser.id
  );

  useEffect(() => {
    if (!currentUser.isAdmin) return;
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then(setUsers);
  }, [currentUser.isAdmin]);

  const form = useForm<FormValues>({
    defaultValues:
      mode === "edit"
        ? {
            location: props.log.location,
            depth: String(props.log.depth),
            duration: String(props.log.duration),
            date: props.log.date,
          }
        : {
            location: "",
            depth: "",
            duration: "",
            date: new Date().toISOString().split("T")[0],
          },
    mode: "onChange",
    resolver: joiResolver(diveLogBaseSchema),
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    const url = mode === "edit" ? `/api/logs/${props.log.id}` : "/api/logs";
    const method = mode === "edit" ? "PUT" : "POST";
    const payload = {
      ...toPayload(data),
      ...(currentUser.isAdmin ? { userId: selectedUserId } : {}),
    };
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    onSave(await res.json());
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 12,
          padding: 28,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
      >
        <h2 style={{ margin: "0 0 20px", fontSize: 20, color: "#1565c0" }}>
          {mode === "edit" ? "Edit Dive Log" : "New Dive Entry"}
        </h2>

        {currentUser.isAdmin && users.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: 14, color: "#222", marginBottom: 4 }}>
              User
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
                fontSize: 16,
                color: "#222",
                boxSizing: "border-box",
              }}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.email})
                </option>
              ))}
            </select>
          </div>
        )}

        <FormProvider {...form}>
          <FormGrid cols={2}>
            <Field<FormValues>
              name="location"
              label="Location"
              placeholder="Location"
              rules={{ required: true }}
            />
            <Field<FormValues>
              name="date"
              label="Date"
              type="date"
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
          </FormGrid>
        </FormProvider>

        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleSubmit}
            disabled={!form.formState.isValid}
          >
            {mode === "edit" ? "Save Changes" : "Save Dive"}
          </Button>
        </div>
      </div>
    </div>
  );
}
