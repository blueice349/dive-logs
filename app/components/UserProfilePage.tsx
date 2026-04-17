"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "./AppHeader";
import ConfirmModal from "./ConfirmModal";
import { useForm, FormProvider } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import { Field, Card, Button, FormGrid } from "@/components/ui/form";
import { type PublicUser } from "@/app/types/user";
import { profileSchema, passwordSchema, type ProfileValues, type PasswordValues } from "@/app/api/users/data";
import Joi from "joi";
import CertsTab from "./CertsTab";
import { GearTab } from "./GearPage";

type ProfileFormValues = ProfileValues;
type PasswordFormValues = PasswordValues & { confirmPassword: string };

const passwordFormSchema = passwordSchema.keys({
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({ "any.only": "Passwords must match" }),
});

function ProfileForm({ user }: { user: PublicUser }) {
  const router = useRouter();
  const form = useForm<ProfileFormValues>({
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
    },
    mode: "onChange",
    resolver: joiResolver(profileSchema),
  });

  const handleSave = form.handleSubmit(async (data) => {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      router.refresh();
      alert("Profile updated successfully!");
    } else {
      const { error } = await res
        .json()
        .catch(() => ({ error: "Unknown error" }));
      alert(error ?? "Failed to update profile.");
    }
  });

  return (
    <Card>
      <h2 style={{ marginTop: 0, fontSize: 20, color: "#1976d2" }}>
        Personal Info
      </h2>
      <FormProvider {...form}>
        <FormGrid cols={2}>
          <Field<ProfileFormValues>
            name="firstName"
            label="First Name"
            placeholder="First Name"
            rules={{ required: true }}
          />
          <Field<ProfileFormValues>
            name="lastName"
            label="Last Name"
            placeholder="Last Name"
            rules={{ required: true }}
          />
          <Field<ProfileFormValues>
            name="email"
            label="Email"
            placeholder="Email"
            rules={{ required: true }}
          />
          <Field<ProfileFormValues>
            name="phone"
            label="Phone Number"
            placeholder="Phone Number"
            type="tel"
            rules={{ required: true }}
          />
        </FormGrid>
      </FormProvider>
      <div style={{ marginTop: 16 }}>
        <Button
          variant="success"
          onClick={handleSave}
          disabled={!form.formState.isValid}
        >
          Save Changes
        </Button>
      </div>
    </Card>
  );
}

function PasswordForm({ user }: { user: PublicUser }) {
  const form = useForm<PasswordFormValues>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
    resolver: joiResolver(passwordFormSchema),
  });

  const handleSave = form.handleSubmit(async (data) => {
    const res = await fetch(`/api/users/${user.id}/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    });
    if (res.ok) {
      alert("Password updated successfully!");
      form.reset();
    } else {
      const { error } = await res
        .json()
        .catch(() => ({ error: "Unknown error" }));
      alert(error ?? "Failed to update password.");
    }
  });

  return (
    <Card>
      <h2 style={{ marginTop: 0, fontSize: 20, color: "#1976d2" }}>
        Change Password
      </h2>
      <FormProvider {...form}>
        <FormGrid cols={1}>
          <Field<PasswordFormValues>
            name="currentPassword"
            label="Current Password"
            type="password"
            placeholder="Current Password"
            rules={{ required: true }}
          />
          <Field<PasswordFormValues>
            name="newPassword"
            label="New Password"
            type="password"
            placeholder="New Password"
            rules={{ required: true }}
          />
          <Field<PasswordFormValues>
            name="confirmPassword"
            label="Confirm New Password"
            type="password"
            placeholder="Confirm New Password"
            rules={{ required: true }}
          />
        </FormGrid>
      </FormProvider>
      <div style={{ marginTop: 16 }}>
        <Button
          variant="success"
          onClick={handleSave}
          disabled={!form.formState.isValid}
        >
          Update Password
        </Button>
      </div>
    </Card>
  );
}

type Tab = "profile" | "certifications" | "gear";

export default function PublicUserProfilePage({ user }: { user: PublicUser }) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [certsLoaded, setCertsLoaded] = useState(false);
  const [gearLoaded, setGearLoaded] = useState(false);

  const handleDelete = async () => {
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    if (res.ok) {
      await fetch("/api/logout", { method: "POST" });
      router.push("/login");
    } else {
      const { error } = await res
        .json()
        .catch(() => ({ error: "Unknown error" }));
      alert(error ?? "Failed to delete account.");
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "certifications") setCertsLoaded(true);
    if (tab === "gear") setGearLoaded(true);
  };

  const tabStyle = (tab: Tab) => ({
    padding: "10px 20px",
    border: "none",
    borderBottom: activeTab === tab ? "3px solid #1565c0" : "3px solid transparent",
    background: "none",
    fontWeight: activeTab === tab ? 700 : 400,
    color: activeTab === tab ? "#1565c0" : "#555",
    cursor: "pointer",
    fontSize: 15,
    fontFamily: "inherit",
    transition: "color 0.15s",
  });

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f0f4f8" }}>
      <AppHeader user={user} />

      <div style={{ maxWidth: 700, margin: "0 auto", padding: 20 }}>
        <h1 style={{ margin: "0 0 16px", fontSize: 28 }}>My Profile</h1>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #dde3ec",
            marginBottom: 24,
          }}
        >
          <button style={tabStyle("profile")} onClick={() => handleTabChange("profile")}>
            Profile
          </button>
          <button style={tabStyle("certifications")} onClick={() => handleTabChange("certifications")}>
            Certifications
          </button>
          <button style={tabStyle("gear")} onClick={() => handleTabChange("gear")}>
            Gear
          </button>
        </div>

        {activeTab === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <ProfileForm user={user} />
            <PasswordForm user={user} />

            {/* Danger Zone */}
            <Card>
              <h2 style={{ marginTop: 0, fontSize: 20, color: "#d32f2f" }}>
                Danger Zone
              </h2>
              <p style={{ color: "#555", marginBottom: 16 }}>
                Permanently delete your account and all associated data. This action
                cannot be undone.
              </p>
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                Delete Account
              </Button>
            </Card>
          </div>
        )}

        {certsLoaded && (
          <div style={{ display: activeTab === "certifications" ? "block" : "none" }}>
            <CertsTab user={user} />
          </div>
        )}

        {gearLoaded && (
          <div style={{ display: activeTab === "gear" ? "block" : "none" }}>
            <GearTab user={user} />
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Account"
          message="Are you sure you want to delete your account? This cannot be undone."
          confirmLabel="Delete Account"
          onConfirm={handleDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </main>
  );
}
