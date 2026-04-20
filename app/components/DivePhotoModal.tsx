"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/form";
import { type DiveLog } from "@/app/api/logs/data";

type DivePhoto = {
  id: number;
  dive_log_id: number;
  user_id: number;
  photo_data: string;
  caption?: string;
  created_at: number;
};

export default function DivePhotoModal({
  dive,
  currentUserId,
  isAdmin,
  onClose,
}: {
  dive: DiveLog;
  currentUserId: number;
  isAdmin: number;
  onClose: () => void;
}) {
  const [photos, setPhotos] = useState<DivePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<DivePhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [captionInput, setCaptionInput] = useState("");
  const [pendingFile, setPendingFile] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>("");
  const [sizeWarning, setSizeWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/logs/${dive.id}/photos`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: DivePhoto[]) => {
        if (active) setPhotos(data);
      })
      .catch(() => {
        // silently fail — show empty state
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [dive.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSizeWarning(file.size > 5 * 1024 * 1024);
    setPendingFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        setPendingFile(result);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input so the same file can be re-selected
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/logs/${dive.id}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoData: pendingFile, caption: captionInput || undefined }),
      });
      if (res.ok) {
        const photo: DivePhoto = await res.json();
        setPhotos((prev) => [...prev, photo]);
        setPendingFile(null);
        setPendingFileName("");
        setCaptionInput("");
        setSizeWarning(false);
      } else {
        const { error } = await res.json().catch(() => ({ error: null }));
        alert(error ?? "Failed to upload photo.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo: DivePhoto) => {
    if (!confirm("Delete this photo?")) return;
    const res = await fetch(`/api/logs/${dive.id}/photos?photoId=${photo.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      if (lightbox?.id === photo.id) setLightbox(null);
    } else {
      alert("Failed to delete photo.");
    }
  };

  const formattedDate = dive.date
    .split("T")[0]
    .replace(/(\d{4})-(\d{2})-(\d{2})/, "$2/$3/$1");

  return (
    <>
      {/* Main modal */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          zIndex: 400,
          padding: "40px 16px 16px",
          overflowY: "auto",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "white",
            borderRadius: 12,
            width: "100%",
            maxWidth: 700,
            boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "#1565c0",
              color: "white",
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                📷 Photos — {dive.location}
              </div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
                {formattedDate}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "white",
                fontSize: 22,
                cursor: "pointer",
                lineHeight: 1,
                padding: "0 4px",
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: 20 }}>
            {/* Add photo section */}
            <div
              style={{
                background: "#f0f4f8",
                borderRadius: 8,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 10, color: "#333" }}>
                Add a Photo
              </div>
              {!pendingFile ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📁 Choose Image
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                </>
              ) : (
                <div>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <img
                      src={pendingFile}
                      alt="Preview"
                      style={{
                        width: 100,
                        height: 80,
                        objectFit: "cover",
                        borderRadius: 6,
                        border: "1px solid #ddd",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontSize: 13, color: "#555", marginBottom: 6 }}>
                        {pendingFileName}
                      </div>
                      {sizeWarning && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#e65100",
                            background: "#fff3e0",
                            borderRadius: 4,
                            padding: "4px 8px",
                            marginBottom: 6,
                          }}
                        >
                          ⚠️ File is larger than 5 MB — upload may be slow.
                        </div>
                      )}
                      <input
                        type="text"
                        placeholder="Caption (optional)"
                        value={captionInput}
                        onChange={(e) => setCaptionInput(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "6px 10px",
                          fontSize: 13,
                          border: "1px solid #ccc",
                          borderRadius: 6,
                          boxSizing: "border-box",
                          marginBottom: 8,
                        }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button size="sm" onClick={handleUpload} disabled={uploading}>
                          {uploading ? "Uploading…" : "Upload"}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={uploading}
                          onClick={() => {
                            setPendingFile(null);
                            setPendingFileName("");
                            setCaptionInput("");
                            setSizeWarning(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Photo grid */}
            {loading ? (
              <div style={{ textAlign: "center", color: "#888", padding: 32 }}>
                Loading photos…
              </div>
            ) : photos.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#999",
                  padding: 40,
                  fontSize: 15,
                }}
              >
                No photos yet. Add the first one above!
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 12,
                }}
              >
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    style={{
                      borderRadius: 8,
                      overflow: "hidden",
                      border: "1px solid #ddd",
                      background: "#fafafa",
                      position: "relative",
                    }}
                  >
                    <img
                      src={photo.photo_data}
                      alt={photo.caption ?? "Dive photo"}
                      onClick={() => setLightbox(photo)}
                      style={{
                        width: "100%",
                        maxWidth: 200,
                        height: 130,
                        objectFit: "cover",
                        display: "block",
                        cursor: "pointer",
                      }}
                    />
                    {(photo.user_id === currentUserId || isAdmin === 1) && (
                      <button
                        onClick={() => handleDelete(photo)}
                        title="Delete photo"
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          background: "rgba(0,0,0,0.55)",
                          color: "white",
                          border: "none",
                          borderRadius: "50%",
                          width: 24,
                          height: 24,
                          fontSize: 14,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    )}
                    {photo.caption && (
                      <div
                        style={{
                          padding: "6px 8px",
                          fontSize: 12,
                          color: "#555",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {photo.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox overlay */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.88)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 500,
            padding: 20,
          }}
        >
          <img
            src={lightbox.photo_data}
            alt={lightbox.caption ?? "Dive photo"}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90vw",
              maxHeight: "80vh",
              objectFit: "contain",
              borderRadius: 8,
              boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
            }}
          />
          {lightbox.caption && (
            <div
              style={{
                marginTop: 14,
                color: "rgba(255,255,255,0.9)",
                fontSize: 15,
                textAlign: "center",
              }}
            >
              {lightbox.caption}
            </div>
          )}
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: "fixed",
              top: 16,
              right: 20,
              background: "none",
              border: "none",
              color: "white",
              fontSize: 32,
              cursor: "pointer",
              lineHeight: 1,
            }}
            aria-label="Close lightbox"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
