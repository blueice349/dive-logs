export default function Spinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          border: "4px solid #dce6f0",
          borderTopColor: "#1565c0",
          borderRadius: "50%",
          animation: "spin 0.75s linear infinite",
        }}
      />
      <span style={{ color: "#888", fontSize: 14 }}>{message}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
