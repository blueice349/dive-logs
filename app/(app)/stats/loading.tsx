import Spinner from "@/app/components/Spinner";

export default function Loading() {
  return (
    <main style={{ background: "#f0f4f8", minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spinner size={48} />
    </main>
  );
}
