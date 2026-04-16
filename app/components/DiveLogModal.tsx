"use client";

import { useEffect, useState } from "react";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import { Field, Button, FormGrid, Label } from "@/components/ui/form";
import LocationPicker from "./LocationPicker";
import {
  type DiveLog,
  type DiveLogBase,
  type DiveType,
  diveLogBaseSchema,
  DIVE_TYPES,
} from "@/app/api/logs/data";
import { type PublicUser } from "@/app/types/user";

type FormValues = {
  location: string;
  date: string;
  depth: string;
  duration: string;
  buddy: string;
  diveType: DiveType | "";
  visibility: string;
  waterTemp: string;
  tankStart: string;
  tankEnd: string;
  notes: string;
  rating: string;
  lat: string;
  lng: string;
};

const toNum = (s: string) => (s === "" ? undefined : Number(s));

const toPayload = (data: FormValues): DiveLogBase => ({
  location: data.location,
  depth: Number(data.depth),
  duration: Number(data.duration),
  date: data.date,
  buddy: data.buddy || undefined,
  diveType: data.diveType || undefined,
  visibility: toNum(data.visibility),
  waterTemp: toNum(data.waterTemp),
  tankStart: toNum(data.tankStart),
  tankEnd: toNum(data.tankEnd),
  notes: data.notes || undefined,
  rating: toNum(data.rating),
  lat: toNum(data.lat),
  lng: toNum(data.lng),
});

type Props =
  | {
      mode: "add";
      currentUser: PublicUser;
      onSave: (log: DiveLog) => void;
      onClose: () => void;
    }
  | {
      mode: "edit";
      log: DiveLog;
      currentUser: PublicUser;
      onSave: (log: DiveLog) => void;
      onClose: () => void;
    };

function SelectField({
  name,
  label,
  children,
}: {
  name: keyof FormValues;
  label: string;
  children: React.ReactNode;
}) {
  const { register } = useFormContext<FormValues>();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        {...register(name)}
        style={{
          padding: "10px 12px",
          borderRadius: 6,
          border: "1px solid #ccc",
          fontSize: 16,
          color: "#222",
          boxSizing: "border-box",
          width: "100%",
          background: "white",
        }}
      >
        {children}
      </select>
    </div>
  );
}

function TextareaField({
  name,
  label,
  placeholder,
}: {
  name: keyof FormValues;
  label: string;
  placeholder?: string;
}) {
  const { register } = useFormContext<FormValues>();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Label htmlFor={name}>{label}</Label>
      <textarea
        id={name}
        placeholder={placeholder}
        rows={3}
        {...register(name)}
        style={{
          padding: "10px 12px",
          borderRadius: 6,
          border: "1px solid #ccc",
          fontSize: 16,
          color: "#222",
          boxSizing: "border-box",
          width: "100%",
          resize: "vertical",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

export default function DiveLogModal(props: Props) {
  const { mode, currentUser, onSave, onClose } = props;

  const [users, setUsers] = useState<PublicUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number>(
    mode === "edit" ? props.log.userId ?? currentUser.id : currentUser.id
  );

  useEffect(() => {
    if (!currentUser.isAdmin) return;
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then(setUsers);
  }, [currentUser.isAdmin]);

  const log = mode === "edit" ? props.log : null;

  const form = useForm<FormValues>({
    defaultValues: {
      location: log?.location ?? "",
      depth: log?.depth != null ? String(log.depth) : "",
      duration: log?.duration != null ? String(log.duration) : "",
      date: log?.date ?? new Date().toISOString().split("T")[0],
      buddy: log?.buddy ?? "",
      diveType: log?.diveType ?? "",
      visibility: log?.visibility != null ? String(log.visibility) : "",
      waterTemp: log?.waterTemp != null ? String(log.waterTemp) : "",
      tankStart: log?.tankStart != null ? String(log.tankStart) : "",
      tankEnd: log?.tankEnd != null ? String(log.tankEnd) : "",
      notes: log?.notes ?? "",
      rating: log?.rating != null ? String(log.rating) : "",
      lat: log?.lat != null ? String(log.lat) : "",
      lng: log?.lng != null ? String(log.lng) : "",
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
          width: "100%",
          maxWidth: 540,
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "28px 28px 0" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 20, color: "#1565c0" }}>
            {mode === "edit" ? "Edit Dive Log" : "New Dive Entry"}
          </h2>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "0 28px" }}>
          {currentUser.isAdmin && users.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Label htmlFor="user-select">User</Label>
              <select
                id="user-select"
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
                  marginTop: 4,
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
            <p
              style={{
                margin: "0 0 8px",
                fontWeight: 600,
                fontSize: 13,
                color: "#666",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Dive Info
            </p>
            <FormGrid cols={2}>
              <Field<FormValues>
                name="location"
                label="Location"
                placeholder="e.g. Blue Hole, Dahab"
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
                placeholder="e.g. 60"
                rules={{ required: true }}
              />
              <Field<FormValues>
                name="duration"
                label="Duration (min)"
                placeholder="e.g. 45"
                rules={{ required: true }}
              />
            </FormGrid>

            <p
              style={{
                margin: "16px 0 8px",
                fontWeight: 600,
                fontSize: 13,
                color: "#666",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Conditions
            </p>
            <FormGrid cols={2}>
              <SelectField name="diveType" label="Dive Type">
                <option value="">— Select —</option>
                {DIVE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </SelectField>
              <Field<FormValues>
                name="buddy"
                label="Buddy"
                placeholder="Dive buddy name"
              />
              <Field<FormValues>
                name="visibility"
                label="Visibility (ft)"
                placeholder="e.g. 40"
              />
              <Field<FormValues>
                name="waterTemp"
                label="Water Temp (°F)"
                placeholder="e.g. 78"
              />
            </FormGrid>

            <p
              style={{
                margin: "16px 0 8px",
                fontWeight: 600,
                fontSize: 13,
                color: "#666",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Tank
            </p>
            <FormGrid cols={2}>
              <Field<FormValues>
                name="tankStart"
                label="Tank Start (PSI)"
                placeholder="e.g. 3000"
              />
              <Field<FormValues>
                name="tankEnd"
                label="Tank End (PSI)"
                placeholder="e.g. 500"
              />
            </FormGrid>

            <p
              style={{
                margin: "16px 0 8px",
                fontWeight: 600,
                fontSize: 13,
                color: "#666",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Notes
            </p>
            <FormGrid cols={2}>
              <SelectField name="rating" label="Rating">
                <option value="">— Select —</option>
                <option value="5">★★★★★ (5)</option>
                <option value="4">★★★★☆ (4)</option>
                <option value="3">★★★☆☆ (3)</option>
                <option value="2">★★☆☆☆ (2)</option>
                <option value="1">★☆☆☆☆ (1)</option>
              </SelectField>
              <div />
            </FormGrid>
            <div style={{ marginTop: 12 }}>
              <TextareaField
                name="notes"
                label="Notes"
                placeholder="Sealife spotted, conditions, gear used..."
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <LocationPicker
                lat={form.watch("lat")}
                lng={form.watch("lng")}
                onChange={(lat, lng) => {
                  form.setValue("lat", lat, { shouldDirty: true });
                  form.setValue("lng", lng, { shouldDirty: true });
                }}
              />
            </div>
          </FormProvider>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "16px 28px",
            borderTop: "1px solid #eee",
            justifyContent: "flex-end",
            flexShrink: 0,
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleSubmit}
            disabled={
              !form.formState.isValid ||
              (mode === "edit" && !form.formState.isDirty)
            }
          >
            {mode === "edit" ? "Save Changes" : "Save Dive"}
          </Button>
        </div>
      </div>
    </div>
  );
}
