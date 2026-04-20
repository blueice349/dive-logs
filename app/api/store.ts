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
      `CREATE TABLE IF NOT EXISTS species (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        category TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS certifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL REFERENCES users(id),
        certName TEXT NOT NULL,
        agency TEXT,
        certDate TEXT,
        certNumber TEXT,
        notes TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS buddy_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dive_log_id INTEGER NOT NULL,
        from_user_id INTEGER NOT NULL,
        to_user_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
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
    "ALTER TABLE dive_logs ADD COLUMN lat REAL",
    "ALTER TABLE dive_logs ADD COLUMN lng REAL",
    "ALTER TABLE dive_logs ADD COLUMN marineLife TEXT",
    "ALTER TABLE dive_logs ADD COLUMN buddyUserId INTEGER REFERENCES users(id)",
  ]) {
    try {
      await db.execute(sql);
    } catch {
      // Column already exists — nothing to do
    }
  }

  // Seed default species
  const seeds: Array<{ name: string; category: string }> = [
    { name: "Clownfish", category: "Fish" },
    { name: "Blue Tang", category: "Fish" },
    { name: "Lionfish", category: "Fish" },
    { name: "Parrotfish", category: "Fish" },
    { name: "Angelfish", category: "Fish" },
    { name: "Triggerfish", category: "Fish" },
    { name: "Moray Eel", category: "Fish" },
    { name: "Barracuda", category: "Fish" },
    { name: "Grouper", category: "Fish" },
    { name: "Surgeonfish", category: "Fish" },
    { name: "Hammerhead Shark", category: "Shark & Ray" },
    { name: "Reef Shark", category: "Shark & Ray" },
    { name: "Bull Shark", category: "Shark & Ray" },
    { name: "Whale Shark", category: "Shark & Ray" },
    { name: "Manta Ray", category: "Shark & Ray" },
    { name: "Stingray", category: "Shark & Ray" },
    { name: "Eagle Ray", category: "Shark & Ray" },
    { name: "Green Sea Turtle", category: "Turtle & Reptile" },
    { name: "Hawksbill Sea Turtle", category: "Turtle & Reptile" },
    { name: "Sea Snake", category: "Turtle & Reptile" },
    { name: "Blue-ringed Octopus", category: "Invertebrate" },
    { name: "Giant Clam", category: "Invertebrate" },
    { name: "Nudibranch", category: "Invertebrate" },
    { name: "Feather Star", category: "Invertebrate" },
    { name: "Crown-of-Thorns Starfish", category: "Invertebrate" },
    { name: "Sea Urchin", category: "Invertebrate" },
    { name: "Lobster", category: "Invertebrate" },
    { name: "Shrimp", category: "Invertebrate" },
    { name: "Dolphin", category: "Marine Mammal" },
    { name: "Humpback Whale", category: "Marine Mammal" },
    { name: "Common Octopus", category: "Cephalopod" },
    { name: "Squid", category: "Cephalopod" },
    { name: "Cuttlefish", category: "Cephalopod" },
    { name: "Brain Coral", category: "Coral & Plant" },
    { name: "Sea Fan", category: "Coral & Plant" },
    { name: "Staghorn Coral", category: "Coral & Plant" },
  ];
  for (const s of seeds) {
    try {
      await db.execute({
        sql: "INSERT OR IGNORE INTO species (name, category) VALUES (?, ?)",
        args: [s.name, s.category],
      });
    } catch {
      // ignore
    }
  }
})();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const row = <T>(r: any): T => r as T;

export const listPublicUsers = async (): Promise<{ id: number; firstName: string; lastName: string }[]> => {
  await dbReady;
  const result = await db.execute(
    "SELECT id, firstName, lastName FROM users ORDER BY firstName, lastName"
  );
  return result.rows.map((r) => ({
    id: Number((r as Record<string, unknown>).id),
    firstName: String((r as Record<string, unknown>).firstName),
    lastName: String((r as Record<string, unknown>).lastName),
  }));
};

export const listUsers = async (): Promise<Omit<User, "password">[]> => {
  await dbReady;
  const result = await db.execute(
    "SELECT id, email, firstName, lastName, phone, isAdmin, isActive FROM users ORDER BY id"
  );
  return result.rows as unknown as Omit<User, "password">[];
};

export const setUserActive = async (id: number, isActive: 0 | 1): Promise<void> => {
  await dbReady;
  await db.execute({ sql: "UPDATE users SET isActive = ? WHERE id = ?", args: [isActive, id] });
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
    sql: "SELECT users.* FROM sessions JOIN users ON sessions.userId = users.id WHERE sessions.token = ? AND sessions.expiresAt > ? AND users.isActive = 1",
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
    sql: "INSERT INTO dive_logs (location, depth, duration, date, userId, buddy, buddyUserId, diveType, visibility, waterTemp, tankStart, tankEnd, notes, rating, lat, lng, wetsuit, bcd, fins, cylinderType, cylinderSize, gasMix, o2Percent, certUsed, marineLife) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: [log.location, log.depth, log.duration, log.date, userId, log.buddy ?? null, log.buddyUserId ?? null, log.diveType ?? null, log.visibility ?? null, log.waterTemp ?? null, log.tankStart ?? null, log.tankEnd ?? null, log.notes ?? null, log.rating ?? null, log.lat ?? null, log.lng ?? null, log.wetsuit ?? null, log.bcd ?? null, log.fins ?? null, log.cylinderType ?? null, log.cylinderSize ?? null, log.gasMix ?? null, log.o2Percent ?? null, log.certUsed ?? null, log.marineLife ?? null],
  });
  const inserted = await db.execute({
    sql: "SELECT dive_logs.*, users.firstName, users.lastName FROM dive_logs LEFT JOIN users ON dive_logs.userId = users.id WHERE dive_logs.id = ?",
    args: [Number(result.lastInsertRowid)],
  });
  return row<DiveLog>(inserted.rows[0]);
};

export const updateDiveLog = async (
  id: number,
  userId: number,
  log: DiveLogBase
): Promise<DiveLog | null> => {
  await dbReady;
  const result = await db.execute({
    sql: "UPDATE dive_logs SET location = ?, depth = ?, duration = ?, date = ?, buddy = ?, buddyUserId = ?, diveType = ?, visibility = ?, waterTemp = ?, tankStart = ?, tankEnd = ?, notes = ?, rating = ?, lat = ?, lng = ?, wetsuit = ?, bcd = ?, fins = ?, cylinderType = ?, cylinderSize = ?, gasMix = ?, o2Percent = ?, certUsed = ?, marineLife = ? WHERE id = ? AND userId = ?",
    args: [log.location, log.depth, log.duration, log.date, log.buddy ?? null, log.buddyUserId ?? null, log.diveType ?? null, log.visibility ?? null, log.waterTemp ?? null, log.tankStart ?? null, log.tankEnd ?? null, log.notes ?? null, log.rating ?? null, log.lat ?? null, log.lng ?? null, log.wetsuit ?? null, log.bcd ?? null, log.fins ?? null, log.cylinderType ?? null, log.cylinderSize ?? null, log.gasMix ?? null, log.o2Percent ?? null, log.certUsed ?? null, log.marineLife ?? null, id, userId],
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
    sql: "UPDATE dive_logs SET location = ?, depth = ?, duration = ?, date = ?, userId = ?, buddy = ?, buddyUserId = ?, diveType = ?, visibility = ?, waterTemp = ?, tankStart = ?, tankEnd = ?, notes = ?, rating = ?, lat = ?, lng = ?, wetsuit = ?, bcd = ?, fins = ?, cylinderType = ?, cylinderSize = ?, gasMix = ?, o2Percent = ?, certUsed = ?, marineLife = ? WHERE id = ?",
    args: [log.location, log.depth, log.duration, log.date, targetUserId, log.buddy ?? null, log.buddyUserId ?? null, log.diveType ?? null, log.visibility ?? null, log.waterTemp ?? null, log.tankStart ?? null, log.tankEnd ?? null, log.notes ?? null, log.rating ?? null, log.lat ?? null, log.lng ?? null, log.wetsuit ?? null, log.bcd ?? null, log.fins ?? null, log.cylinderType ?? null, log.cylinderSize ?? null, log.gasMix ?? null, log.o2Percent ?? null, log.certUsed ?? null, log.marineLife ?? null, id],
  });
  if (result.rowsAffected === 0) return null;
  const updated = await db.execute({ sql: "SELECT * FROM dive_logs WHERE id = ?", args: [id] });
  return updated.rows[0] ? row<DiveLog>(updated.rows[0]) : null;
};

export type DeleteDiveLogResult =
  | { status: "ok"; log: DiveLog }
  | { status: "not_found" }
  | { status: "forbidden" };

export const deleteDiveLog = async (id: number, userId: number): Promise<DeleteDiveLogResult> => {
  await dbReady;
  const found = await db.execute({
    sql: "SELECT * FROM dive_logs WHERE id = ?",
    args: [id],
  });
  if (!found.rows[0]) return { status: "not_found" };
  const log = row<DiveLog>(found.rows[0]);
  if (log.userId !== userId) return { status: "forbidden" };
  await db.execute({ sql: "DELETE FROM dive_logs WHERE id = ?", args: [id] });
  return { status: "ok", log };
};

// Certification helpers
export type Certification = {
  id: number;
  userId: number;
  certName: string;
  agency?: string;
  certDate?: string;
  certNumber?: string;
  notes?: string;
};

export const listCertifications = async (userId: number): Promise<Certification[]> => {
  await dbReady;
  const result = await db.execute({
    sql: "SELECT * FROM certifications WHERE userId = ? ORDER BY id",
    args: [userId],
  });
  return result.rows as unknown as Certification[];
};

export const insertCertification = async (
  data: Omit<Certification, "id" | "userId">,
  userId: number
): Promise<Certification> => {
  await dbReady;
  const result = await db.execute({
    sql: "INSERT INTO certifications (userId, certName, agency, certDate, certNumber, notes) VALUES (?, ?, ?, ?, ?, ?)",
    args: [userId, data.certName, data.agency ?? null, data.certDate ?? null, data.certNumber ?? null, data.notes ?? null],
  });
  const inserted = await db.execute({
    sql: "SELECT * FROM certifications WHERE id = ?",
    args: [Number(result.lastInsertRowid)],
  });
  return row<Certification>(inserted.rows[0]);
};

export const updateCertification = async (
  id: number,
  userId: number,
  data: Partial<Omit<Certification, "id" | "userId">>
): Promise<Certification | null> => {
  await dbReady;
  const entries = Object.entries(data).filter(([, v]) => v !== undefined);
  if (entries.length === 0) {
    const result = await db.execute({ sql: "SELECT * FROM certifications WHERE id = ? AND userId = ?", args: [id, userId] });
    return result.rows[0] ? row<Certification>(result.rows[0]) : null;
  }
  const fields = entries.map(([k]) => `${k} = ?`).join(", ");
  const values = entries.map(([, v]) => v as string | number | null);
  const res = await db.execute({ sql: `UPDATE certifications SET ${fields} WHERE id = ? AND userId = ?`, args: [...values, id, userId] });
  if (res.rowsAffected === 0) return null;
  const updated = await db.execute({ sql: "SELECT * FROM certifications WHERE id = ?", args: [id] });
  return updated.rows[0] ? row<Certification>(updated.rows[0]) : null;
};

export const deleteCertification = async (id: number, userId: number): Promise<boolean> => {
  await dbReady;
  const res = await db.execute({ sql: "DELETE FROM certifications WHERE id = ? AND userId = ?", args: [id, userId] });
  return res.rowsAffected > 0;
};

export const updateCertificationAdmin = async (
  id: number,
  data: Partial<Omit<Certification, "id" | "userId">>
): Promise<Certification | null> => {
  await dbReady;
  const entries = Object.entries(data).filter(([, v]) => v !== undefined);
  if (entries.length === 0) {
    const result = await db.execute({ sql: "SELECT * FROM certifications WHERE id = ?", args: [id] });
    return result.rows[0] ? row<Certification>(result.rows[0]) : null;
  }
  const fields = entries.map(([k]) => `${k} = ?`).join(", ");
  const values = entries.map(([, v]) => v as string | number | null);
  const res = await db.execute({ sql: `UPDATE certifications SET ${fields} WHERE id = ?`, args: [...values, id] });
  if (res.rowsAffected === 0) return null;
  const updated = await db.execute({ sql: "SELECT * FROM certifications WHERE id = ?", args: [id] });
  return updated.rows[0] ? row<Certification>(updated.rows[0]) : null;
};

export const deleteCertificationAdmin = async (id: number): Promise<boolean> => {
  await dbReady;
  const res = await db.execute({ sql: "DELETE FROM certifications WHERE id = ?", args: [id] });
  return res.rowsAffected > 0;
};

// Species helpers
export type Species = { id: number; name: string; category?: string };

export const listSpecies = async (): Promise<Species[]> => {
  await dbReady;
  const result = await db.execute("SELECT * FROM species ORDER BY name");
  return result.rows as unknown as Species[];
};

export const insertSpecies = async (name: string, category?: string): Promise<Species> => {
  await dbReady;
  const result = await db.execute({
    sql: "INSERT INTO species (name, category) VALUES (?, ?)",
    args: [name, category ?? null],
  });
  const inserted = await db.execute({ sql: "SELECT * FROM species WHERE id = ?", args: [Number(result.lastInsertRowid)] });
  return row<Species>(inserted.rows[0]);
};

export const deleteSpecies = async (id: number): Promise<boolean> => {
  await dbReady;
  const res = await db.execute({ sql: "DELETE FROM species WHERE id = ?", args: [id] });
  return res.rowsAffected > 0;
};

// ── Buddy requests ────────────────────────────────────────────────────────────

export type BuddyRequest = {
  id: number;
  dive_log_id: number;
  from_user_id: number;
  to_user_id: number;
  status: string;
  created_at: number;
  location?: string;
  date?: string;
  depth?: number;
  duration?: number;
  fromFirstName?: string;
  fromLastName?: string;
};

export const createBuddyRequest = async (
  diveLogId: number,
  fromUserId: number,
  toUserId: number
): Promise<void> => {
  await dbReady;
  const existing = await db.execute({
    sql: "SELECT id FROM buddy_requests WHERE dive_log_id = ? AND to_user_id = ?",
    args: [diveLogId, toUserId],
  });
  if (existing.rows.length > 0) return;
  await db.execute({
    sql: "INSERT INTO buddy_requests (dive_log_id, from_user_id, to_user_id) VALUES (?, ?, ?)",
    args: [diveLogId, fromUserId, toUserId],
  });
};

export const getPendingBuddyRequests = async (userId: number): Promise<BuddyRequest[]> => {
  await dbReady;
  const result = await db.execute({
    sql: `SELECT br.*, dl.location, dl.date, dl.depth, dl.duration,
            u.firstName AS fromFirstName, u.lastName AS fromLastName
          FROM buddy_requests br
          JOIN dive_logs dl ON dl.id = br.dive_log_id
          JOIN users u ON u.id = br.from_user_id
          WHERE br.to_user_id = ? AND br.status = 'pending'
          ORDER BY br.created_at DESC`,
    args: [userId],
  });
  return result.rows as unknown as BuddyRequest[];
};

export const updateBuddyRequest = async (
  id: number,
  toUserId: number,
  status: "confirmed" | "declined"
): Promise<boolean> => {
  await dbReady;
  const res = await db.execute({
    sql: "UPDATE buddy_requests SET status = ? WHERE id = ? AND to_user_id = ?",
    args: [status, id, toUserId],
  });
  return res.rowsAffected > 0;
};

export const countPendingBuddyRequests = async (userId: number): Promise<number> => {
  await dbReady;
  const result = await db.execute({
    sql: "SELECT COUNT(*) as count FROM buddy_requests WHERE to_user_id = ? AND status = 'pending'",
    args: [userId],
  });
  return Number((result.rows[0] as unknown as { count: number }).count);
};

export const getConfirmedBuddyDives = async (userId: number) => {
  await dbReady;
  const result = await db.execute({
    sql: `SELECT dl.*, u.firstName, u.lastName
          FROM dive_logs dl
          JOIN buddy_requests br ON br.dive_log_id = dl.id
          JOIN users u ON u.id = dl.userId
          WHERE br.to_user_id = ? AND br.status = 'confirmed'
          ORDER BY dl.date DESC`,
    args: [userId],
  });
  return result.rows;
};
