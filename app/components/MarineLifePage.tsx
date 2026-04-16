"use client";

import { useState, useEffect, useCallback } from "react";
import { type PublicUser } from "@/app/types/user";
import AppHeader from "@/app/components/AppHeader";
import Spinner from "@/app/components/Spinner";
import ConfirmModal from "@/app/components/ConfirmModal";
import { Button, Card, Field, FormGrid } from "@/components/ui/form";

const CATEGORIES = [
  "Fish",
  "Shark & Ray",
  "Turtle & Reptile",
  "Invertebrate",
  "Marine Mammal",
  "Cephalopod",
  "Coral & Plant",
  "Other",
] as const;

type Category = (typeof CATEGORIES)[number] | string;

type Species = { id: number; name: string; category?: string };

type DiveLogWithMarineLife = {
  id: number;
  location: string;
  date: string;
  marineLife?: string | null;
  userId: number;
  firstName?: string;
  lastName?: string;
};

function TagChip({
  label,
  onDelete,
}: {
  label: string;
  onDelete?: () => void;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "#e3f2fd",
        color: "#1565c0",
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 1.4,
      }}
    >
      {label}
      {onDelete && (
        <button
          onClick={onDelete}
          title={`Remove ${label}`}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#1565c0",
            padding: "0 2px",
            fontSize: 14,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          ✕
        </button>
      )}
    </span>
  );
}

// ── Tab 1: My Sightings ──────────────────────────────────────────────────────

function SightingsTab({ user }: { user: PublicUser }) {
  const [logs, setLogs] = useState<DiveLogWithMarineLife[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const url = Boolean(user.isAdmin) && showAll ? "/api/logs?all=1" : "/api/logs";
      const res = await fetch(url);
      if (!res.ok) return;
      const data: DiveLogWithMarineLife[] = await res.json();
      setLogs(data.filter((l) => l.marineLife && l.marineLife.trim() !== ""));
    } finally {
      setLoading(false);
    }
  }, [user.isAdmin, showAll]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      {Boolean(user.isAdmin) && (
        <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
          <Button
            variant={!showAll ? "primary" : "secondary"}
            onClick={() => setShowAll(false)}
          >
            My Dives
          </Button>
          <Button
            variant={showAll ? "primary" : "secondary"}
            onClick={() => setShowAll(true)}
          >
            All Dives
          </Button>
        </div>
      )}

      {logs.length === 0 ? (
        <p style={{ color: "#666", textAlign: "center", padding: "32px 0" }}>
          No dive logs with marine life sightings yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {logs.map((log) => {
            const species = log.marineLife
              ? log.marineLife
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [];
            return (
              <Card key={log.id}>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>
                    {log.location}
                  </span>
                  <span
                    style={{ color: "#888", fontSize: 13, marginLeft: 10 }}
                  >
                    {log.date}
                  </span>
                  {Boolean(user.isAdmin) && showAll && log.firstName && (
                    <span
                      style={{
                        color: "#555",
                        fontSize: 13,
                        marginLeft: 10,
                      }}
                    >
                      — {log.firstName} {log.lastName}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {species.map((s) => (
                    <TagChip key={s} label={s} />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Species List ──────────────────────────────────────────────────────

function SpeciesListTab({ user }: { user: PublicUser }) {
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("Fish");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Species | null>(null);

  const fetchSpecies = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/species");
      if (!res.ok) throw new Error("Failed to load");
      setSpecies(await res.json());
    } catch {
      setError("Could not load species list.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpecies();
  }, [fetchSpecies]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/species", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category: newCategory }),
      });
      if (res.status === 409) {
        setAddError("That species already exists.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAddError(data.error ?? "Failed to add species.");
        return;
      }
      setNewName("");
      await fetchSpecies();
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/admin/species/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    await fetchSpecies();
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <p style={{ color: "#c62828", textAlign: "center" }}>{error}</p>;
  }

  // Group by category
  const grouped: Record<string, Species[]> = {};
  for (const s of species) {
    const cat = s.category ?? "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  }

  const orderedCategories = [
    ...CATEGORIES.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !CATEGORIES.includes(c as never)),
  ];

  return (
    <div>
      {Boolean(user.isAdmin) && (
        <Card style={{ marginBottom: 20 }}>
          <form onSubmit={handleAdd}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 15,
                marginBottom: 12,
                color: "#1565c0",
              }}
            >
              Add New Species
            </div>
            <FormGrid>
              <Field label="Species Name" required>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Blue Spotted Ray"
                  required
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              </Field>
              <Field label="Category">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    fontSize: 14,
                    boxSizing: "border-box",
                    background: "white",
                  }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            </FormGrid>
            {addError && (
              <p style={{ color: "#c62828", fontSize: 13, margin: "8px 0 0" }}>
                {addError}
              </p>
            )}
            <div style={{ marginTop: 12 }}>
              <Button type="submit" variant="primary" disabled={adding}>
                {adding ? "Adding…" : "Add Species"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {orderedCategories.length === 0 ? (
        <p style={{ color: "#666", textAlign: "center", padding: "32px 0" }}>
          No species in the list yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {orderedCategories.map((cat) => (
            <div key={cat}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#555",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 8,
                  paddingBottom: 4,
                  borderBottom: "1px solid #e0e0e0",
                }}
              >
                {cat}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {grouped[cat].map((s) => (
                  <TagChip
                    key={s.id}
                    label={s.name}
                    onDelete={
                      Boolean(user.isAdmin)
                        ? () => setDeleteTarget(s)
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Remove Species"
          message={`Remove "${deleteTarget.name}" from the species list?`}
          confirmLabel="Remove"
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

type Tab = "sightings" | "species";

export default function MarineLifePage({ user }: { user: PublicUser }) {
  const [tab, setTab] = useState<Tab>("sightings");
  const [speciesTabVisited, setSpeciesTabVisited] = useState(false);

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (t === "species") setSpeciesTabVisited(true);
  };

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    background: active ? "white" : "transparent",
    border: "none",
    borderBottom: active ? "2px solid #1976d2" : "2px solid transparent",
    color: active ? "#1976d2" : "#666",
    fontSize: 15,
    fontWeight: active ? 600 : 400,
    padding: "10px 20px",
    cursor: "pointer",
    transition: "color 0.15s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa" }}>
      <AppHeader user={user} />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
        <h1 style={{ margin: "0 0 20px", fontSize: 24, color: "#1a237e" }}>
          Marine Life
        </h1>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #e0e0e0",
            marginBottom: 24,
          }}
        >
          <button
            style={TAB_STYLE(tab === "sightings")}
            onClick={() => handleTabChange("sightings")}
          >
            My Sightings
          </button>
          <button
            style={TAB_STYLE(tab === "species")}
            onClick={() => handleTabChange("species")}
          >
            Species List
          </button>
        </div>

        {/* Tab content */}
        {tab === "sightings" && <SightingsTab user={user} />}
        {(tab === "species" || speciesTabVisited) && (
          <div style={{ display: tab === "species" ? "block" : "none" }}>
            <SpeciesListTab user={user} />
          </div>
        )}
      </div>
    </div>
  );
}
