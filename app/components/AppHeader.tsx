"use client";

import { useRouter, usePathname } from "next/navigation";
import { type User } from "@/app/types/user";

const NAV_LINKS = [
  { label: "Dive Log", href: "/dive-log" },
  { label: "Profile", href: "/user-profile" },
];

export default function AppHeader({ user }: { user: User }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  return (
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
        <nav style={{ display: "flex", gap: 4, flex: 1 }}>
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
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
            Hi, {user.firstName}
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 6,
              color: "white",
              fontSize: 14,
              padding: "5px 14px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
