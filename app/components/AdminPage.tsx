"use client";

import { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import { Card, Button, Field, FormGrid } from "@/components/ui/form";
import { type PublicUser } from "@/app/types/user";
import { profileSchema, type ProfileValues } from "@/app/api/users/data";
import Joi from "joi";

type CreateUserValues = ProfileValues & { password: string };

const createUserSchema = profileSchema.keys({
  password: Joi.string().min(4).required().label("Password"),
});
import AppHeader from "./AppHeader";

function CreateUserModal({
  onSave,
  onClose,
}: {
  onSave: (user: PublicUser) => void;
  onClose: () => void;
}) {
  const [isAdmin, setIsAdmin] = useState(false);

  const form = useForm<CreateUserValues>({
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", password: "" },
    mode: "onChange",
    resolver: joiResolver(createUserSchema),
  });

  const handleSubmit = form.handleSubmit(async (data: CreateUserValues) => {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, isAdmin: isAdmin ? 1 : 0 }),
    });
    if (res.ok) onSave(await res.json());
    else {
      const { error } = await res.json().catch(() => ({ error: "Unknown error" }));
      alert(error ?? "Failed to create user.");
    }
  });

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "white", borderRadius: 12, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
      >
        <h2 style={{ margin: "0 0 20px", fontSize: 20, color: "#1565c0" }}>Create User</h2>
        <FormProvider {...form}>
          <FormGrid cols={2}>
            <Field<CreateUserValues> name="firstName" label="First Name" placeholder="First Name" rules={{ required: true }} />
            <Field<CreateUserValues> name="lastName" label="Last Name" placeholder="Last Name" rules={{ required: true }} />
            <Field<CreateUserValues> name="email" label="Email" placeholder="Email" rules={{ required: true }} />
            <Field<CreateUserValues> name="phone" label="Phone" placeholder="Phone" type="tel" rules={{ required: true }} />
          </FormGrid>
          <div style={{ marginTop: 12 }}>
            <Field<CreateUserValues> name="password" label="Password" type="password" placeholder="Password" rules={{ required: true }} />
          </div>
        </FormProvider>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 14, cursor: "pointer", color: "#222" }}>
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
          Admin
        </label>
        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="success" onClick={handleSubmit} disabled={!form.formState.isValid}>Create User</Button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({
  user,
  onSave,
  onClose,
}: {
  user: PublicUser;
  onSave: (updated: PublicUser) => void;
  onClose: () => void;
}) {
  const [isAdmin, setIsAdmin] = useState(Boolean(user.isAdmin));

  const form = useForm<ProfileValues>({
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
    },
    mode: "onChange",
    resolver: joiResolver(profileSchema),
  });

  const handleSubmit = form.handleSubmit(async (data: ProfileValues) => {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, isAdmin: isAdmin ? 1 : 0 }),
    });
    if (res.ok) onSave(await res.json());
    else {
      const { error } = await res.json().catch(() => ({ error: "Unknown error" }));
      alert(error ?? "Failed to update user.");
    }
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 12,
          padding: 28,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
      >
        <h2 style={{ margin: "0 0 20px", fontSize: 20, color: "#1565c0" }}>
          Edit User #{user.id}
        </h2>
        <FormProvider {...form}>
          <FormGrid cols={2}>
            <Field<ProfileValues> name="firstName" label="First Name" placeholder="First Name" rules={{ required: true }} />
            <Field<ProfileValues> name="lastName" label="Last Name" placeholder="Last Name" rules={{ required: true }} />
            <Field<ProfileValues> name="email" label="Email" placeholder="Email" rules={{ required: true }} />
            <Field<ProfileValues> name="phone" label="Phone" placeholder="Phone" type="tel" rules={{ required: true }} />
          </FormGrid>
        </FormProvider>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 14, cursor: "pointer", color: "#222" }}>
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
          />
          Admin
        </label>

        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="success" onClick={handleSubmit} disabled={!form.formState.isValid}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage({ currentUser }: { currentUser: PublicUser }) {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then(setUsers);
  }, []);

  const handleDelete = async (user: PublicUser) => {
    if (!window.confirm(`Delete ${user.firstName} ${user.lastName}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== user.id));
    else alert("Failed to delete user.");
  };

  const handleSaved = (updated: PublicUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setEditingUser(null);
  };

  const handleCreated = (user: PublicUser) => {
    setUsers((prev) => [...prev, user]);
    setShowCreate(false);
  };

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f0f4f8" }}>
      <AppHeader user={currentUser as PublicUser & { password: string }} />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>All Users</h1>
          <Button onClick={() => setShowCreate(true)}>➕ Create User</Button>
        </div>

        <Card>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e0e0e0", textAlign: "left" }}>
                <th style={th}>ID</th>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Phone</th>
                <th style={th}>Admin</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  style={{
                    borderBottom: "1px solid #f0f0f0",
                    background: user.id === currentUser.id ? "#f0f7ff" : "white",
                  }}
                >
                  <td style={td}>{user.id}</td>
                  <td style={td}>{user.firstName} {user.lastName}</td>
                  <td style={td}>{user.email}</td>
                  <td style={td}>{user.phone}</td>
                  <td style={td}>{user.isAdmin ? "✓" : ""}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button size="sm" onClick={() => setEditingUser(user)}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(user)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {showCreate && (
        <CreateUserModal onSave={handleCreated} onClose={() => setShowCreate(false)} />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onSave={handleSaved}
          onClose={() => setEditingUser(null)}
        />
      )}
    </main>
  );
}

const th: React.CSSProperties = { padding: "10px 12px", fontWeight: 600, color: "#555" };
const td: React.CSSProperties = { padding: "10px 12px", color: "#222" };
