"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import { Card, Button, Field, FormGrid } from "@/components/ui/form";
import { type PublicUser } from "@/app/types/user";
import { profileSchema, type ProfileValues } from "@/app/api/users/data";
import { passwordRule } from "@/app/lib/auth";
import Joi from "joi";
import AppHeader from "./AppHeader";
import ConfirmModal from "./ConfirmModal";
import Spinner from "./Spinner";

const resetPasswordSchema = Joi.object({
  password: passwordRule.label("Password"),
  confirm: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .label("Confirm Password")
    .messages({ "any.only": "Passwords do not match" }),
});

type CreateUserValues = ProfileValues & { password: string };

const createUserSchema = profileSchema.keys({
  password: passwordRule.label("Password"),
});

// ── Cert helpers ─────────────────────────────────────────────────────────────

type Certification = {
  id: number;
  userId: number;
  certName: string;
  agency?: string;
  certDate?: string;
  certNumber?: string;
  notes?: string;
};

type CertFormValues = {
  certName: string;
  agency: string;
  certDate: string;
  certNumber: string;
  notes: string;
};

const certJoiSchema = Joi.object({
  certName: Joi.string().trim().required().label("Certification Name"),
  agency: Joi.string().trim().optional().allow("").label("Agency"),
  certDate: Joi.string().isoDate().optional().allow("", null).label("Date"),
  certNumber: Joi.string().trim().optional().allow("").label("Cert Number"),
  notes: Joi.string().trim().optional().allow("").label("Notes"),
});

function formatCertDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr.split("T")[0] + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

function CertModal({ cert, targetUserId, onSave, onClose }: {
  cert: Certification | null; targetUserId: number;
  onSave: (saved: Certification) => void; onClose: () => void;
}) {
  const isEdit = cert !== null;
  const form = useForm<CertFormValues>({
    defaultValues: {
      certName: cert?.certName ?? "", agency: cert?.agency ?? "",
      certDate: cert?.certDate ? cert.certDate.split("T")[0] : "",
      certNumber: cert?.certNumber ?? "", notes: cert?.notes ?? "",
    },
    mode: "onChange", resolver: joiResolver(certJoiSchema),
  });
  const handleSubmit = form.handleSubmit(async (data) => {
    const url = isEdit ? `/api/certifications/${cert.id}` : "/api/certifications";
    const method = isEdit ? "PUT" : "POST";
    const body = isEdit ? data : { ...data, userId: targetUserId };
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) onSave(await res.json());
    else { const { error } = await res.json().catch(() => ({ error: "Unknown error" })); alert(error ?? "Failed to save."); }
  });
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 12, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 20, color: "#1565c0" }}>{isEdit ? "Edit Certification" : "Add Certification"}</h2>
        <FormProvider {...form}>
          <FormGrid cols={2}>
            <Field<CertFormValues> name="certName" label="Certification Name" placeholder="e.g. Open Water Diver" rules={{ required: true }} />
            <Field<CertFormValues> name="agency" label="Agency" placeholder="e.g. PADI, SSI" />
            <Field<CertFormValues> name="certDate" label="Date" type="date" />
            <Field<CertFormValues> name="certNumber" label="Cert Number" placeholder="e.g. 1234567" />
          </FormGrid>
          <div style={{ marginTop: 12 }}>
            <Field<CertFormValues> name="notes" label="Notes" placeholder="Any additional notes" />
          </div>
        </FormProvider>
        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="success" onClick={handleSubmit} disabled={!form.formState.isValid}>{isEdit ? "Save Changes" : "Add Certification"}</Button>
        </div>
      </div>
    </div>
  );
}

// ── EditUserPanel ─────────────────────────────────────────────────────────────

type EditTab = "profile" | "certifications";

function EditUserPanel({ user, onSave, onClose }: {
  user: PublicUser; onSave: (updated: PublicUser) => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<EditTab>("profile");
  const [isAdmin, setIsAdmin] = useState(Boolean(user.isAdmin));

  const form = useForm<ProfileValues>({
    defaultValues: { firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone },
    mode: "onChange", resolver: joiResolver(profileSchema),
  });

  const handleSaveProfile = form.handleSubmit(async (data) => {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, isAdmin: isAdmin ? 1 : 0 }),
    });
    if (res.ok) onSave(await res.json());
    else { const { error } = await res.json().catch(() => ({ error: "Unknown error" })); alert(error ?? "Failed to update user."); }
  });

  const [certs, setCerts] = useState<Certification[]>([]);
  const [certsLoaded, setCertsLoaded] = useState(false);
  const [showAddCert, setShowAddCert] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [deletingCert, setDeletingCert] = useState<Certification | null>(null);
  const certsLoading = tab === "certifications" && !certsLoaded;

  useEffect(() => {
    if (tab !== "certifications" || certsLoaded) return;
    let cancelled = false;
    fetch(`/api/certifications?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) { setCerts(data); setCertsLoaded(true); } });
    return () => { cancelled = true; };
  }, [tab, certsLoaded, user.id]);

  const handleCertSaved = (saved: Certification) => {
    if (editingCert) { setCerts((prev) => prev.map((c) => (c.id === saved.id ? saved : c))); setEditingCert(null); }
    else { setCerts((prev) => [...prev, saved]); setShowAddCert(false); }
  };

  const handleCertDelete = async () => {
    if (!deletingCert) return;
    const res = await fetch(`/api/certifications/${deletingCert.id}`, { method: "DELETE" });
    if (res.ok) { setCerts((prev) => prev.filter((c) => c.id !== deletingCert.id)); setDeletingCert(null); }
    else alert("Failed to delete certification.");
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 200, padding: "40px 16px 16px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#f0f4f8", borderRadius: 12, width: "100%", maxWidth: 680, boxShadow: "0 8px 40px rgba(0,0,0,0.2)", minHeight: 400 }}>
        <div style={{ background: "linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)", borderRadius: "12px 12px 0 0", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "white", fontSize: 20, fontWeight: 700 }}>{user.firstName} {user.lastName}</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2 }}>{user.email}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, color: "white", fontSize: 14, padding: "5px 14px", cursor: "pointer" }}>Close</button>
        </div>

        <div style={{ display: "flex", borderBottom: "2px solid #e0e7ef", background: "white", padding: "0 24px" }}>
          {([["profile", "Profile"], ["certifications", "Certifications"]] as [EditTab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", borderBottom: tab === t ? "2px solid #1565c0" : "2px solid transparent", marginBottom: -2, padding: "12px 16px", fontSize: 15, fontWeight: tab === t ? 700 : 400, color: tab === t ? "#1565c0" : "#666", cursor: "pointer" }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {tab === "profile" && (
            <Card>
              <h3 style={{ margin: "0 0 16px", fontSize: 17, color: "#1976d2" }}>Personal Info</h3>
              <FormProvider {...form}>
                <FormGrid cols={2}>
                  <Field<ProfileValues> name="firstName" label="First Name" placeholder="First Name" rules={{ required: true }} />
                  <Field<ProfileValues> name="lastName" label="Last Name" placeholder="Last Name" rules={{ required: true }} />
                  <Field<ProfileValues> name="email" label="Email" placeholder="Email" rules={{ required: true }} />
                  <Field<ProfileValues> name="phone" label="Phone" placeholder="Phone" type="tel" rules={{ required: true }} />
                </FormGrid>
              </FormProvider>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 14, cursor: "pointer", color: "#222" }}>
                <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} /> Admin
              </label>
              <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="success" onClick={handleSaveProfile} disabled={!form.formState.isValid || (!form.formState.isDirty && Boolean(user.isAdmin) === isAdmin)}>Save Changes</Button>
              </div>
            </Card>
          )}

          {tab === "certifications" && (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <Button onClick={() => setShowAddCert(true)}>+ Add Certification</Button>
              </div>
              {certsLoading && <Spinner />}
              {!certsLoading && certs.length === 0 && (
                <Card><p style={{ margin: 0, color: "#888", textAlign: "center", padding: "20px 0" }}>No certifications yet.</p></Card>
              )}
              {!certsLoading && certs.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {certs.map((cert) => (
                    <li key={cert.id}>
                      <Card>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ margin: "0 0 6px", color: "#1565c0", fontWeight: 700, fontSize: 16 }}>{cert.certName}</h3>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 13, color: "#555" }}>
                              {cert.agency && <span><strong>Agency:</strong> {cert.agency}</span>}
                              {cert.certDate && <span><strong>Date:</strong> {formatCertDate(cert.certDate)}</span>}
                              {cert.certNumber && <span><strong>Cert #:</strong> {cert.certNumber}</span>}
                            </div>
                            {cert.notes && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#666", fontStyle: "italic" }}>{cert.notes}</p>}
                          </div>
                          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                            <Button size="sm" onClick={() => setEditingCert(cert)}>Edit</Button>
                            <Button size="sm" variant="danger" onClick={() => setDeletingCert(cert)}>Delete</Button>
                          </div>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      {showAddCert && <CertModal cert={null} targetUserId={user.id} onSave={handleCertSaved} onClose={() => setShowAddCert(false)} />}
      {editingCert && <CertModal cert={editingCert} targetUserId={user.id} onSave={handleCertSaved} onClose={() => setEditingCert(null)} />}
      {deletingCert && (
        <ConfirmModal title="Delete Certification" message={`Delete "${deletingCert.certName}"? This cannot be undone.`} onConfirm={handleCertDelete} onClose={() => setDeletingCert(null)} />
      )}
    </div>
  );
}

// ── Reset Password Modal ──────────────────────────────────────────────────────

function ResetPasswordModal({ user, onClose }: { user: PublicUser; onClose: () => void }) {
  const form = useForm<{ password: string; confirm: string }>({
    defaultValues: { password: "", confirm: "" },
    mode: "onChange",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: joiResolver(resetPasswordSchema) as any,
  });
  const [saved, setSaved] = useState(false);

  const handleSubmit = form.handleSubmit(async (data) => {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resetPassword", password: data.password }),
    });
    if (res.ok) setSaved(true);
    else { const { error } = await res.json().catch(() => ({ error: "Failed" })); alert(error ?? "Failed to reset password."); }
  });

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 12, padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 20, color: "#1565c0" }}>Reset Password</h2>
        <p style={{ margin: "0 0 20px", color: "#555", fontSize: 14 }}>Set a new password for <strong>{user.firstName} {user.lastName}</strong>.</p>
        {saved ? (
          <>
            <p style={{ color: "#2e7d32", fontWeight: 600, margin: "0 0 20px" }}>Password reset successfully.</p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}><Button onClick={onClose}>Close</Button></div>
          </>
        ) : (
          <FormProvider {...form}>
            <FormGrid cols={1}>
              <Field<{ password: string; confirm: string }> name="password" label="New Password" type="password" placeholder="Min 6 chars, 1 uppercase, 1 special" />
              <Field<{ password: string; confirm: string }> name="confirm" label="Confirm Password" type="password" placeholder="Repeat new password" />
            </FormGrid>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="success" onClick={handleSubmit} disabled={!form.formState.isValid}>{form.formState.isSubmitting ? "Saving…" : "Reset Password"}</Button>
            </div>
          </FormProvider>
        )}
      </div>
    </div>
  );
}

// ── Actions dropdown ──────────────────────────────────────────────────────────

function ActionsMenu({ user, currentUser, open, onToggle, onEdit, onResetPW, onImpersonate, onSuspend, onDelete }: {
  user: PublicUser; currentUser: PublicUser; open: boolean; onToggle: () => void;
  onEdit: () => void; onResetPW: () => void; onImpersonate: () => void; onSuspend: () => void; onDelete: () => void;
}) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        style={{ background: "#e3eaf4", border: "1px solid #c5d0de", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#1565c0", display: "flex", alignItems: "center", gap: 4 }}
      >
        Actions <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "white", border: "1px solid #dde3ec", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 160, overflow: "hidden" }}>
          {(
            [
              { label: "Edit", action: onEdit, color: "#1565c0" },
              { label: "Reset Password", action: onResetPW, color: "#333" },
              ...(user.id !== currentUser.id ? [
                { label: "View As", action: onImpersonate, color: "#333", disabled: user.isActive === 0 },
                { label: user.isActive === 0 ? "Unsuspend" : "Suspend", action: onSuspend, color: user.isActive === 0 ? "#2e7d32" : "#e65100" },
              ] : []),
              { label: "Delete", action: onDelete, color: "#c62828" },
            ] as { label: string; action: () => void; color: string; disabled?: boolean }[]
          ).map(({ label, action, color, disabled }) => (
            <button
              key={label}
              disabled={disabled}
              onClick={(e) => { e.stopPropagation(); action(); onToggle(); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 16px", background: "none", border: "none", fontSize: 14, color: disabled ? "#aaa" : color, cursor: disabled ? "not-allowed" : "pointer", borderBottom: label === "Reset Password" ? "1px solid #f0f0f0" : "none" }}
              onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = "#f0f4f8"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type SortField = "name" | "email" | "isAdmin";
type SortDir = "asc" | "desc";

export default function AdminPage({ currentUser }: { currentUser: PublicUser }) {
  const router = useRouter();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<PublicUser | null>(null);
  const [suspendingUser, setSuspendingUser] = useState<PublicUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<PublicUser | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => {
    if (openMenuId === null) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenuId]);

  const handleSort = (field: SortField) => {
    if (field === sortField) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const visibleUsers = users
    .filter((u) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      else if (sortField === "email") cmp = a.email.localeCompare(b.email);
      else if (sortField === "isAdmin") cmp = (b.isAdmin ?? 0) - (a.isAdmin ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });

  useEffect(() => {
    fetch("/api/admin/users").then((r) => r.json()).then((data) => { setUsers(data); setLoading(false); });
  }, []);

  const handleDelete = async () => {
    if (!deletingUser) return;
    const res = await fetch(`/api/admin/users/${deletingUser.id}`, { method: "DELETE" });
    if (res.ok) { setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id)); setDeletingUser(null); }
    else alert("Failed to delete user.");
  };

  const handleSaved = (updated: PublicUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setEditingUser(null);
  };

  const handleCreated = (user: PublicUser) => { setUsers((prev) => [...prev, user]); setShowCreate(false); };

  const handleSuspend = async () => {
    if (!suspendingUser) return;
    const isSuspended = suspendingUser.isActive === 0;
    const res = await fetch(`/api/admin/users/${suspendingUser.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: isSuspended ? "unsuspend" : "suspend" }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === suspendingUser.id ? { ...u, isActive: isSuspended ? 1 : 0 } : u));
      setSuspendingUser(null);
    } else { const { error } = await res.json().catch(() => ({ error: "Failed" })); alert(error ?? "Failed to update account status."); }
  };

  const handleImpersonate = async (user: PublicUser) => {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "impersonate" }),
    });
    if (res.ok) router.push("/dive-log");
    else { const { error } = await res.json().catch(() => ({ error: "Failed" })); alert(error ?? "Failed to impersonate user."); }
  };

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f0f4f8" }}>
      <AppHeader user={currentUser} />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>All Users</h1>
          <Button onClick={() => setShowCreate(true)}>➕ Create User</Button>
        </div>

        <div style={{ position: "relative", marginBottom: 16 }}>
          <input
            type="text" placeholder="Search by name, email, or phone…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 36px 10px 14px", borderRadius: 8, border: "1px solid #ccc", fontSize: 15, boxSizing: "border-box", background: "white", color: "#222" }}
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#999" }}>✕</button>
          )}
        </div>

        {loading && <Spinner />}
        <Card style={{ display: loading ? "none" : undefined }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e0e0e0", textAlign: "left" }}>
                <th style={thSortable} onClick={() => handleSort("name")}>Name {sortField === "name" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</th>
                <th style={thSortable} onClick={() => handleSort("email")}>Email {sortField === "email" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</th>
                <th style={th}>Phone</th>
                <th style={thSortable} onClick={() => handleSort("isAdmin")}>Admin {sortField === "isAdmin" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid #f0f0f0", background: user.id === currentUser.id ? "#f0f7ff" : "white" }}>
                  <td style={td}>{user.firstName} {user.lastName}</td>
                  <td style={td}>{user.email}</td>
                  <td style={td}>{user.phone}</td>
                  <td style={td}>{user.isAdmin ? "✓" : ""}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <ActionsMenu
                      user={user} currentUser={currentUser}
                      open={openMenuId === user.id}
                      onToggle={() => setOpenMenuId((prev) => (prev === user.id ? null : user.id))}
                      onEdit={() => { setEditingUser(user); setOpenMenuId(null); }}
                      onResetPW={() => { setResetPasswordUser(user); setOpenMenuId(null); }}
                      onImpersonate={() => { handleImpersonate(user); setOpenMenuId(null); }}
                      onSuspend={() => { setSuspendingUser(user); setOpenMenuId(null); }}
                      onDelete={() => { setDeletingUser(user); setOpenMenuId(null); }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {showCreate && <CreateUserModal onSave={handleCreated} onClose={() => setShowCreate(false)} />}
      {editingUser && <EditUserPanel user={editingUser} onSave={handleSaved} onClose={() => setEditingUser(null)} />}
      {deletingUser && (
        <ConfirmModal title="Delete User" message={`Are you sure you want to delete ${deletingUser.firstName} ${deletingUser.lastName}? This cannot be undone.`} onConfirm={handleDelete} onClose={() => setDeletingUser(null)} />
      )}
      {suspendingUser && (
        <ConfirmModal
          title={suspendingUser.isActive === 0 ? "Unsuspend Account" : "Suspend Account"}
          message={suspendingUser.isActive === 0
            ? `Restore access for ${suspendingUser.firstName} ${suspendingUser.lastName}?`
            : `Suspend ${suspendingUser.firstName} ${suspendingUser.lastName}? They will be unable to log in until unsuspended.`}
          confirmLabel={suspendingUser.isActive === 0 ? "Unsuspend" : "Suspend"}
          onConfirm={handleSuspend}
          onClose={() => setSuspendingUser(null)}
        />
      )}
      {resetPasswordUser && <ResetPasswordModal user={resetPasswordUser} onClose={() => setResetPasswordUser(null)} />}
    </main>
  );
}

const th: React.CSSProperties = { padding: "10px 12px", fontWeight: 600, color: "#1976d2" };
const thSortable: React.CSSProperties = { ...th, cursor: "pointer", userSelect: "none" };
const td: React.CSSProperties = { padding: "10px 12px", color: "#222" };
