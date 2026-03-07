"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import { Field, Button, Card, FormGrid } from "@/components/ui/form";
import { authSchema, loginSchema, type User } from "@/app/api/auth/data";
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

function AuthFormInner({
  isRegistering,
  onSwitch,
  onAuthSuccess,
}: {
  isRegistering: boolean;
  onSwitch: () => void;
  onAuthSuccess: (user: User) => void;
}) {
  const form = useForm<LoginFormValues | RegisterFormValues>({
    defaultValues: isRegistering
      ? {
          email: "",
          password: "",
          firstName: "",
          lastName: "",
          phone: "",
          confirmPassword: "",
        }
      : { email: "", password: "" },
    mode: "onChange",
    resolver: joiResolver(isRegistering ? registerSchema : loginSchema),
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    const endpoint = isRegistering ? "/api/register" : "/api/login";
    const { confirmPassword, ...payload } = data as RegisterFormValues;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isRegistering ? payload : data),
    });

    if (res.ok) {
      const userData = await res.json();
      onAuthSuccess(userData);
    } else {
      const { error } = await res
        .json()
        .catch(() => ({ error: "Unknown error" }));
      alert(error ?? "Authentication failed.");
    }
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage:
          "url(https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1400&auto=format&fit=crop)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <Card>
        <h2
          style={{
            textAlign: "center",
            fontSize: 24,
            marginTop: 0,
            color: "#1976d2",
          }}
        >
          {isRegistering ? "Register" : "Login"}
        </h2>
        <FormProvider {...form}>
          <FormGrid cols={1}>
            {isRegistering && (
              <>
                <FormGrid cols={2}>
                  <Field<RegisterFormValues>
                    name="firstName"
                    label="First Name"
                    placeholder="First Name"
                    rules={{ required: true }}
                  />
                  <Field<RegisterFormValues>
                    name="lastName"
                    label="Last Name"
                    placeholder="Last Name"
                    rules={{ required: true }}
                  />
                </FormGrid>
                <Field<RegisterFormValues>
                  name="phone"
                  label="Phone Number"
                  placeholder="e.g. 555-867-5309"
                  type="tel"
                  rules={{ required: true }}
                />
              </>
            )}
            <Field<LoginFormValues>
              name="email"
              label="Email"
              placeholder="Email"
              rules={{ required: true }}
            />
            <Field<LoginFormValues>
              name="password"
              label="Password"
              type="password"
              placeholder="Password"
              rules={{ required: true }}
            />
            {isRegistering && (
              <Field<RegisterFormValues>
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                placeholder="Confirm Password"
                rules={{ required: true }}
              />
            )}
          </FormGrid>
        </FormProvider>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <Button
            variant="success"
            onClick={handleSubmit}
            disabled={!form.formState.isValid}
          >
            {isRegistering ? "Register" : "Login"}
          </Button>
          <Button variant="secondary" onClick={onSwitch}>
            {isRegistering ? "Switch to Login" : "Switch to Register"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function AuthForm({
  onAuthSuccess,
}: {
  onAuthSuccess: () => void;
}) {
  const [isRegistering, setIsRegistering] = useState(false);

  return (
    <AuthFormInner
      key={isRegistering ? "register" : "login"}
      isRegistering={isRegistering}
      onSwitch={() => setIsRegistering((prev) => !prev)}
      onAuthSuccess={onAuthSuccess}
    />
  );
}
