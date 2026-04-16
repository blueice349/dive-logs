"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import { Field, Button, FormGrid, Label } from "@/components/ui/form";
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

const toPayload = (data: FormValues, tags: string[]): DiveLogBase => ({
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
  lat: toNum(data.lat),
  lng: toNum(data.lng),
  wetsuit: data.wetsuit || undefined,
  bcd: data.bcd || undefined,
  fins: data.fins || undefined,
  cylinderType: (data.cylinderType as CylinderType) || undefined,
  cylinderSize: toNum(data.cylinderSize),
  gasMix: (data.gasMix as GasMix) || undefined,
  o2Percent: toNum(data.o2Percent),
  certUsed: data.certUsed || undefined,
  marineLife: tags.length > 0 ? tags.join(", ") : undefined,
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: "16px 0 8px", fontWeight: 600, fontSize: 13, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px" }}>
      {children}
    </p>
  );
}

export default function DiveLogModal(props: Props) {
  const { mode, currentUser, onSave, onClose } = props;

  const [adminUsers, setAdminUsers] = useState<PublicUser[]>([]);
  const [publicUsers, setPublicUsers] = useState<{ id: number; firstName: string; lastName: string }[]>([]);
  const [certifications, setCertifications] = useState<{ id: number; certName: string; agency?: string }[]>([]);
  const [speciesList, setSpeciesList] = useState<{ id: number; name: string; category?: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number>(
    mode === "edit" ? props.log.userId ?? currentUser.id : currentUser.id
  );

  // Marine life tags (managed outside react-hook-form)
  const log = mode === "edit" ? props.log : null;
  const initialTags = log?.marineLife ? log.marineLife.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const [tags, setTags] = useState<string[]>(initialTags);
  const tagsChanged = tags.length !== initialTags.length || tags.some((t, i) => t !== initialTags[i]);
  const [tagInput, setTagInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    fetch("/api/users/public").then((r) => r.ok ? r.json() : []).then(setPublicUsers);
    fetch("/api/species").then((r) => r.ok ? r.json() : []).then(setSpeciesList);
    if (!currentUser.isAdmin) return;
    fetch("/api/admin/users").then((r) => r.json()).then(setAdminUsers);
  }, [currentUser.isAdmin]);

  useEffect(() => {
    const url = Boolean(currentUser.isAdmin) && selectedUserId !== currentUser.id
      ? `/api/certifications?userId=${selectedUserId}`
      : "/api/certifications";
    fetch(url).then((r) => r.ok ? r.json() : []).then(setCertifications);
  }, [selectedUserId, currentUser.isAdmin, currentUser.id]);

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
      lat: log?.lat != null ? String(log.lat) : "",
      lng: log?.lng != null ? String(log.lng) : "",
      wetsuit: log?.wetsuit ?? "",
      bcd: log?.bcd ?? "",
      fins: log?.fins ?? "",
      cylinderType: log?.cylinderType ?? "",
      cylinderSize: log?.cylinderSize != null ? String(log.cylinderSize) : "",
      gasMix: log?.gasMix ?? "",
      o2Percent: log?.o2Percent != null ? String(log.o2Percent) : "",
      certUsed: log?.certUsed ?? "",
      marineLife: "",
    },
    mode: "onChange",
    resolver: joiResolver(diveLogBaseSchema),
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    const url = mode === "edit" ? `/api/logs/${props.log.id}` : "/api/logs";
    const method = mode === "edit" ? "PUT" : "POST";
    const payload = {
      ...toPayload(data, tags),
      ...(Boolean(currentUser.isAdmin) ? { userId: selectedUserId } : {}),
    };
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    onSave(await res.json());
  });

  const filteredSuggestions = tagInput.trim().length > 0
    ? speciesList.filter((s) => s.name.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(s.name))
    : [];

  const addTag = (name: string) => {
    if (name && !tags.includes(name)) setTags((prev) => [...prev, name]);
    setTagInput("");
    setShowSuggestions(false);
  };

  const removeTag = (name: string) => setTags((prev) => prev.filter((t) => t !== name));

  const gasMixValue = form.watch("gasMix");

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
            {/* ── Dive Info ── */}
            <SectionHeading>Dive Info</SectionHeading>
            <FormGrid cols={2}>
              <Field<FormValues> name="location" label="Location" placeholder="e.g. Blue Hole, Dahab" rules={{ required: true }} />
              <Field<FormValues> name="date" label="Date" type="date" rules={{ required: true }} />
              <Field<FormValues> name="depth" label="Depth (ft)" placeholder="e.g. 60" rules={{ required: true }} />
              <Field<FormValues> name="duration" label="Duration (min)" placeholder="e.g. 45" rules={{ required: true }} />
            </FormGrid>

            {/* ── Conditions ── */}
            <SectionHeading>Conditions</SectionHeading>
            <FormGrid cols={2}>
              <SelectField name="diveType" label="Dive Type">
                <option value="">— Select —</option>
                {DIVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </SelectField>
              <Field<FormValues> name="visibility" label="Visibility (ft)" placeholder="e.g. 40" />
              <Field<FormValues> name="waterTemp" label="Water Temp (°F)" placeholder="e.g. 78" />
              <SelectField name="rating" label="Rating">
                <option value="">— Select —</option>
                <option value="5">★★★★★ (5)</option>
                <option value="4">★★★★☆ (4)</option>
                <option value="3">★★★☆☆ (3)</option>
                <option value="2">★★☆☆☆ (2)</option>
                <option value="1">★☆☆☆☆ (1)</option>
              </SelectField>
            </FormGrid>

            {/* ── Buddy ── */}
            <SectionHeading>Buddy</SectionHeading>
            <FormGrid cols={2}>
              <Field<FormValues> name="buddy" label="Buddy Name" placeholder="Dive buddy name" />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <Label htmlFor="buddyUserId">Buddy (App User)</Label>
                <select id="buddyUserId" {...form.register("buddyUserId")}
                  style={{ padding: "10px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 16, color: "#222", width: "100%", background: "white", boxSizing: "border-box" }}>
                  <option value="">— None —</option>
                  {publicUsers.filter((u) => u.id !== currentUser.id).map((u) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
              </div>
            </FormGrid>

            {/* ── Tank ── */}
            <SectionHeading>Tank</SectionHeading>
            <FormGrid cols={2}>
              <Field<FormValues> name="tankStart" label="Tank Start (PSI)" placeholder="e.g. 3000" />
              <Field<FormValues> name="tankEnd" label="Tank End (PSI)" placeholder="e.g. 500" />
              <SelectField name="gasMix" label="Gas Mix">
                <option value="">— Select —</option>
                {GAS_MIXES.map((g) => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
              </SelectField>
              {gasMixValue === "nitrox" || gasMixValue === "trimix" ? (
                <Field<FormValues> name="o2Percent" label="O2 %" placeholder="e.g. 32" />
              ) : <div />}
            </FormGrid>

            {/* ── Gear ── */}
            <SectionHeading>Gear</SectionHeading>
            <FormGrid cols={2}>
              <Field<FormValues> name="wetsuit" label="Wetsuit" placeholder="e.g. 3mm full" />
              <Field<FormValues> name="bcd" label="BCD" placeholder="e.g. Scubapro Hydros" />
              <Field<FormValues> name="fins" label="Fins" placeholder="e.g. Mares Avanti" />
              <SelectField name="cylinderType" label="Cylinder Type">
                <option value="">— Select —</option>
                {CYLINDER_TYPES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </SelectField>
              <Field<FormValues> name="cylinderSize" label="Cylinder Size (L)" placeholder="e.g. 12" />
            </FormGrid>

            {/* ── Certification ── */}
            <SectionHeading>Certification Used</SectionHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Label htmlFor="certUsed">Cert Used</Label>
              <select id="certUsed" {...form.register("certUsed")}
                style={{ padding: "10px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 16, color: "#222", width: "100%", background: "white", boxSizing: "border-box" }}>
                <option value="">— None —</option>
                {certifications.map((c) => (
                  <option key={c.id} value={c.certName}>{c.certName}{c.agency ? ` (${c.agency})` : ""}</option>
                ))}
              </select>
            </div>

            {/* ── Marine Life ── */}
            <SectionHeading>Marine Life</SectionHeading>
            <div style={{ position: "relative" }}>
              {tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {tags.map((t) => (
                    <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#e3f0ff", color: "#1565c0", borderRadius: 16, padding: "3px 10px", fontSize: 13 }}>
                      {t}
                      <button type="button" onClick={() => removeTag(t)} style={{ background: "none", border: "none", cursor: "pointer", color: "#1565c0", fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
                    </span>
                  ))}
                </div>
              )}
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  if (tagInputRef.current) setDropdownRect(tagInputRef.current.getBoundingClientRect());
                  setShowSuggestions(true);
                }}
                onFocus={() => { if (tagInputRef.current) setDropdownRect(tagInputRef.current.getBoundingClientRect()); setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (tagInput.trim()) addTag(tagInput.trim()); } }}
                placeholder="Type to search species, Enter to add…"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14, color: "#222", boxSizing: "border-box" }}
              />
              {showSuggestions && filteredSuggestions.length > 0 && dropdownRect && (
                <div style={{ position: "fixed", top: dropdownRect.bottom + 4, left: dropdownRect.left, width: dropdownRect.width, background: "white", border: "1px solid #dde3ec", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 500, maxHeight: 200, overflowY: "auto" }}>
                  {filteredSuggestions.map((s) => (
                    <button key={s.id} type="button" onMouseDown={(e) => { e.preventDefault(); addTag(s.name); }}
                      style={{ display: "flex", justifyContent: "space-between", width: "100%", textAlign: "left", padding: "8px 14px", background: "none", border: "none", fontSize: 13, color: "#222", cursor: "pointer", borderBottom: "1px solid #f0f0f0" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#e3f0ff"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}>
                      {s.name}
                      {s.category && <span style={{ fontSize: 11, color: "#888" }}>{s.category}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Location ── */}
            <SectionHeading>Location (for map)</SectionHeading>
            <FormGrid cols={2}>
              <Field<FormValues> name="lat" label="Latitude" placeholder="e.g. 27.9158" />
              <Field<FormValues> name="lng" label="Longitude" placeholder="e.g. 34.3299" />
            </FormGrid>

            {/* ── Notes ── */}
            <SectionHeading>Notes</SectionHeading>
            <TextareaField name="notes" label="Notes" placeholder="Conditions, observations, anything else…" />
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
