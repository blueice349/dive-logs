import "server-only";
import Database from "better-sqlite3";
import path from "path";
import { User } from "../types/user";
import { DiveLog, DiveLogBase } from "./logs/data";

const db = new Database(path.join(process.cwd(), "data.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    phone TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS dive_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location TEXT NOT NULL,
    depth REAL NOT NULL,
    duration REAL NOT NULL,
    date TEXT NOT NULL,
    userId INTEGER REFERENCES users(id)
  );
`);

// Add userId column to existing databases that predate this migration
try {
  db.exec("ALTER TABLE dive_logs ADD COLUMN userId INTEGER REFERENCES users(id)");
} catch {
  // Column already exists — nothing to do
}

try {
  db.exec("ALTER TABLE users ADD COLUMN isAdmin INTEGER NOT NULL DEFAULT 0");
} catch {
  // Column already exists — nothing to do
}

export const listUsers = (): Omit<User, "password">[] =>
  db
    .prepare("SELECT id, email, firstName, lastName, phone, isAdmin FROM users ORDER BY id")
    .all() as Omit<User, "password">[];

export const deleteUser = (id: number): void => {
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
};

export const insertUser = (user: Omit<User, "id">): User => {
  const stmt = db.prepare(
    "INSERT INTO users (email, password, firstName, lastName, phone, isAdmin) VALUES (@email, @password, @firstName, @lastName, @phone, @isAdmin)"
  );
  const result = stmt.run(user);
  return { id: Number(result.lastInsertRowid), ...user };
};

export const updateUser = (id: number, data: Partial<User>): User | null => {
  const fields = Object.keys(data)
    .map((k) => `${k} = @${k}`)
    .join(", ");
  db.prepare(`UPDATE users SET ${fields} WHERE id = @id`).run({ ...data, id });
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | null;
};

export const findUserByEmail = (email: string): User | null => {
  return db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email) as User | null;
};

export const findUserById = (id: number): User | null => {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | null;
};

// Dive log helpers
export const getAllDiveLogs = (): DiveLog[] =>
  db.prepare("SELECT * FROM dive_logs ORDER BY date DESC").all() as DiveLog[];

export const getDiveLogsForUser = (userId: number): DiveLog[] =>
  db
    .prepare("SELECT * FROM dive_logs WHERE userId = ? ORDER BY date DESC")
    .all(userId) as DiveLog[];

export const insertDiveLog = (log: DiveLogBase, userId: number): DiveLog => {
  const result = db
    .prepare(
      "INSERT INTO dive_logs (location, depth, duration, date, userId) VALUES (@location, @depth, @duration, @date, @userId)"
    )
    .run({ ...log, userId });
  return { id: Number(result.lastInsertRowid), userId, ...log };
};

export const updateDiveLog = (
  id: number,
  userId: number,
  log: DiveLogBase
): DiveLog | null => {
  const changes = db
    .prepare(
      "UPDATE dive_logs SET location = @location, depth = @depth, duration = @duration, date = @date WHERE id = @id AND userId = @userId"
    )
    .run({ ...log, id, userId }).changes;
  if (changes === 0) return null;
  return db
    .prepare("SELECT * FROM dive_logs WHERE id = ?")
    .get(id) as DiveLog | null;
};

export const deleteDiveLog = (id: number, userId: number): DiveLog | null => {
  const log = db
    .prepare("SELECT * FROM dive_logs WHERE id = ? AND userId = ?")
    .get(id, userId) as DiveLog | null;
  if (log) db.prepare("DELETE FROM dive_logs WHERE id = ?").run(id);
  return log;
};
