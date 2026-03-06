import {
  useFormContext,
  type FieldValues,
  type Path,
  type RegisterOptions,
} from "react-hook-form";
import { type CSSProperties } from "react";

interface FieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  rules?: RegisterOptions<T>;
  placeholder?: string;
  type?: string;
  style?: CSSProperties;
}

export function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} style={styles.label}>
      {children}
      {required && <span style={styles.required}> *</span>}
    </label>
  );
}

export function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return <span style={styles.error}>{message}</span>;
}

export function Field<T extends FieldValues>({
  name,
  label,
  rules,
  placeholder,
  type = "text",
  style,
}: FieldProps<T>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>();

  const error = errors[name]?.message as string | undefined;

  return (
    <div style={styles.fieldWrapper}>
      <Label htmlFor={String(name)} required={!!rules?.required}>
        {label}
      </Label>
      <input
        id={String(name)}
        type={type}
        placeholder={placeholder}
        {...register(name, rules)}
        style={{
          ...styles.input,
          ...(error ? styles.inputError : {}),
          ...style,
        }}
        aria-invalid={!!error}
        aria-describedby={error ? `${String(name)}-error` : undefined}
      />
      <ErrorMessage message={error} />
    </div>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: CSSProperties;
}) {
  return <div style={{ ...styles.card, ...style }}>{children}</div>;
}

type ButtonVariant = "primary" | "secondary" | "danger" | "success";
type ButtonSize = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = "primary",
  size = "md",
  style,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      style={{
        ...styles.buttonBase,
        ...styles.buttonVariants[variant],
        ...styles.buttonSizes[size],
        ...(props.disabled ? styles.buttonDisabled : {}),
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function FormGrid({
  children,
  cols = 2,
}: {
  children: React.ReactNode;
  cols?: 1 | 2 | 3;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 12,
        marginTop: 16,
      }}
    >
      {children}
    </div>
  );
}

const styles = {
  label: {
    fontWeight: 600,
    fontSize: 14,
    color: "#222",
  } satisfies CSSProperties,

  required: {
    color: "red",
  } satisfies CSSProperties,

  error: {
    fontSize: 12,
    color: "#e57373",
    marginTop: 2,
  } satisfies CSSProperties,

  fieldWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  } satisfies CSSProperties,

  input: {
    padding: "10px 12px",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 16,
    width: "100%",
    color: "#222",
    boxSizing: "border-box",
  } satisfies CSSProperties,

  inputError: {
    border: "1px solid #e57373",
    boxShadow: "0 0 4px rgba(255,0,0,0.3)",
  } satisfies CSSProperties,

  card: {
    padding: 20,
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "white",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
    marginBottom: 20,
  } satisfies CSSProperties,

  buttonBase: {
    borderRadius: 6,
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  } satisfies CSSProperties,

  buttonVariants: {
    primary: { background: "#1976d2", color: "white" } satisfies CSSProperties,
    secondary: {
      background: "#f5f5f5",
      color: "#333",
      border: "1px solid #aaa",
    } satisfies CSSProperties,
    danger: { background: "#d32f2f", color: "white" } satisfies CSSProperties,
    success: { background: "#2e7d32", color: "white" } satisfies CSSProperties,
  },

  buttonSizes: {
    md: { padding: "10px 16px" } satisfies CSSProperties,
    sm: { padding: "6px 12px" } satisfies CSSProperties,
  },

  buttonDisabled: {
    background: "#9e9e9e",
    cursor: "not-allowed",
  } satisfies CSSProperties,
} as const;
