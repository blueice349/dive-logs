"use client";

import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui/form";
import { type PublicUser } from "@/app/types/user";
import AppHeader from "./AppHeader";
import ConfirmModal from "./ConfirmModal";
import Spinner from "./Spinner";

type Species = { id: number; name: string; category?: string };

const CATEGORIES = [
  "Fish",
  "Shark & Ray",
  "Turtle",
  "Cetacean",
  "Cephalopod",
  "Crustacean",
  "Echinoderm",
  "Coral & Sponge",
  "Worm & Nudibranch",
  "Other",
];

export default function SpeciesAdminPage({ user }: { user: PublicUser }) {
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [deletingSpecies, setDeletingSpecies] = useState<Species | null>(null);

  useEffect(() => {
    fetch("/api/admin/species")
      .then((r) => r.json())
      .then((data) => { setSpecies(data); setLoading(false); });
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setAddError("");
    const res = await fetch("/api/admin/species", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), category: newCategory }),
    });
    setAdding(false);
    if (res.ok) {
      const saved: Species = await res.json();
      setSpecies((prev) => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewCategory("");
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed to add species" }));
      setAddError(error ?? "Failed to add species");
    }
  };

  const handleDelete = async () => {
    if (!deletingSpecies) return;
    const res = await fetch(`/api/admin/species/${deletingSpecies.id}`, { method: "DELETE" });
    if (res.ok) {
      setSpecies((prev) => prev.filter((s) => s.id !== deletingSpecies.id));
      setDeletingSpecies(null);
    } else {
      alert("Failed to delete species.");
    }
  };

  const visible = species.filter((s) => {
    const matchSearch = !search.trim() || s.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || s.category === filterCat;
    return matchSearch && matchCat;
  });

  const grouped = CATEGORIES.reduce<Record<string, Species[]>>((acc, cat) => {
    const items = visible.filter((s) => s.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});
  const uncategorized = visible.filter((s) => !s.category);
  if (uncategorized.length) grouped["Uncategorized"] = uncategorized;

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f0f4f8" }}>
      <AppHeader user={user} />

      <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 28 }}>Species List</h1>
        <p style={{ margin: "0 0 20px", color: "#666", fontSize: 14 }}>
          Approved species that appear as autocomplete suggestions in dive logs.
        </p>

        {/* Add form */}
        <Card style={{ marginBottom: 20 }}>
          <form onSubmit={handleAdd} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>Species Name *</label>
              <input
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setAddError(""); }}
                placeholder="e.g. Green sea turtle"
                style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 15, color: "#222" }}
              />
            </div>
            <div style={{ flex: "1 1 160px", display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 15, color: "#222", background: "white" }}
              >
                <option value="">— None —</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Button type="submit" disabled={adding || !newName.trim()}>
              {adding ? "Adding…" : "Add Species"}
            </Button>
          </form>
          {addError && <p style={{ margin: "8px 0 0", color: "#c62828", fontSize: 13 }}>{addError}</p>}
        </Card>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search species…"
            style={{ flex: "1 1 200px", padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14, color: "#222", background: "white" }}
          />
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14, color: "#222", background: "white" }}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span style={{ alignSelf: "center", fontSize: 13, color: "#888" }}>
            {visible.length} of {species.length} species
          </span>
        </div>

        {loading && <Spinner />}

        {!loading && species.length === 0 && (
          <Card>
            <p style={{ margin: 0, color: "#888", textAlign: "center", padding: "20px 0" }}>
              No species yet. Add some above to enable autocomplete in dive logs.
            </p>
          </Card>
        )}

        {!loading && Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 16 }}>
            <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", color: "#1565c0" }}>
              {cat} ({items.length})
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {items.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "white",
                    border: "1px solid #dde",
                    borderRadius: 20,
                    padding: "4px 10px 4px 14px",
                    fontSize: 14,
                    color: "#333",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                  }}
                >
                  {s.name}
                  <button
                    onClick={() => setDeletingSpecies(s)}
                    title="Remove"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#aaa",
                      fontSize: 14,
                      lineHeight: 1,
                      padding: "0 2px",
                      borderRadius: "50%",
                    }}
                    aria-label={`Remove ${s.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {deletingSpecies && (
        <ConfirmModal
          title="Remove Species"
          message={`Remove "${deletingSpecies.name}" from the approved list? Existing dive logs are not affected.`}
          confirmLabel="Remove"
          onConfirm={handleDelete}
          onClose={() => setDeletingSpecies(null)}
        />
      )}
    </main>
  );
}
