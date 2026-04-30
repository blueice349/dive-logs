"use client";

export default function Spinner({ size = 32, inline = false }: { size?: number; inline?: boolean }) {
  const wheel = (
    <div
      className="animate-spin"
      style={{
        width: size,
        height: size,
        border: `3px solid #e0e0e0`,
        borderTop: `3px solid #1565c0`,
        borderRadius: "50%",
      }}
    />
  );

  if (inline) return wheel;

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 40 }}>
      {wheel}
    </div>
  );
}
