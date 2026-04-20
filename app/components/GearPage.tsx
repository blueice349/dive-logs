"use client";

import { useEffect, useState, useCallback } from "react";
import { type PublicUser } from "@/app/types/user";
import AppHeader from "./AppHeader";
import Spinner from "./Spinner";
import ConfirmModal from "./ConfirmModal";

export const GEAR_TYPES = [
  "Regulator",
  "BCD",
  "Wetsuit",
  "Fins",
  "Tank",
  "Dive Computer",
  "Other",
] as const;

type GearType = (typeof GEAR_TYPES)[number];

type GearItem = {
  id: number;
  userId: number;
  name: string;
  type: string;
  serialNumber?: string;
  purchaseDate?: string;
  lastServiceDate?: string;
  divesAtLastService: number;
  serviceIntervalDives?: number;
  serviceIntervalMonths?: number;
  notes?: string;
  createdAt: number;
  divesSinceService: number;
};

type ServiceStatus = "overdue" | "due-soon" | "ok" | "none";

function getServiceStatus(item: GearItem): ServiceStatus {
  const divesSince = item.divesSinceService ?? 0;
  const monthsSince = item.lastServiceDate
    ? (Date.now() - new Date(item.lastServiceDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
    : Infinity;

  if (!item.serviceIntervalDives && !item.serviceIntervalMonths) return "none";

  const diveOverdue = item.serviceIntervalDives && divesSince >= item.serviceIntervalDives;
  const monthOverdue = item.serviceIntervalMonths && monthsSince >= item.serviceIntervalMonths;
  if (diveOverdue || monthOverdue) return "overdue";

  const diveDueSoon = item.serviceIntervalDives && divesSince >= item.serviceIntervalDives - 10;
  const monthDueSoon =
    item.serviceIntervalMonths && monthsSince >= item.serviceIntervalMonths - 1;
  if (diveDueSoon || monthDueSoon) return "due-soon";

  return "ok";
}

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  Regulator: { bg: "#e3f2fd", color: "#1565c0" },
  BCD: { bg: "#e8f5e9", color: "#2e7d32" },
  Wetsuit: { bg: "#f5f5f5", color: "#424242" },
  Fins: { bg: "#f5f5f5", color: "#424242" },
  Tank: { bg: "#fff3e0", color: "#e65100" },
  "Dive Computer": { bg: "#f3e5f5", color: "#6a1b9a" },
  Other: { bg: "#f5f5f5", color: "#555" },
};

const STATUS_BADGE: Record<ServiceStatus, { bg: string; color: string; label: string }> = {
  overdue: { bg: "#ffebee", color: "#c62828", label: "Overdue" },
  "due-soon": { bg: "#fff8e1", color: "#e65100", label: "Due Soon" },
  ok: { bg: "#e8f5e9", color: "#2e7d32", label: "OK" },
  none: { bg: "#f5f5f5", color: "#757575", label: "No Service Set" },
};

const STATUS_SORT_ORDER: Record<ServiceStatus, number> = {
  overdue: 0,
  "due-soon": 1,
  ok: 2,
  none: 3,
};

const EMPTY_FORM = {
  name: "",
  type: "Regulator" as GearType,
  serialNumber: "",
  purchaseDate: "",
  lastServiceDate: "",
  divesAtLastService: 0,
  serviceIntervalDives: "",
  serviceIntervalMonths: "",
  notes: "",
};

type FormValues = typeof EMPTY_FORM;

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function GearTab({ user }: { user: PublicUser }) {
  const [items, setItems] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GearItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<GearItem | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [loggingService, setLoggingService] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/gear");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (item: GearItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      type: (GEAR_TYPES.includes(item.type as GearType) ? item.type : "Other") as GearType,
      serialNumber: item.serialNumber ?? "",
      purchaseDate: item.purchaseDate ?? "",
      lastServiceDate: item.lastServiceDate ?? "",
      divesAtLastService: item.divesAtLastService,
      serviceIntervalDives: item.serviceIntervalDives?.toString() ?? "",
      serviceIntervalMonths: item.serviceIntervalMonths?.toString() ?? "",
      notes: item.notes ?? "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      type: form.type,
      serialNumber: form.serialNumber.trim() || null,
      purchaseDate: form.purchaseDate || null,
      lastServiceDate: form.lastServiceDate || null,
      divesAtLastService: Number(form.divesAtLastService) || 0,
      serviceIntervalDives: form.serviceIntervalDives
        ? Number(form.serviceIntervalDives)
        : null,
      serviceIntervalMonths: form.serviceIntervalMonths
        ? Number(form.serviceIntervalMonths)
        : null,
      notes: form.notes.trim() || null,
    };

    const url = editingItem ? `/api/gear/${editingItem.id}` : "/api/gear";
    const method = editingItem ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (res.ok) {
      const saved: GearItem = await res.json();
      if (editingItem) {
        setItems((prev) => prev.map((i) => (i.id === saved.id ? saved : i)));
      } else {
        setItems((prev) => [...prev, saved]);
      }
      setShowModal(false);
    } else {
      const data = await res.json().catch(() => ({ error: "Failed to save" }));
      setFormError(data.error ?? "Failed to save");
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    const res = await fetch(`/api/gear/${deletingItem.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== deletingItem.id));
      setDeletingItem(null);
    } else {
      alert("Failed to delete gear item.");
    }
  };

  const handleLogService = async (item: GearItem) => {
    setLoggingService(item.id);
    const res = await fetch(`/api/gear/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logService" }),
    });
    setLoggingService(null);
    if (res.ok) {
      const updated: GearItem = await res.json();
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } else {
      alert("Failed to log service.");
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    const sa = STATUS_SORT_ORDER[getServiceStatus(a)];
    const sb = STATUS_SORT_ORDER[getServiceStatus(b)];
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name);
  });

  const overdueCount = items.filter((i) => getServiceStatus(i) === "overdue").length;

  return (
    <div>
        {/* Page header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: 28, color: "#222" }}>My Gear</h1>
            {overdueCount > 0 && (
              <p style={{ margin: 0, fontSize: 14, color: "#c62828" }}>
                {overdueCount} item{overdueCount !== 1 ? "s" : ""} overdue for service
              </p>
            )}
          </div>
          <button
            onClick={openAdd}
            style={{
              background: "#1565c0",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Add Gear
          </button>
        </div>

        {loading && <Spinner />}

        {!loading && items.length === 0 && (
          <div
            style={{
              background: "white",
              borderRadius: 12,
              border: "1px solid #ddd",
              padding: "48px 24px",
              textAlign: "center",
              color: "#888",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🤿</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#555", marginBottom: 8 }}>
              No gear added yet
            </div>
            <div style={{ fontSize: 14 }}>
              Add your diving equipment to track service intervals and get alerts.
            </div>
          </div>
        )}

        {!loading && sortedItems.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sortedItems.map((item) => {
              const status = getServiceStatus(item);
              const statusBadge = STATUS_BADGE[status];
              const typeColor = TYPE_COLORS[item.type] ?? TYPE_COLORS.Other;
              const divesSince = item.divesSinceService ?? 0;
              const isLogging = loggingService === item.id;

              return (
                <div
                  key={item.id}
                  style={{
                    background: "white",
                    borderRadius: 12,
                    border: "1px solid #ddd",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                    padding: "16px 20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Left: name + badges */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{ fontSize: 18, fontWeight: 700, color: "#222", wordBreak: "break-word" }}
                        >
                          {item.name}
                        </span>
                        <span
                          style={{
                            background: typeColor.bg,
                            color: typeColor.color,
                            borderRadius: 12,
                            padding: "2px 10px",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {item.type}
                        </span>
                        <span
                          style={{
                            background: statusBadge.bg,
                            color: statusBadge.color,
                            borderRadius: 12,
                            padding: "2px 10px",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {statusBadge.label}
                        </span>
                      </div>

                      {/* Details */}
                      <div
                        style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#555" }}
                      >
                        {item.serialNumber && (
                          <span>S/N: {item.serialNumber}</span>
                        )}
                        {item.purchaseDate && (
                          <span>Purchased: {formatDate(item.purchaseDate)}</span>
                        )}
                      </div>

                      {/* Service info */}
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 16,
                          flexWrap: "wrap",
                          fontSize: 13,
                          color: "#444",
                        }}
                      >
                        <span>
                          Last serviced:{" "}
                          {item.lastServiceDate ? formatDate(item.lastServiceDate) : "Never"}
                        </span>
                        {(item.serviceIntervalDives || item.serviceIntervalMonths) && (
                          <span style={{ color: status === "overdue" ? "#c62828" : status === "due-soon" ? "#e65100" : "#2e7d32", fontWeight: 600 }}>
                            Dives since last service: {divesSince}
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p style={{ margin: "8px 0 0", fontSize: 13, color: "#666", fontStyle: "italic" }}>
                          {item.notes}
                        </p>
                      )}
                    </div>

                    {/* Right: action buttons */}
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                      <button
                        onClick={() => handleLogService(item)}
                        disabled={isLogging}
                        style={{
                          background: isLogging ? "#b0bec5" : "#e8f5e9",
                          color: isLogging ? "#fff" : "#2e7d32",
                          border: "1px solid #c8e6c9",
                          borderRadius: 6,
                          padding: "6px 14px",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: isLogging ? "not-allowed" : "pointer",
                        }}
                      >
                        {isLogging ? "Logging…" : "Log Service"}
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        style={{
                          background: "#e3f2fd",
                          color: "#1565c0",
                          border: "1px solid #bbdefb",
                          borderRadius: 6,
                          padding: "6px 14px",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingItem(item)}
                        style={{
                          background: "#ffebee",
                          color: "#c62828",
                          border: "1px solid #ffcdd2",
                          borderRadius: 6,
                          padding: "6px 14px",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          onClick={() => !saving && setShowModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 300,
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
              maxWidth: 520,
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2 style={{ margin: "0 0 20px", fontSize: 20, color: "#1565c0" }}>
              {editingItem ? "Edit Gear" : "Add Gear"}
            </h2>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Name */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={labelStyle}>Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  style={inputStyle}
                  placeholder="e.g. Scubapro MK25"
                />
              </div>

              {/* Type */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={labelStyle}>Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as GearType }))}
                  style={inputStyle}
                  required
                >
                  {GEAR_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Serial Number */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={labelStyle}>Serial Number</label>
                <input
                  value={form.serialNumber}
                  onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                  style={inputStyle}
                  placeholder="Optional"
                />
              </div>

              {/* Purchase Date */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={labelStyle}>Purchase Date</label>
                <input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              {/* Last Service Date */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={labelStyle}>Last Service Date</label>
                <input
                  type="date"
                  value={form.lastServiceDate}
                  onChange={(e) => setForm((f) => ({ ...f, lastServiceDate: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              {/* Service Interval (dives) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={labelStyle}>Service Interval (dives)</label>
                <input
                  type="number"
                  min={1}
                  value={form.serviceIntervalDives}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, serviceIntervalDives: e.target.value }))
                  }
                  style={inputStyle}
                  placeholder="e.g. 100"
                />
              </div>

              {/* Service Interval (months) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={labelStyle}>Service Interval (months)</label>
                <input
                  type="number"
                  min={1}
                  value={form.serviceIntervalMonths}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, serviceIntervalMonths: e.target.value }))
                  }
                  style={inputStyle}
                  placeholder="e.g. 12"
                />
              </div>

              {/* Notes */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={labelStyle}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
                  placeholder="Optional notes about this gear"
                />
              </div>

              {formError && (
                <p style={{ margin: 0, color: "#c62828", fontSize: 13 }}>{formError}</p>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  style={secondaryBtnStyle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    ...primaryBtnStyle,
                    background: saving ? "#b0bec5" : "#1565c0",
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving…" : editingItem ? "Save Changes" : "Add Gear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingItem && (
        <ConfirmModal
          title="Delete Gear Item"
          message={`Delete "${deletingItem.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onClose={() => setDeletingItem(null)}
        />
      )}
    </div>
  );
}

export default function GearPage({ user }: { user: PublicUser }) {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f0f4f8" }}>
      <AppHeader user={user} />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
        <GearTab user={user} />
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#444",
};

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #ccc",
  fontSize: 15,
  color: "#222",
  background: "white",
  width: "100%",
  boxSizing: "border-box",
};

const primaryBtnStyle: React.CSSProperties = {
  background: "#1565c0",
  color: "white",
  border: "none",
  borderRadius: 6,
  padding: "9px 20px",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryBtnStyle: React.CSSProperties = {
  background: "white",
  color: "#555",
  border: "1px solid #ccc",
  borderRadius: 6,
  padding: "9px 20px",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};
