import { v4 as uuidv4 } from "uuid";
import { db } from "./index.js";

export function queryListings({ styleTags = [], itemTypes = [], city, limit = 6 }) {
  if (itemTypes.length === 0) return [];

  const results = [];

  // Pull up to (limit + 2) candidates per requested item type, then rank across all of them.
  // This ensures every category gets a chance even when most listings have no style tags.
  const perType = Math.max(4, Math.ceil((limit + 4) / itemTypes.length));

  for (const type of itemTypes) {
    const rows = db.prepare(`
      SELECT * FROM listings
      WHERE active = 1
        AND category = ?
        ${city ? "AND (city IS NULL OR city LIKE ?)" : ""}
      ORDER BY scraped_at DESC
      LIMIT ?
    `).all(type, ...(city ? [`%${city}%`, perType] : [perType]));

    for (const row of rows) {
      const tags = JSON.parse(row.style_tags || "[]");
      const matchScore = styleTags.filter(t => tags.includes(t)).length;
      results.push({ ...row, style_tags: tags, images: JSON.parse(row.images || "[]"), match_score: matchScore });
    }
  }

  // Sort: tagged matches first, then by scrape recency; dedupe by external_id
  const seen = new Set();
  const deduped = results.filter(r => {
    if (seen.has(r.external_id)) return false;
    seen.add(r.external_id);
    return true;
  });

  deduped.sort((a, b) => b.match_score - a.match_score || b.scraped_at.localeCompare(a.scraped_at));
  return deduped.slice(0, limit);
}

export function upsertListing(listing) {
  const {
    source, external_id, title, description, price, condition,
    category, style_tags, city, images, listing_url, posted_at,
  } = listing;

  const existing = db.prepare("SELECT id FROM listings WHERE source=? AND external_id=?").get(source, external_id);
  const id = existing?.id || uuidv4();

  db.prepare(`
    INSERT INTO listings (id, source, external_id, title, description, price, condition, category, style_tags, city, images, listing_url, posted_at, scraped_at, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 1)
    ON CONFLICT(source, external_id) DO UPDATE SET
      title       = excluded.title,
      description = excluded.description,
      price       = excluded.price,
      condition   = excluded.condition,
      category    = excluded.category,
      style_tags  = excluded.style_tags,
      images      = excluded.images,
      listing_url = excluded.listing_url,
      posted_at   = excluded.posted_at,
      scraped_at  = datetime('now'),
      active      = 1
  `).run(
    id, source, external_id, title || "", description || "", price || 0,
    condition || null, category || null,
    JSON.stringify(Array.isArray(style_tags) ? style_tags : []),
    city || null,
    JSON.stringify(Array.isArray(images) ? images : []),
    listing_url, posted_at || null
  );
}

export function markStaleInactive(olderThanHours = 48) {
  db.prepare(`
    UPDATE listings SET active = 0
    WHERE scraped_at < datetime('now', '-' || ? || ' hours')
  `).run(olderThanHours);
}

export function countListings() {
  return db.prepare("SELECT COUNT(*) as n FROM listings WHERE active=1").get().n;
}
