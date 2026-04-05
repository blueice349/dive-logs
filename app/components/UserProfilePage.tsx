"use client";

import { useRouter } from "next/navigation";
import AppHeader from "./AppHeader";
import { useForm, FormProvider } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import { Field, Card, Button, FormGrid } from "@/components/ui/form";
import { type PublicUser } from "@/app/types/user";
import { profileSchema, passwordSchema, type ProfileValues, type PasswordValues } from "@/app/api/users/data";
import Joi from "joi";

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

export default function PublicUserProfilePage({ user }: { user: PublicUser }) {
  const router = useRouter();

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This cannot be undone."
    );
    if (!confirmed) return;

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

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f0f4f8" }}>
      <AppHeader user={user} />

      <div style={{ maxWidth: 700, margin: "0 auto", padding: 20 }}>
        <h1 style={{ margin: "0 0 24px", fontSize: 28 }}>My Profile</h1>
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
          <Button variant="danger" onClick={handleDelete}>
            Delete Account
          </Button>
        </Card>
        </div>
      </div>
    </main>
  );
}
