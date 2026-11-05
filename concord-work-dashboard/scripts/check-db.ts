import Database from "better-sqlite3";
import path from "path";

const DB_PATH =
  process.env.CONCORD_DB_PATH ||
  path.join(process.cwd(), "..", ".concord", "concord.db");

console.log("DB_PATH =", DB_PATH);

const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
console.log("agents:", db.prepare("SELECT COUNT(*) AS n FROM agents").get());
console.log("tasks:", db.prepare("SELECT COUNT(*) AS n FROM tasks").get());
console.log("events:", db.prepare("SELECT COUNT(*) AS n FROM events").get());
