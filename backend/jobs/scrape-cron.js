import "dotenv/config";
import cron from "node-cron";
import OpenAI from "openai";
import { scrapeOfferUp } from "../scrapers/offerup.js";
import { scrapeMercari } from "../scrapers/mercari.js";
import { upsertListing, markStaleInactive, countListings } from "../db/listings.js";

const KEYWORDS = [
  "sofa", "sectional", "couch",
  "coffee table", "dining table", "side table",
  "armchair", "accent chair",
  "floor lamp", "table lamp",
  "dresser", "credenza", "bookshelf", "media console",
  "area rug",
];

const KEYWORD_TO_CATEGORY = {
  sofa: "sofa", sectional: "sectional", couch: "sofa",
  "coffee table": "coffee table", "dining table": "dining table",
  "side table": "side table", "console table": "console table",
  armchair: "armchair", "accent chair": "armchair",
  "floor lamp": "floor lamp", "table lamp": "table lamp",
  dresser: "dresser", credenza: "credenza",
  bookshelf: "bookshelf", "media console": "media console",
  sideboard: "credenza", "area rug": "area rug",
};

function guessCategory(title, keyword) {
  const titleLower = (title || "").toLowerCase();
  for (const [k, cat] of Object.entries(KEYWORD_TO_CATEGORY)) {
    if (titleLower.includes(k)) return cat;
  }
  return KEYWORD_TO_CATEGORY[keyword] || null;
}

async function tagBatch(listings) {
  if (!process.env.OPENAI_API_KEY) {
    console.log("  Style tagging skipped — no OPENAI_API_KEY");
    return listings.map(l => ({ ...l, style_tags: [] }));
  }

  const client = new OpenAI();
  const BATCH_SIZE = 20;
  const tagged = [];

  for (let i = 0; i < listings.length; i += BATCH_SIZE) {
    const batch = listings.slice(i, i + BATCH_SIZE);
    const items = batch
      .map((l, j) => `${j}: ${l.title}. ${(l.description || "").slice(0, 120)}`)
      .join("\n");

    try {
      const msg = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `For each furniture listing, return a JSON array where each element has:
"idx": item index (number)
"style_tags": array of 2-4 strings from: mid-century, minimalist, bohemian, warm wood, industrial, scandinavian, coastal, traditional, rustic, contemporary, eclectic

Listings:
${items}

Return only the raw JSON array, no markdown.`,
        }],
      });

      const raw = msg.choices[0].message.content;
      const results = JSON.parse(raw.replace(/```json|```/g, "").trim());
      for (const r of results) {
        if (batch[r.idx]) {
          tagged.push({ ...batch[r.idx], style_tags: r.style_tags || [] });
        }
      }
    } catch (err) {
      console.error("  Tag batch error:", err.message);
      tagged.push(...batch.map(l => ({ ...l, style_tags: [] })));
    }

    await new Promise(r => setTimeout(r, 500));
  }

  return tagged;
}

export async function runScrape() {
  console.log(`\n[scrape] starting at ${new Date().toISOString()}`);

  const [offerUpRaw, mercariRaw] = await Promise.all([
    scrapeOfferUp(KEYWORDS, { fetchDetails: true, detailLimit: 30 }),
    scrapeMercari(KEYWORDS),
  ]);

  const allRaw = [...offerUpRaw, ...mercariRaw].map(l => ({
    ...l,
    category: l.category || guessCategory(l.title, l._keyword),
  }));

  console.log(`[scrape] ${allRaw.length} raw listings — tagging...`);
  const tagged = await tagBatch(allRaw);

  let upserted = 0;
  for (const listing of tagged) {
    try {
      upsertListing(listing);
      upserted++;
    } catch (err) {
      console.error("[scrape] upsert failed:", err.message, listing?.external_id);
    }
  }

  markStaleInactive(48);
  const total = countListings();
  console.log(`[scrape] done — ${upserted} upserted, ${total} active in DB\n`);
  return { upserted, total };
}

const isOnce = process.argv.includes("--once");

if (isOnce) {
  runScrape().then(r => {
    console.log("Result:", r);
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
} else {
  cron.schedule("0 */4 * * *", runScrape);
  console.log("Scrape cron running every 4 hours. First run in 4h.");
}
