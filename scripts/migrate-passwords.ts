import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import path from "path";

const SALT_ROUNDS = 12;

const db = new Database(path.join(process.cwd(), "data.db"));

type UserRow = { id: number; password: string };

const isBcryptHash = (val: string) =>
  val.startsWith("$2b$") || val.startsWith("$2a$");

async function main() {
  const users = db.prepare("SELECT id, password FROM users").all() as UserRow[];

  console.log(`Found ${users.length} user(s) to check...`);

  let migrated = 0;

  for (const user of users) {
    if (isBcryptHash(user.password)) {
      console.log(`  User ${user.id}: already hashed, skipping.`);
      continue;
    }

    const hashed = await bcrypt.hash(user.password, SALT_ROUNDS);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(
      hashed,
      user.id
    );
    console.log(`  User ${user.id}: migrated ✓`);
    migrated++;
  }

  console.log(`\nDone. ${migrated} password(s) migrated.`);
}

main();
