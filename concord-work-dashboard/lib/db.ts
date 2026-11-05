import Database from "better-sqlite3";
import path from "path";

// Next.js runs from concord-demo/concord-work-dashboard/, so the
// Concord workspace is one level up.
const DB_PATH =
  process.env.CONCORD_DB_PATH ||
  path.join(process.cwd(), "..", ".concord", "concord.db");

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  }
  return db;
}
