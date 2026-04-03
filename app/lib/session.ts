import { cookies } from "next/headers";
import { findUserById } from "@/app/api/store";
import { type User } from "@/app/types/user";

const COOKIE_NAME = "user_id";
const SESSION_DURATION = 60 * 30; // 30 minutes

export async function setSession(userId: number) {
  const store = await cookies();
  store.set(COOKIE_NAME, String(userId), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
  });
}

export async function getSession(): Promise<User | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return findUserById(Number(raw));
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
