"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { type PublicUser } from "@/app/types/user";

const NAV_LINKS = [
  { label: "Dive Log", href: "/dive-log" },
  { label: "Stats", href: "/stats" },
  { label: "Map", href: "/map" },
  { label: "Marine Life", href: "/marine-life" },
  { label: "Profile", href: "/user-profile" },
];

export default function AppHeader({ user }: { user: PublicUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const [impersonating, setImpersonating] = useState<{ adminName: string } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/admin/impersonating")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.impersonating) setImpersonating({ adminName: data.adminName }); });
  }, []);

  const handleStopImpersonating = async () => {
    await fetch("/api/admin/unimpersonate", { method: "POST" });
    router.push("/admin");
    router.refresh();
  };

  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch("/api/session").catch(() => null);
      if (res?.status === 401) router.push("/login");
    }, 60_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <>
    {impersonating && (
      <div style={{ background: "#e65100", color: "white", textAlign: "center", padding: "8px 16px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, position: "sticky", top: 0, zIndex: 101 }}>
        <span>👁 Viewing as <strong>{user.firstName} {user.lastName}</strong> — logged in as {impersonating.adminName}</span>
        <button onClick={handleStopImpersonating} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.5)", borderRadius: 6, color: "white", fontSize: 13, padding: "3px 12px", cursor: "pointer" }}>
          Return to Admin
        </button>
      </div>
    )}
    <header
      style={{
        background: "linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "0 20px",
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* Logo */}
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "white",
            letterSpacing: "-0.5px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          onClick={() => router.push("/dive-log")}
        >
          🤿 Dive Log
        </span>

        {/* Nav links */}
        <nav className="header-nav" style={{ display: "flex", gap: 4, flex: 1 }}>
          {[...NAV_LINKS, ...(user.isAdmin ? [{ label: "Admin", href: "/admin" }] : [])].map(({ label, href }) => {
            const active = pathname === href;
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                style={{
                  background: active ? "rgba(255,255,255,0.2)" : "transparent",
                  border: "none",
                  borderRadius: 6,
                  color: "white",
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  padding: "6px 14px",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                {label}
              </button>
            );
          })}
        </nav>

        {/* User + logout */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="header-greeting" style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
            Hi, {user.firstName}
          </span>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 6,
              color: "white",
              fontSize: 14,
              padding: "5px 14px",
              cursor: loggingOut ? "default" : "pointer",
              opacity: loggingOut ? 0.7 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {loggingOut && (
              <span style={{
                display: "inline-block",
                width: 12,
                height: 12,
                border: "2px solid rgba(255,255,255,0.4)",
                borderTopColor: "#fff",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }} />
            )}
            Logout
          </button>
        </div>
      </div>
    </header>
    </>
  );
}
