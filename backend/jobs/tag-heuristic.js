// Applies keyword-based style tags to listings that have no tags.
// Runs as a fallback when ANTHROPIC_API_KEY is not set, and as a
// fast pre-pass before the Claude tagging step.
import "dotenv/config";
import { db } from "../db/index.js";

const RULES = [
  { tags: ["mid-century"], words: ["mid-century", "mid century", "mcm", "eames", "danish modern", "teak", "walnut credenza", "danish"] },
  { tags: ["warm wood"], words: ["wood", "walnut", "oak", "teak", "mahogany", "pine", "birch", "bamboo", "wooden", "hardwood"] },
  { tags: ["industrial"], words: ["industrial", "pipe", "metal", "iron", "steel", "loft"] },
  { tags: ["scandinavian", "minimalist"], words: ["scandinavian", "ikea", "nordic", "hygge", "minimalist", "clean line"] },
  { tags: ["rustic"], words: ["rustic", "farmhouse", "barn", "reclaimed", "distressed", "antique"] },
  { tags: ["bohemian"], words: ["boho", "bohemian", "rattan", "wicker", "jute", "macrame", "eclectic"] },
  { tags: ["coastal"], words: ["coastal", "beach", "nautical", "driftwood", "whitewash"] },
  { tags: ["traditional"], words: ["traditional", "classic", "colonial", "wingback", "chesterfield"] },
  { tags: ["contemporary"], words: ["modern", "contemporary", "sleek", "minimalist", "glass", "acrylic", "chrome"] },
  { tags: ["eclectic"], words: ["vintage", "retro", "eclectic", "unique", "one of a kind"] },
];

function heuristicTags(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const matched = new Set();
  for (const rule of RULES) {
    if (rule.words.some(w => text.includes(w))) {
      rule.tags.forEach(t => matched.add(t));
    }
  }
  return [...matched].slice(0, 4);
}

const rows = db.prepare("SELECT id, title, description, style_tags FROM listings WHERE active=1").all();
let updated = 0;

const stmt = db.prepare("UPDATE listings SET style_tags=? WHERE id=?");
const updateMany = db.transaction(rows => {
  for (const row of rows) {
    const existing = JSON.parse(row.style_tags || "[]");
    if (existing.length > 0) continue;
    const tags = heuristicTags(row.title, row.description);
    if (tags.length > 0) {
      stmt.run(JSON.stringify(tags), row.id);
      updated++;
    }
  }
});

updateMany(rows);
console.log(`Tagged ${updated} / ${rows.length} listings with keyword heuristics`);

// Verify a sample
const sample = db.prepare("SELECT title, style_tags FROM listings WHERE style_tags != '[]' LIMIT 5").all();
for (const s of sample) console.log(`  "${s.title}" → ${s.style_tags}`);
