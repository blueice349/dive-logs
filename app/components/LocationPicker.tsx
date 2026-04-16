"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import the map so it never SSRs (Leaflet requires window)
const LeafletMap = dynamic(() => import("./LeafletLocationMap"), { ssr: false });

type Props = {
  lat: string;
  lng: string;
  onChange: (lat: string, lng: string) => void;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

export default function LocationPicker({ lat, lng, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Open map automatically when coords are present
  useEffect(() => {
    if (lat && lng && !showMap) setShowMap(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = async (q: string) => {
    if (!q.trim()) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`,
        { headers: { "Accept-Language": "en" } }
      );
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
    } finally {
      setSearching(false);
    }
  };

  const handleQueryChange = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 500);
  };

  const handleSelect = (result: NominatimResult) => {
    onChange(
      parseFloat(result.lat).toFixed(6),
      parseFloat(result.lon).toFixed(6)
    );
    setQuery(result.display_name.split(",").slice(0, 2).join(", "));
    setSuggestions([]);
    setShowMap(true);
  };

  const hasCoords = lat !== "" && lng !== "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Address search */}
      <div style={{ position: "relative" }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Search Address / Dive Site
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="e.g. Blue Hole, Dahab or Coral Bay, Philippines"
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 7,
              border: "1px solid #ccc",
              fontSize: 14,
              color: "#222",
              background: "white",
              outline: "none",
            }}
          />
          {searching && (
            <div style={{ display: "flex", alignItems: "center", paddingRight: 4 }}>
              <div style={{ width: 16, height: 16, border: "2px solid #1565c0", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.75s linear infinite" }} />
            </div>
          )}
        </div>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid #dde3ec",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 500,
            marginTop: 2,
            overflow: "hidden",
          }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "9px 14px",
                  background: "none",
                  border: "none",
                  fontSize: 13,
                  color: "#222",
                  cursor: "pointer",
                  borderBottom: i < suggestions.length - 1 ? "1px solid #f0f0f0" : "none",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f0f4f8"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
              >
                {s.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Coords display + map toggle */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, flex: 1 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Latitude</label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => onChange(e.target.value, lng)}
              placeholder="e.g. 27.9158"
              style={{ width: "100%", padding: "8px 12px", borderRadius: 7, border: "1px solid #ccc", fontSize: 14, color: "#222", background: "white", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Longitude</label>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => onChange(lat, e.target.value)}
              placeholder="e.g. 34.3299"
              style={{ width: "100%", padding: "8px 12px", borderRadius: 7, border: "1px solid #ccc", fontSize: 14, color: "#222", background: "white", boxSizing: "border-box" }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          style={{
            marginTop: 20,
            padding: "8px 14px",
            borderRadius: 7,
            border: "1px solid #1565c0",
            background: showMap ? "#1565c0" : "white",
            color: showMap ? "white" : "#1565c0",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {showMap ? "Hide Map" : "Pick on Map"}
        </button>
        {hasCoords && (
          <button
            type="button"
            onClick={() => { onChange("", ""); setQuery(""); setShowMap(false); }}
            style={{
              marginTop: 20,
              padding: "8px 10px",
              borderRadius: 7,
              border: "1px solid #ccc",
              background: "white",
              color: "#888",
              fontSize: 13,
              cursor: "pointer",
            }}
            title="Clear coordinates"
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Map */}
      {showMap && (
        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #dde3ec", height: 280 }}>
          <LeafletMap
            lat={lat}
            lng={lng}
            onChange={onChange}
          />
        </div>
      )}
    </div>
  );
}
