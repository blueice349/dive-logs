"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import { Field, Button, Card, FormGrid } from "@/components/ui/form";
import { authSchema, loginSchema } from "@/app/api/auth/data";
import Joi from "joi";

type LoginFormValues = { email: string; password: string };
type RegisterFormValues = LoginFormValues & {
  firstName: string;
  lastName: string;
  phone: string;
  confirmPassword: string;
};

const registerSchema = authSchema.keys({
  confirmPassword: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({ "any.only": "Passwords must match" }),
});

const backdrop = {
  minHeight: "100vh",
  backgroundImage:
    "url(https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1400&auto=format&fit=crop)",
  backgroundSize: "cover",
  backgroundPosition: "center",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
} as const;

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const form = useForm<LoginFormValues>({
    defaultValues: { email: "", password: "" },
    mode: "onChange",
    resolver: joiResolver(loginSchema),
  });

  const handleSubmit = form.handleSubmit(async (data: LoginFormValues) => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      router.push("/dive-log");
    } else {
      const { error } = await res.json().catch(() => ({ error: "Unknown error" }));
      alert(error ?? "Authentication failed.");
    }
  });

  return (
    <div style={backdrop}>
      <Card>
        <h2 style={{ textAlign: "center", fontSize: 24, marginTop: 0, color: "#1976d2" }}>
          Login
        </h2>
        <FormProvider {...form}>
          <FormGrid cols={1}>
            <Field<LoginFormValues> name="email" label="Email" placeholder="Email" rules={{ required: true }} />
            <Field<LoginFormValues> name="password" label="Password" type="password" placeholder="Password" rules={{ required: true }} />
          </FormGrid>
        </FormProvider>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <Button variant="success" onClick={handleSubmit} disabled={!form.formState.isValid}>
            Login
          </Button>
          <Button variant="secondary" onClick={onSwitch}>
            Switch to Register
          </Button>
        </div>
      </Card>
    </div>
  );
}

function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const form = useForm<RegisterFormValues>({
    defaultValues: { email: "", password: "", firstName: "", lastName: "", phone: "", confirmPassword: "" },
    mode: "onChange",
    resolver: joiResolver(registerSchema),
  });

  const handleSubmit = form.handleSubmit(async (data: RegisterFormValues) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword, ...payload } = data;
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      router.push("/dive-log");
    } else {
      const { error } = await res.json().catch(() => ({ error: "Unknown error" }));
      alert(error ?? "Authentication failed.");
    }
  });

  return (
    <div style={backdrop}>
      <Card>
        <h2 style={{ textAlign: "center", fontSize: 24, marginTop: 0, color: "#1976d2" }}>
          Register
        </h2>
        <FormProvider {...form}>
          <FormGrid cols={1}>
            <FormGrid cols={2}>
              <Field<RegisterFormValues> name="firstName" label="First Name" placeholder="First Name" rules={{ required: true }} />
              <Field<RegisterFormValues> name="lastName" label="Last Name" placeholder="Last Name" rules={{ required: true }} />
            </FormGrid>
            <Field<RegisterFormValues> name="phone" label="Phone Number" placeholder="e.g. 555-867-5309" type="tel" rules={{ required: true }} />
            <Field<RegisterFormValues> name="email" label="Email" placeholder="Email" rules={{ required: true }} />
            <Field<RegisterFormValues> name="password" label="Password" type="password" placeholder="Password" rules={{ required: true }} />
            <Field<RegisterFormValues> name="confirmPassword" label="Confirm Password" type="password" placeholder="Confirm Password" rules={{ required: true }} />
          </FormGrid>
        </FormProvider>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <Button variant="success" onClick={handleSubmit} disabled={!form.formState.isValid}>
            Register
          </Button>
          <Button variant="secondary" onClick={onSwitch}>
            Switch to Login
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function AuthForm() {
  const [isRegistering, setIsRegistering] = useState(false);
  const onSwitch = () => setIsRegistering((prev) => !prev);

  return isRegistering ? (
    <RegisterForm key="register" onSwitch={onSwitch} />
  ) : (
    <LoginForm key="login" onSwitch={onSwitch} />
  );
}
