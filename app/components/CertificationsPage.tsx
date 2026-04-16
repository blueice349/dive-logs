"use client";

import { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import Joi from "joi";
import { Card, Button, Field, FormGrid } from "@/components/ui/form";
import { type PublicUser } from "@/app/types/user";
import AppHeader from "./AppHeader";
import ConfirmModal from "./ConfirmModal";
import Spinner from "./Spinner";

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

const certSchema = Joi.object({
  certName: Joi.string().trim().required().label("Certification Name"),
  agency: Joi.string().trim().optional().allow("").label("Agency"),
  certDate: Joi.string().isoDate().optional().allow("", null).label("Date"),
  certNumber: Joi.string().trim().optional().allow("").label("Cert Number"),
  notes: Joi.string().trim().optional().allow("").label("Notes"),
});

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const datePart = dateStr.split("T")[0]; // strip time if present
  const d = new Date(datePart + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function CertModal({
  cert,
  targetUserId,
  onSave,
  onClose,
}: {
  cert: Certification | null;
  targetUserId?: number;
  onSave: (saved: Certification) => void;
  onClose: () => void;
}) {
  const isEdit = cert !== null;

  const form = useForm<CertFormValues>({
    defaultValues: {
      certName: cert?.certName ?? "",
      agency: cert?.agency ?? "",
      certDate: cert?.certDate ? cert.certDate.split("T")[0] : "",
      certNumber: cert?.certNumber ?? "",
      notes: cert?.notes ?? "",
    },
    mode: "onChange",
    resolver: joiResolver(certSchema),
  });

  const handleSubmit = form.handleSubmit(async (data: CertFormValues) => {
    const url = isEdit ? `/api/certifications/${cert.id}` : "/api/certifications";
    const method = isEdit ? "PUT" : "POST";
    const body = isEdit ? data : { ...data, userId: targetUserId };
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      onSave(await res.json());
    } else {
      const { error } = await res.json().catch(() => ({ error: "Unknown error" }));
      alert(error ?? "Failed to save certification.");
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
          {isEdit ? "Edit Certification" : "Add Certification"}
        </h2>
        <FormProvider {...form}>
          <FormGrid cols={2}>
            <Field<CertFormValues>
              name="certName"
              label="Certification Name"
              placeholder="e.g. Open Water Diver"
              rules={{ required: true }}
            />
            <Field<CertFormValues>
              name="agency"
              label="Agency"
              placeholder="e.g. PADI, SSI, NAUI, BSAC, SDI"
            />
            <Field<CertFormValues>
              name="certDate"
              label="Certification Date"
              type="date"
            />
            <Field<CertFormValues>
              name="certNumber"
              label="Cert Number"
              placeholder="e.g. 1234567"
            />
          </FormGrid>
          <div style={{ marginTop: 12 }}>
            <Field<CertFormValues>
              name="notes"
              label="Notes"
              placeholder="Any additional notes"
            />
          </div>
        </FormProvider>
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 24,
            justifyContent: "flex-end",
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleSubmit}
            disabled={!form.formState.isValid}
          >
            {isEdit ? "Save Changes" : "Add Certification"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CertificationsPage({ user }: { user: PublicUser }) {
  const [certs, setCerts] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [deletingCert, setDeletingCert] = useState<Certification | null>(null);
  const [allUsers, setAllUsers] = useState<{ id: number; firstName: string; lastName: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number>(user.id);

  useEffect(() => {
    if (!user.isAdmin) return;
    fetch("/api/users/public")
      .then((r) => r.ok ? r.json() : [])
      .then(setAllUsers);
  }, [user.isAdmin]);

  useEffect(() => {
    const url = selectedUserId !== user.id
      ? `/api/certifications?userId=${selectedUserId}`
      : "/api/certifications";
    fetch(url)
      .then((r) => r.json())
      .then((data) => { setCerts(data); setLoading(false); });
  }, [selectedUserId, user.id]);

  const selectedUser = allUsers.find((u) => u.id === selectedUserId);
  const selectedUserName = selectedUserId === user.id
    ? "My"
    : selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}'s` : "Loading...";

  const handleSaved = (saved: Certification) => {
    if (editingCert) {
      setCerts((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      setEditingCert(null);
    } else {
      setCerts((prev) => [...prev, saved]);
      setShowAdd(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCert) return;
    const res = await fetch(`/api/certifications/${deletingCert.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setCerts((prev) => prev.filter((c) => c.id !== deletingCert.id));
      setDeletingCert(null);
    } else {
      alert("Failed to delete certification.");
    }
  };

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        minHeight: "100vh",
        background: "#f0f4f8",
      }}
    >
      <AppHeader user={user} />

      <div style={{ maxWidth: 700, margin: "0 auto", padding: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: 28 }}>{selectedUserName} Certifications</h1>
            {user.isAdmin && allUsers.length > 0 && (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(Number(e.target.value))}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  fontSize: 14,
                  color: "#222",
                }}
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}{u.id === user.id ? " (me)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          <Button onClick={() => setShowAdd(true)}>+ Add Certification</Button>
        </div>

        {loading ? <Spinner /> : certs.length === 0 ? (
          <Card>
            <p style={{ margin: 0, color: "#888", textAlign: "center", padding: "20px 0" }}>
              No certifications yet. Add your first one!
            </p>
          </Card>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {certs.map((cert) => (
              <li key={cert.id}>
                <Card>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        style={{
                          margin: "0 0 6px",
                          color: "#1565c0",
                          fontWeight: 700,
                          fontSize: 17,
                        }}
                      >
                        {cert.certName}
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "4px 16px",
                          fontSize: 14,
                          color: "#555",
                        }}
                      >
                        {cert.agency && (
                          <span>
                            <strong style={{ color: "#444" }}>Agency:</strong>{" "}
                            {cert.agency}
                          </span>
                        )}
                        {cert.certDate && (
                          <span>
                            <strong style={{ color: "#444" }}>Date:</strong>{" "}
                            {formatDate(cert.certDate)}
                          </span>
                        )}
                        {cert.certNumber && (
                          <span>
                            <strong style={{ color: "#444" }}>Cert #:</strong>{" "}
                            {cert.certNumber}
                          </span>
                        )}
                      </div>
                      {cert.notes && (
                        <p
                          style={{
                            margin: "8px 0 0",
                            fontSize: 13,
                            color: "#666",
                            fontStyle: "italic",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {cert.notes}
                        </p>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <Button size="sm" onClick={() => setEditingCert(cert)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setDeletingCert(cert)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showAdd && (
        <CertModal
          cert={null}
          targetUserId={selectedUserId}
          onSave={handleSaved}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editingCert && (
        <CertModal
          cert={editingCert}
          onSave={handleSaved}
          onClose={() => setEditingCert(null)}
        />
      )}

      {deletingCert && (
        <ConfirmModal
          title="Delete Certification"
          message={`Are you sure you want to delete "${deletingCert.certName}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onClose={() => setDeletingCert(null)}
        />
      )}
    </main>
  );
}
