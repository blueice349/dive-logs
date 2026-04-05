import { cookies } from "next/headers";
import { createSession, findSession, deleteSession } from "@/app/api/store";
import { type PublicUser, toPublicUser } from "@/app/types/user";

const COOKIE_NAME = "session_token";
const SESSION_DURATION = 60 * 30; // 30 minutes

export async function setSession(userId: number) {
  const token = createSession(userId, SESSION_DURATION);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DURATION,
  });
}

export async function getSession(): Promise<PublicUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const user = findSession(token);
  return user ? toPublicUser(user) : null;
}

export async function clearSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) deleteSession(token);
  store.delete(COOKIE_NAME);
}
