import "server-only";
import Database from "better-sqlite3";
import path from "path";
import { User } from "./auth/data";
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
    date TEXT NOT NULL
  );
`);

export const readUsers = (): User[] => {
  return db.prepare("SELECT * FROM users").all() as User[];
};

export const writeUsers = (users: User[]) => {
  const insert = db.prepare(
    "INSERT OR REPLACE INTO users (id, email, password, firstName, lastName, phone) VALUES (@id, @email, @password, @firstName, @lastName, @phone)"
  );
  const deleteAll = db.prepare("DELETE FROM users");
  const transaction = db.transaction((u: User[]) => {
    deleteAll.run();
    u.forEach((user) => insert.run(user));
  });
  transaction(users);
};

export const getNextId = (): number => {
  const result = db.prepare("SELECT MAX(id) as maxId FROM users").get() as {
    maxId: number | null;
  };
  return (result.maxId ?? 0) + 1;
};

export const insertUser = (user: Omit<User, "id">): User => {
  const stmt = db.prepare(
    "INSERT INTO users (email, password, firstName, lastName, phone) VALUES (@email, @password, @firstName, @lastName, @phone)"
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

export const insertDiveLog = (log: DiveLogBase): DiveLog => {
  const result = db
    .prepare(
      "INSERT INTO dive_logs (location, depth, duration, date) VALUES (@location, @depth, @duration, @date)"
    )
    .run(log);
  return { id: Number(result.lastInsertRowid), ...log };
};

export const updateDiveLog = (id: number, log: DiveLogBase): DiveLog | null => {
  db.prepare(
    "UPDATE dive_logs SET location = @location, depth = @depth, duration = @duration, date = @date WHERE id = @id"
  ).run({ ...log, id });
  return db
    .prepare("SELECT * FROM dive_logs WHERE id = ?")
    .get(id) as DiveLog | null;
};

export const deleteDiveLog = (id: number): DiveLog | null => {
  const log = db
    .prepare("SELECT * FROM dive_logs WHERE id = ?")
    .get(id) as DiveLog | null;
  if (log) db.prepare("DELETE FROM dive_logs WHERE id = ?").run(id);
  return log;
};
