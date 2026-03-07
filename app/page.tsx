"use client";

import { useState } from "react";
import AuthForm from "@/app/components/AuthForm";
import DiveLogPage from "@/app/components/DiveLogPage";
import { type User } from "@/app/api/auth/data";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  return (
    <main
      style={{
        maxWidth: 700,
        margin: "40px auto",
        padding: 20,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {user ? (
        <DiveLogPage
          user={user}
          onLogout={() => setUser(null)}
          onUpdateUser={(u) => setUser(u)}
        />
      ) : (
        <AuthForm onAuthSuccess={(loggedInUser) => setUser(loggedInUser)} />
      )}
    </main>
  );
}
