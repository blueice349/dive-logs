import "server-only";
import { createClient } from "@libsql/client";
import { User } from "../types/user";
import { DiveLog, DiveLogBase } from "./logs/data";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Run once at module load — idempotent DDL + migrations
const dbReady = (async () => {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        phone TEXT NOT NULL,
        isAdmin INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS dive_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location TEXT NOT NULL,
        depth REAL NOT NULL,
        duration REAL NOT NULL,
        date TEXT NOT NULL,
        userId INTEGER REFERENCES users(id),
        buddy TEXT,
        diveType TEXT,
        visibility REAL,
        waterTemp REAL,
        tankStart REAL,
        tankEnd REAL,
        notes TEXT,
        rating INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES users(id),
        expiresAt INTEGER NOT NULL
      )`,
    ],
    "write"
  );

  // Migrations for databases created before these columns existed
  for (const sql of [
    "ALTER TABLE dive_logs ADD COLUMN userId INTEGER REFERENCES users(id)",
    "ALTER TABLE users ADD COLUMN isAdmin INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE dive_logs ADD COLUMN buddy TEXT",
    "ALTER TABLE dive_logs ADD COLUMN diveType TEXT",
    "ALTER TABLE dive_logs ADD COLUMN visibility REAL",
    "ALTER TABLE dive_logs ADD COLUMN waterTemp REAL",
    "ALTER TABLE dive_logs ADD COLUMN tankStart REAL",
    "ALTER TABLE dive_logs ADD COLUMN tankEnd REAL",
    "ALTER TABLE dive_logs ADD COLUMN notes TEXT",
    "ALTER TABLE dive_logs ADD COLUMN rating INTEGER",
  ]) {
    try {
      await db.execute(sql);
    } catch {
      // Column already exists — nothing to do
    }
  }
})();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const row = <T>(r: any): T => r as T;

export const listUsers = async (): Promise<Omit<User, "password">[]> => {
  await dbReady;
  const result = await db.execute(
    "SELECT id, email, firstName, lastName, phone, isAdmin FROM users ORDER BY id"
  );
  return result.rows as unknown as Omit<User, "password">[];
};

export const deleteUser = async (id: number): Promise<void> => {
  await dbReady;
  await db.batch(
    [
      { sql: "DELETE FROM dive_logs WHERE userId = ?", args: [id] },
      { sql: "DELETE FROM users WHERE id = ?", args: [id] },
    ],
    "write"
  );
};

export const insertUser = async (user: Omit<User, "id">): Promise<User> => {
  await dbReady;
  const result = await db.execute({
    sql: "INSERT INTO users (email, password, firstName, lastName, phone, isAdmin) VALUES (?, ?, ?, ?, ?, ?)",
    args: [user.email, user.password, user.firstName, user.lastName, user.phone, user.isAdmin],
  });
  return { id: Number(result.lastInsertRowid), ...user };
};

export const updateUser = async (id: number, data: Partial<User>): Promise<User | null> => {
  await dbReady;
  const entries = Object.entries(data).filter(([, v]) => v !== undefined);
  if (entries.length === 0) {
    const result = await db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [id] });
    return result.rows[0] ? row<User>(result.rows[0]) : null;
  }
  const fields = entries.map(([k]) => `${k} = ?`).join(", ");
  const values = entries.map(([, v]) => v as string | number | null);
  await db.execute({ sql: `UPDATE users SET ${fields} WHERE id = ?`, args: [...values, id] });
  const result = await db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [id] });
  return result.rows[0] ? row<User>(result.rows[0]) : null;
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  await dbReady;
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE LOWER(email) = ?",
    args: [email.toLowerCase()],
  });
  return result.rows[0] ? row<User>(result.rows[0]) : null;
};

export const findUserById = async (id: number): Promise<User | null> => {
  await dbReady;
  const result = await db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [id] });
  return result.rows[0] ? row<User>(result.rows[0]) : null;
};

// Session helpers
export const createSession = async (userId: number, ttlSeconds: number): Promise<string> => {
  await dbReady;
  const token = crypto.randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  await db.execute({
    sql: "INSERT INTO sessions (token, userId, expiresAt) VALUES (?, ?, ?)",
    args: [token, userId, expiresAt],
  });
  return token;
};

export const findSession = async (token: string): Promise<User | null> => {
  await dbReady;
  const now = Math.floor(Date.now() / 1000);
  const result = await db.execute({
    sql: "SELECT users.* FROM sessions JOIN users ON sessions.userId = users.id WHERE sessions.token = ? AND sessions.expiresAt > ?",
    args: [token, now],
  });
  return result.rows[0] ? row<User>(result.rows[0]) : null;
};

export const deleteSession = async (token: string): Promise<void> => {
  await dbReady;
  await db.execute({ sql: "DELETE FROM sessions WHERE token = ?", args: [token] });
};

// Dive log helpers
export const getAllDiveLogs = async (): Promise<DiveLog[]> => {
  await dbReady;
  const result = await db.execute(
    "SELECT dive_logs.*, users.firstName, users.lastName FROM dive_logs LEFT JOIN users ON dive_logs.userId = users.id ORDER BY date DESC"
  );
  return result.rows as unknown as DiveLog[];
};

export const getDiveLogsForUser = async (userId: number): Promise<DiveLog[]> => {
  await dbReady;
  const result = await db.execute({
    sql: "SELECT dive_logs.*, users.firstName, users.lastName FROM dive_logs LEFT JOIN users ON dive_logs.userId = users.id WHERE dive_logs.userId = ? ORDER BY date DESC",
    args: [userId],
  });
  return result.rows as unknown as DiveLog[];
};

export const insertDiveLog = async (log: DiveLogBase, userId: number): Promise<DiveLog> => {
  await dbReady;
  const result = await db.execute({
    sql: "INSERT INTO dive_logs (location, depth, duration, date, userId, buddy, diveType, visibility, waterTemp, tankStart, tankEnd, notes, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: [log.location, log.depth, log.duration, log.date, userId, log.buddy ?? null, log.diveType ?? null, log.visibility ?? null, log.waterTemp ?? null, log.tankStart ?? null, log.tankEnd ?? null, log.notes ?? null, log.rating ?? null],
  });
  return { id: Number(result.lastInsertRowid), userId, ...log };
};

export const updateDiveLog = async (
  id: number,
  userId: number,
  log: DiveLogBase
): Promise<DiveLog | null> => {
  await dbReady;
  const result = await db.execute({
    sql: "UPDATE dive_logs SET location = ?, depth = ?, duration = ?, date = ?, buddy = ?, diveType = ?, visibility = ?, waterTemp = ?, tankStart = ?, tankEnd = ?, notes = ?, rating = ? WHERE id = ? AND userId = ?",
    args: [log.location, log.depth, log.duration, log.date, log.buddy ?? null, log.diveType ?? null, log.visibility ?? null, log.waterTemp ?? null, log.tankStart ?? null, log.tankEnd ?? null, log.notes ?? null, log.rating ?? null, id, userId],
  });
  if (result.rowsAffected === 0) return null;
  const updated = await db.execute({ sql: "SELECT * FROM dive_logs WHERE id = ?", args: [id] });
  return updated.rows[0] ? row<DiveLog>(updated.rows[0]) : null;
};

export const adminUpdateDiveLog = async (
  id: number,
  log: DiveLogBase,
  targetUserId: number
): Promise<DiveLog | null> => {
  await dbReady;
  const result = await db.execute({
    sql: "UPDATE dive_logs SET location = ?, depth = ?, duration = ?, date = ?, userId = ?, buddy = ?, diveType = ?, visibility = ?, waterTemp = ?, tankStart = ?, tankEnd = ?, notes = ?, rating = ? WHERE id = ?",
    args: [log.location, log.depth, log.duration, log.date, targetUserId, log.buddy ?? null, log.diveType ?? null, log.visibility ?? null, log.waterTemp ?? null, log.tankStart ?? null, log.tankEnd ?? null, log.notes ?? null, log.rating ?? null, id],
  });
  if (result.rowsAffected === 0) return null;
  const updated = await db.execute({ sql: "SELECT * FROM dive_logs WHERE id = ?", args: [id] });
  return updated.rows[0] ? row<DiveLog>(updated.rows[0]) : null;
};

export const deleteDiveLog = async (id: number, userId: number): Promise<DiveLog | null> => {
  await dbReady;
  const found = await db.execute({
    sql: "SELECT * FROM dive_logs WHERE id = ? AND userId = ?",
    args: [id, userId],
  });
  if (!found.rows[0]) return null;
  const log = row<DiveLog>(found.rows[0]);
  await db.execute({ sql: "DELETE FROM dive_logs WHERE id = ?", args: [id] });
  return log;
};
