import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dir = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_URL?.startsWith("sqlite:")
  ? process.env.DATABASE_URL.replace("sqlite:", "")
  : join(__dir, "../../furnish.db");

mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS listings (
    id           TEXT PRIMARY KEY,
    source       TEXT NOT NULL,
    external_id  TEXT NOT NULL,
    title        TEXT NOT NULL,
    description  TEXT DEFAULT '',
    price        INTEGER NOT NULL DEFAULT 0,
    condition    TEXT,
    category     TEXT,
    style_tags   TEXT DEFAULT '[]',
    city         TEXT,
    images       TEXT DEFAULT '[]',
    listing_url  TEXT NOT NULL,
    posted_at    TEXT,
    scraped_at   TEXT DEFAULT (datetime('now')),
    active       INTEGER DEFAULT 1,
    UNIQUE(source, external_id)
  );
  CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
  CREATE INDEX IF NOT EXISTS idx_listings_city     ON listings(city);
  CREATE INDEX IF NOT EXISTS idx_listings_active   ON listings(active);
`);
