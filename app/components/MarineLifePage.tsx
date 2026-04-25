"use client";

import { useEffect, useState } from "react";
import { type DiveLog } from "@/app/api/logs/data";
import { type PublicUser } from "@/app/types/user";
import Spinner from "./Spinner";
import ConfirmModal from "./ConfirmModal";
import { Card } from "@/components/ui/form";

type Filter = "mine" | "all";
type Tab = "sightings" | "species";

type SpeciesEntry = {
  name: string;
  count: number;
  dives: { location: string; date: string }[];
};

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

function parseSpecies(logs: DiveLog[]): SpeciesEntry[] {
  const map = new Map<string, { count: number; dives: { location: string; date: string }[] }>();
  for (const log of logs) {
    if (!log.marineLife?.trim()) continue;
    const species = log.marineLife.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const dive = {
      location: log.location,
      date: log.date.split("T")[0].replace(/(\d{4})-(\d{2})-(\d{2})/, "$2/$3/$1"),
    };
    for (const name of species) {
      if (!map.has(name)) map.set(name, { count: 0, dives: [] });
      const entry = map.get(name)!;
      entry.count += 1;
      entry.dives.push(dive);
    }
  }
  return Array.from(map.entries())
    .map(([name, { count, dives }]) => ({ name, count, dives }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function MarineLifePage({ user }: { user: PublicUser }) {
  const [tab, setTab] = useState<Tab>("sightings");

  // — Sightings tab state —
  const [logs, setLogs] = useState<DiveLog[]>([]);
  const [filter, setFilter] = useState<Filter>("mine");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = filter === "all" ? "/api/logs?filter=all" : "/api/logs";
    fetch(url).then((r) => {
      if (r.ok) r.json().then((data: DiveLog[]) => { setLogs(data); setLoading(false); });
      else setLoading(false);
    });
  }, [filter]);

  const allSpecies = parseSpecies(logs);
  const filteredSpecies = search.trim()
    ? allSpecies.filter((s) => s.name.includes(search.toLowerCase().trim()))
    : allSpecies;
  const uniqueCount = allSpecies.length;
  const hasAnyMarineLife = logs.some((l) => l.marineLife?.trim());

  // — Species tab state —
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [speciesLoading, setSpeciesLoading] = useState(false);
  const [speciesLoaded, setSpeciesLoaded] = useState(false);
  const [speciesSearch, setSpeciesSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [deletingSpecies, setDeletingSpecies] = useState<Species | null>(null);

  const loadSpecies = () => {
    if (speciesLoaded) return;
    setSpeciesLoading(true);
    const url = user.isAdmin ? "/api/admin/species" : "/api/species";
    fetch(url)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setSpeciesList(data); setSpeciesLoading(false); setSpeciesLoaded(true); });
  };

  useEffect(() => {
    if (tab === "species") loadSpecies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleAddSpecies = async (e: React.FormEvent) => {
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
      setSpeciesList((prev) => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewCategory("");
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed to add species" }));
      setAddError(error ?? "Failed to add species");
    }
  };

  const handleDeleteSpecies = async () => {
    if (!deletingSpecies) return;
    const res = await fetch(`/api/admin/species/${deletingSpecies.id}`, { method: "DELETE" });
    if (res.ok) {
      setSpeciesList((prev) => prev.filter((s) => s.id !== deletingSpecies.id));
      setDeletingSpecies(null);
    } else {
      alert("Failed to remove species.");
    }
  };

  const visibleSpecies = speciesList.filter((s) => {
    const matchSearch = !speciesSearch.trim() || s.name.toLowerCase().includes(speciesSearch.toLowerCase());
    const matchCat = !filterCat || s.category === filterCat;
    return matchSearch && matchCat;
  });

  const grouped = CATEGORIES.reduce<Record<string, Species[]>>((acc, cat) => {
    const items = visibleSpecies.filter((s) => s.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});
  const uncategorized = visibleSpecies.filter((s) => !s.category);
  if (uncategorized.length) grouped["Uncategorized"] = uncategorized;

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", minHeight: "calc(100vh - 56px)", background: "#f0f4f8" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 28, color: "#222" }}>Marine Life</h1>
          {tab === "sightings" && user.isAdmin && (
            <div style={{ display: "flex", background: "#e0e7ef", borderRadius: 8, padding: 3, gap: 2 }}>
              {(["mine", "all"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    background: filter === f ? "white" : "transparent",
                    border: "none", borderRadius: 6, padding: "5px 16px",
                    fontSize: 14, fontWeight: filter === f ? 600 : 400,
                    color: filter === f ? "#1565c0" : "#555", cursor: "pointer",
                    boxShadow: filter === f ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  {f === "mine" ? "My Dives" : "All Dives"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: "2px solid #e0e7ef", marginBottom: 24, gap: 0 }}>
          {([["sightings", "My Sightings"], ["species", "Species List"]] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: "none",
                border: "none",
                borderBottom: tab === t ? "2px solid #1565c0" : "2px solid transparent",
                marginBottom: -2,
                padding: "10px 20px",
                fontSize: 15,
                fontWeight: tab === t ? 700 : 400,
                color: tab === t ? "#1565c0" : "#666",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── SIGHTINGS TAB ── */}
        {tab === "sightings" && (
          <>
            {/* Stat bar */}
            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              <Card style={{ marginBottom: 0, padding: "16px 24px", display: "flex", alignItems: "center", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#1565c0", lineHeight: 1 }}>{uniqueCount}</div>
                  <div style={{ fontSize: 14, color: "#555", marginTop: 4 }}>Unique Species</div>
                </div>
                <div style={{ width: 1, height: 40, background: "#e0e7ef", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#1565c0", lineHeight: 1 }}>{logs.filter((l) => l.marineLife?.trim()).length}</div>
                  <div style={{ fontSize: 14, color: "#555", marginTop: 4 }}>Dives with Sightings</div>
                </div>
                <div style={{ width: 1, height: 40, background: "#e0e7ef", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#1565c0", lineHeight: 1 }}>{allSpecies.reduce((s, e) => s + e.count, 0)}</div>
                  <div style={{ fontSize: 14, color: "#555", marginTop: 4 }}>Total Sightings</div>
                </div>
              </Card>
            </div>

            {/* Search */}
            <div style={{ position: "relative", marginBottom: 20 }}>
              <input
                type="text"
                placeholder="Search species by name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", padding: "10px 36px 10px 14px", borderRadius: 8, border: "1px solid #ccc", fontSize: 15, boxSizing: "border-box", background: "white", color: "#222" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#999", lineHeight: 1, padding: 2 }} aria-label="Clear search">✕</button>
              )}
            </div>

            <h2 style={{ margin: "0 0 16px", fontSize: 20, color: "#1565c0" }}>
              Species Gallery
              {search.trim() && filteredSpecies.length !== allSpecies.length && (
                <span style={{ fontSize: 14, color: "#888", fontWeight: 400, marginLeft: 8 }}>({filteredSpecies.length} of {uniqueCount})</span>
              )}
            </h2>

            {loading && <Spinner />}

            {!loading && !hasAnyMarineLife && (
              <Card>
                <div style={{ padding: "32px 0", textAlign: "center", color: "#888" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🐠</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#555", marginBottom: 8 }}>No marine life logged yet</div>
                  <div style={{ fontSize: 14 }}>Start adding species to your dive logs to build your gallery.</div>
                </div>
              </Card>
            )}

            {!loading && hasAnyMarineLife && filteredSpecies.length === 0 && (
              <Card><div style={{ padding: "24px 0", textAlign: "center", color: "#888" }}>No species match &ldquo;{search}&rdquo;.</div></Card>
            )}

            {!loading && filteredSpecies.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                {filteredSpecies.map((species) => (
                  <div key={species.name} style={{ background: "white", borderRadius: 10, border: "1px solid #ddd", boxShadow: "0 2px 6px rgba(0,0,0,0.05)", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1565c0", wordBreak: "break-word" }}>{capitalize(species.name)}</div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#e3f2fd", color: "#1565c0", borderRadius: 12, padding: "2px 10px", fontSize: 13, fontWeight: 600, width: "fit-content" }}>
                      {species.count} {species.count === 1 ? "sighting" : "sightings"}
                    </div>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                      {species.dives.map((dive, i) => (
                        <li key={i} style={{ fontSize: 12, color: "#555", display: "flex", flexDirection: "column", gap: 1, paddingLeft: 8, borderLeft: "2px solid #e3f2fd" }}>
                          <span style={{ fontWeight: 600, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dive.location}</span>
                          <span style={{ color: "#888" }}>{dive.date}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── SPECIES LIST TAB ── */}
        {tab === "species" && (
          <>
            {/* Admin-only: add form */}
            {Boolean(user.isAdmin) && (
              <Card style={{ marginBottom: 20 }}>
                <form onSubmit={handleAddSpecies} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
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
                  <button
                    type="submit"
                    disabled={adding || !newName.trim()}
                    style={{ padding: "8px 20px", borderRadius: 6, background: adding || !newName.trim() ? "#b0bec5" : "#1565c0", color: "white", border: "none", fontSize: 15, fontWeight: 600, cursor: adding || !newName.trim() ? "not-allowed" : "pointer" }}
                  >
                    {adding ? "Adding…" : "Add Species"}
                  </button>
                </form>
                {addError && <p style={{ margin: "8px 0 0", color: "#c62828", fontSize: 13 }}>{addError}</p>}
              </Card>
            )}

            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={speciesSearch}
                onChange={(e) => setSpeciesSearch(e.target.value)}
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
              <span style={{ fontSize: 13, color: "#888", whiteSpace: "nowrap" }}>
                {visibleSpecies.length} of {speciesList.length} species
              </span>
            </div>

            {speciesLoading && <Spinner />}

            {!speciesLoading && speciesList.length === 0 && (
              <Card>
                <p style={{ margin: 0, color: "#888", textAlign: "center", padding: "20px 0" }}>
                  No species in the list yet.{user.isAdmin ? " Add some above." : ""}
                </p>
              </Card>
            )}

            {!speciesLoading && Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom: 20 }}>
                <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", color: "#1565c0" }}>
                  {cat} ({items.length})
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {items.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        background: "white", border: "1px solid #dde",
                        borderRadius: 20, padding: Boolean(user.isAdmin) ? "4px 10px 4px 14px" : "4px 14px",
                        fontSize: 14, color: "#333",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                      }}
                    >
                      {s.name}
                      {Boolean(user.isAdmin) && (
                        <button
                          onClick={() => setDeletingSpecies(s)}
                          title="Remove"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 14, lineHeight: 1, padding: "0 2px", borderRadius: "50%" }}
                          aria-label={`Remove ${s.name}`}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {deletingSpecies && (
        <ConfirmModal
          title="Remove Species"
          message={`Remove "${deletingSpecies.name}" from the approved list? Existing dive logs are not affected.`}
          confirmLabel="Remove"
          onConfirm={handleDeleteSpecies}
          onClose={() => setDeletingSpecies(null)}
        />
      )}
    </main>
  );
}
