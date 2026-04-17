"use client";

import { useEffect, useState, KeyboardEvent } from "react";
import { useForm, FormProvider, useFormContext, Controller } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import { Field, Button, FormGrid, Label } from "@/components/ui/form";
import LocationPicker from "./LocationPicker";
import {
  type DiveLog,
  type DiveLogBase,
  type DiveType,
  type GasMix,
  type CylinderType,
  diveLogBaseSchema,
  DIVE_TYPES,
  GAS_MIXES,
  CYLINDER_TYPES,
} from "@/app/api/logs/data";
import { type PublicUser } from "@/app/types/user";

type Certification = {
  id: number;
  certName: string;
  agency?: string;
};

type GearItem = {
  id: number;
  name: string;
  type: string;
};

type FormValues = {
  location: string;
  date: string;
  depth: string;
  duration: string;
  buddy: string;
  buddyUserId: string;
  diveType: DiveType | "";
  visibility: string;
  waterTemp: string;
  tankStart: string;
  tankEnd: string;
  notes: string;
  rating: string;
  lat: string;
  lng: string;
  wetsuit: string;
  bcd: string;
  fins: string;
  cylinderType: CylinderType | "";
  cylinderSize: string;
  gasMix: GasMix | "";
  o2Percent: string;
  certUsed: string;
  marineLife: string;
};

const toNum = (s: string) => (s === "" ? undefined : Number(s));

const toPayload = (data: FormValues): DiveLogBase => ({
  location: data.location,
  depth: Number(data.depth),
  duration: Number(data.duration),
  date: data.date,
  buddy: data.buddy || undefined,
  buddyUserId: data.buddyUserId ? Number(data.buddyUserId) : undefined,
  diveType: (data.diveType as DiveType) || undefined,
  visibility: toNum(data.visibility),
  waterTemp: toNum(data.waterTemp),
  tankStart: toNum(data.tankStart),
  tankEnd: toNum(data.tankEnd),
  notes: data.notes || undefined,
  rating: toNum(data.rating),
  ...(data.lat !== "" ? { lat: Number(data.lat) } : {}),
  ...(data.lng !== "" ? { lng: Number(data.lng) } : {}),
  ...(data.certUsed ? { certUsed: data.certUsed } : {}),
  ...(data.marineLife ? { marineLife: data.marineLife } : {}),
  ...(data.wetsuit ? { wetsuit: data.wetsuit } : {}),
  ...(data.bcd ? { bcd: data.bcd } : {}),
  ...(data.fins ? { fins: data.fins } : {}),
  ...(data.cylinderType ? { cylinderType: data.cylinderType } : {}),
  ...(data.cylinderSize !== "" ? { cylinderSize: Number(data.cylinderSize) } : {}),
  ...(data.gasMix ? { gasMix: data.gasMix } : {}),
  ...(data.o2Percent !== "" ? { o2Percent: Number(data.o2Percent) } : {}),
});

type Props =
  | { mode: "add"; currentUser: PublicUser; onSave: (log: DiveLog) => void; onClose: () => void }
  | { mode: "edit"; log: DiveLog; currentUser: PublicUser; onSave: (log: DiveLog) => void; onClose: () => void };

function SelectField({ name, label, children }: { name: keyof FormValues; label: string; children: React.ReactNode }) {
  const { register } = useFormContext<FormValues>();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Label htmlFor={name}>{label}</Label>
      <select id={name} {...register(name)} style={{ padding: "10px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 16, color: "#222", width: "100%", background: "white", boxSizing: "border-box" }}>
        {children}
      </select>
    </div>
  );
}

function TextareaField({ name, label, placeholder }: { name: keyof FormValues; label: string; placeholder?: string }) {
  const { register } = useFormContext<FormValues>();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Label htmlFor={name}>{label}</Label>
      <textarea id={name} placeholder={placeholder} rows={3} {...register(name)} style={{ padding: "10px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 16, color: "#222", width: "100%", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
    </div>
  );
}

function MarineLifeTags({
  value,
  onChange,
  speciesSuggestions,
}: {
  value: string;
  onChange: (v: string) => void;
  speciesSuggestions: string[];
}) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const tags = value ? value.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) { setInput(""); return; }
    onChange([...tags, trimmed].join(", "));
    setInput("");
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag).join(", "));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const filtered = speciesSuggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  ).slice(0, 6);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Label htmlFor="marineLife-input">Marine Life Spotted</Label>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: "8px 10px",
          borderRadius: 6,
          border: "1px solid #ccc",
          background: "white",
          minHeight: 44,
          cursor: "text",
          alignItems: "center",
          position: "relative",
        }}
        onClick={() => document.getElementById("marineLife-input")?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              background: "#e3f2fd",
              color: "#1565c0",
              borderRadius: 4,
              padding: "2px 8px",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#1565c0", lineHeight: 1, fontSize: 14 }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="marineLife-input"
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={tags.length === 0 ? "Type species and press Enter..." : ""}
          style={{
            border: "none",
            outline: "none",
            fontSize: 14,
            flex: 1,
            minWidth: 120,
            background: "transparent",
          }}
        />
        {showSuggestions && filtered.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "white",
              border: "1px solid #dde3ec",
              borderRadius: 6,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 300,
              marginTop: 2,
              overflow: "hidden",
            }}
          >
            {filtered.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  background: "none",
                  border: "none",
                  fontSize: 13,
                  cursor: "pointer",
                  color: "#222",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f0f4f8"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getLogField = (log: DiveLog | null, field: string): any =>
  log ? (log as unknown as Record<string, unknown>)[field] : undefined;

export default function DiveLogModal(props: Props) {
  const { mode, currentUser, onSave, onClose } = props;

  const [adminUsers, setAdminUsers] = useState<PublicUser[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [speciesList, setSpeciesList] = useState<{ id: number; name: string; category?: string }[]>([]);
  const [gearItems, setGearItems] = useState<GearItem[]>([]);
  const [selectedGearIds, setSelectedGearIds] = useState<number[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number>(
    mode === "edit" ? props.log.userId ?? currentUser.id : currentUser.id
  );

  const log = mode === "edit" ? props.log : null;
  const initialTags = log?.marineLife ? log.marineLife.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const [tagsChanged] = useState(false);

  useEffect(() => {
    fetch("/api/species").then((r) => r.ok ? r.json() : []).then(setSpeciesList);
    fetch("/api/gear").then((r) => r.ok ? r.json() : { items: [] }).then((d) => setGearItems(d.items ?? []));
    if (!currentUser.isAdmin) return;
    fetch("/api/admin/users").then((r) => r.json()).then(setAdminUsers);
  }, [currentUser.isAdmin]);

  useEffect(() => {
    if (mode !== "edit") return;
    fetch(`/api/logs/${props.log.id}`).then((r) => r.ok ? r.json() : { gearIds: [] }).then((d) => setSelectedGearIds(d.gearIds ?? []));
  }, [mode, mode === "edit" ? props.log.id : null]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const url = currentUser.isAdmin && selectedUserId !== currentUser.id
      ? `/api/certifications?userId=${selectedUserId}`
      : "/api/certifications";
    fetch(url)
      .then((r) => r.ok ? r.json() : [])
      .then(setCertifications)
      .catch(() => setCertifications([]));
  }, [currentUser.isAdmin, currentUser.id, selectedUserId]);

  const form = useForm<FormValues>({
    defaultValues: {
      location: log?.location ?? "",
      depth: log?.depth != null ? String(log.depth) : "",
      duration: log?.duration != null ? String(log.duration) : "",
      date: log?.date ?? new Date().toISOString().split("T")[0],
      buddy: log?.buddy ?? "",
      buddyUserId: log?.buddyUserId != null ? String(log.buddyUserId) : "",
      diveType: log?.diveType ?? "",
      visibility: log?.visibility != null ? String(log.visibility) : "",
      waterTemp: log?.waterTemp != null ? String(log.waterTemp) : "",
      tankStart: log?.tankStart != null ? String(log.tankStart) : "",
      tankEnd: log?.tankEnd != null ? String(log.tankEnd) : "",
      notes: log?.notes ?? "",
      rating: log?.rating != null ? String(log.rating) : "",
      lat: getLogField(log, "lat") != null ? String(getLogField(log, "lat")) : "",
      lng: getLogField(log, "lng") != null ? String(getLogField(log, "lng")) : "",
      certUsed: getLogField(log, "certUsed") ?? "",
      marineLife: getLogField(log, "marineLife") ?? "",
      wetsuit: getLogField(log, "wetsuit") ?? "",
      bcd: getLogField(log, "bcd") ?? "",
      fins: getLogField(log, "fins") ?? "",
      cylinderType: getLogField(log, "cylinderType") ?? "",
      cylinderSize: getLogField(log, "cylinderSize") != null ? String(getLogField(log, "cylinderSize")) : "",
      gasMix: getLogField(log, "gasMix") ?? "",
      o2Percent: getLogField(log, "o2Percent") != null ? String(getLogField(log, "o2Percent")) : "",
    },
    mode: "onChange",
    resolver: joiResolver(diveLogBaseSchema),
  });

  const { watch, setValue } = form;
  const lat = watch("lat");
  const lng = watch("lng");
  const marineLife = watch("marineLife");

  const handleSubmit = form.handleSubmit(async (data) => {
    const url = mode === "edit" ? `/api/logs/${props.log.id}` : "/api/logs";
    const method = mode === "edit" ? "PUT" : "POST";
    const payload = {
      ...toPayload(data),
      ...(Boolean(currentUser.isAdmin) ? { userId: selectedUserId } : {}),
      gearIds: selectedGearIds,
    };
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    onSave(await res.json());
  });

  const speciesNames = speciesList.map((s) => s.name);

  // suppress unused warning — initialTags used for tagsChanged logic via marineLife form field
  void initialTags;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 12, width: "100%", maxWidth: 560, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "24px 28px 0" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 20, color: "#1565c0" }}>
            {mode === "edit" ? "Edit Dive Log" : "New Dive Entry"}
          </h2>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "0 28px 8px" }}>
          {/* Admin user selector */}
          {Boolean(currentUser.isAdmin) && adminUsers.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Label htmlFor="user-select">Log for User</Label>
              <select id="user-select" value={selectedUserId} onChange={(e) => setSelectedUserId(Number(e.target.value))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 16, color: "#222", marginTop: 4, boxSizing: "border-box" }}>
                {adminUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                ))}
              </select>
            </div>
          )}

          <FormProvider {...form}>
            <SectionLabel>Dive Info</SectionLabel>
            <FormGrid cols={2}>
              <Field<FormValues> name="location" label="Location" placeholder="e.g. Blue Hole, Dahab" rules={{ required: true }} />
              <Field<FormValues> name="date" label="Date" type="date" rules={{ required: true }} />
              <Field<FormValues> name="depth" label="Depth (ft)" placeholder="e.g. 60" rules={{ required: true }} />
              <Field<FormValues> name="duration" label="Duration (min)" placeholder="e.g. 45" rules={{ required: true }} />
            </FormGrid>

            <SectionLabel>Location</SectionLabel>
            <div style={{ marginBottom: 12 }}>
              <LocationPicker
                lat={lat}
                lng={lng}
                onChange={(newLat, newLng) => {
                  setValue("lat", newLat, { shouldDirty: true });
                  setValue("lng", newLng, { shouldDirty: true });
                }}
              />
            </div>

            <SectionLabel>Conditions</SectionLabel>
            <FormGrid cols={2}>
              <SelectField name="diveType" label="Dive Type">
                <option value="">— Select —</option>
                {DIVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
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

            <SectionLabel>Tank &amp; Gear</SectionLabel>
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
              <Field<FormValues>
                name="wetsuit"
                label="Wetsuit"
                placeholder="e.g. 5mm full"
              />
              <Field<FormValues>
                name="bcd"
                label="BCD"
                placeholder="e.g. Scubapro Hydros"
              />
              <Field<FormValues>
                name="fins"
                label="Fins"
                placeholder="e.g. Mares Avanti"
              />
              <SelectField name="cylinderType" label="Cylinder Type">
                <option value="">— Select —</option>
                {CYLINDER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </SelectField>
              <Field<FormValues>
                name="cylinderSize"
                label="Cylinder Size (L)"
                placeholder="e.g. 12"
              />
              <SelectField name="gasMix" label="Gas Mix">
                <option value="">— Select —</option>
                {GAS_MIXES.map((t) => <option key={t} value={t}>{t}</option>)}
              </SelectField>
              <Field<FormValues>
                name="o2Percent"
                label="O2 %"
                placeholder="e.g. 32"
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <Label htmlFor="certUsed">Certification Used</Label>
                <select
                  id="certUsed"
                  {...form.register("certUsed")}
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
                  <option value="">— None —</option>
                  {certifications.map((c) => (
                    <option key={c.id} value={c.certName}>
                      {c.certName}{c.agency ? ` (${c.agency})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </FormGrid>

            {gearItems.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Label htmlFor="gear-picker">Gear Used</Label>
                <div
                  id="gear-picker"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 6,
                    padding: "10px 12px",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    background: "white",
                  }}
                >
                  {gearItems.map((item) => {
                    const checked = selectedGearIds.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 10px",
                          borderRadius: 16,
                          border: `1px solid ${checked ? "#1565c0" : "#ddd"}`,
                          background: checked ? "#e3f2fd" : "#f9f9f9",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: checked ? 600 : 400,
                          color: checked ? "#1565c0" : "#444",
                          userSelect: "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedGearIds((prev) =>
                              e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
                            )
                          }
                          style={{ display: "none" }}
                        />
                        {item.name}
                        <span style={{ fontSize: 11, color: checked ? "#1976d2" : "#999" }}>
                          {item.type}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <SectionLabel>Marine Life &amp; Notes</SectionLabel>
            <div style={{ marginBottom: 12 }}>
              <Controller
                control={form.control}
                name="marineLife"
                render={() => (
                  <MarineLifeTags
                    value={marineLife}
                    onChange={(v) => setValue("marineLife", v, { shouldDirty: true })}
                    speciesSuggestions={speciesNames}
                  />
                )}
              />
            </div>
            <FormGrid cols={2}>
              <SelectField name="rating" label="Rating">
                <option value="">— Select —</option>
                <option value="5">★★★★★ (5)</option>
                <option value="4">★★★★☆ (4)</option>
                <option value="3">★★★☆☆ (3)</option>
                <option value="2">★★☆☆☆ (2)</option>
                <option value="1">★☆☆☆☆ (1)</option>
              </SelectField>
            </FormGrid>
            <div style={{ marginTop: 12, marginBottom: 16 }}>
              <TextareaField
                name="notes"
                label="Notes"
                placeholder="Sealife spotted, conditions, gear used..."
              />
            </div>
          </FormProvider>
        </div>

        <div style={{ display: "flex", gap: 10, padding: "16px 28px", borderTop: "1px solid #eee", justifyContent: "flex-end", flexShrink: 0 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="success"
            onClick={handleSubmit}
            disabled={!form.formState.isValid || (mode === "edit" && !form.formState.isDirty && !tagsChanged)}
          >
            {mode === "edit" ? "Save Changes" : "Save Dive"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </p>
  );
}
