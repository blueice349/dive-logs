"use client";

export default function Spinner({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `${Math.max(2, size / 10)}px solid rgba(25, 118, 210, 0.2)`,
        borderTopColor: "#1976d2",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        display: "inline-block",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
