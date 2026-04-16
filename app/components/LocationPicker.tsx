"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const LeafletLocationMap = dynamic(() => import("./LeafletLocationMap"), { ssr: false });

type Props = {
  lat: string;
  lng: string;
  onChange: (lat: string, lng: string) => void;
};

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

export default function LocationPicker({ lat, lng, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasCoords = lat !== "" && lng !== "";

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
        const res = await fetch(url, {
          headers: { "Accept-Language": "en" },
        });
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const selectSuggestion = (result: NominatimResult) => {
    onChange(result.lat, result.lon);
    setQuery(result.display_name);
    setSuggestions([]);
    setShowMap(true);
  };

  const clearCoords = () => {
    onChange("", "");
    setQuery("");
    setSuggestions([]);
  };

  return (
    <div>
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
        Location (for map)
      </p>

      {/* Address search */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a dive site address…"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 6,
            border: "1px solid #ccc",
            fontSize: 15,
            boxSizing: "border-box",
          }}
        />
        {isSearching && (
          <span
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#888", fontSize: 13 }}
          >
            Searching…
          </span>
        )}
        {suggestions.length > 0 && (
          <ul
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "white",
              border: "1px solid #ccc",
              borderRadius: 6,
              margin: 0,
              padding: 0,
              listStyle: "none",
              zIndex: 500,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {suggestions.map((s, i) => (
              <li
                key={i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(s);
                }}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontSize: 14,
                  borderBottom: i < suggestions.length - 1 ? "1px solid #eee" : "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLLIElement).style.background = "#f0f4ff";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLLIElement).style.background = "white";
                }}
              >
                {s.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Lat/Lng inputs + controls */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 3 }}>
            Latitude
          </label>
          <input
            type="number"
            value={lat}
            onChange={(e) => onChange(e.target.value, lng)}
            placeholder="e.g. 27.9213"
            step="any"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid #ccc",
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 3 }}>
            Longitude
          </label>
          <input
            type="number"
            value={lng}
            onChange={(e) => onChange(lat, e.target.value)}
            placeholder="e.g. 34.5098"
            step="any"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid #ccc",
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "1px solid #1565c0",
            background: showMap ? "#1565c0" : "white",
            color: showMap ? "white" : "#1565c0",
            fontSize: 14,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {showMap ? "Hide Map" : "Pick on Map"}
        </button>
        {hasCoords && (
          <button
            type="button"
            onClick={clearCoords}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "1px solid #c62828",
              background: "white",
              color: "#c62828",
              fontSize: 14,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Map */}
      {showMap && (
        <div style={{ marginTop: 12 }}>
          <LeafletLocationMap lat={lat} lng={lng} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
