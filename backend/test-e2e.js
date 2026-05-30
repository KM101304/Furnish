/**
 * End-to-end test: analyze room photos → query real DB → print matches.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node test-e2e.js photo1.jpg [photo2.jpg ...]
 *
 * Without an API key, pass --mock to use pre-set style tags:
 *   node test-e2e.js --mock
 */
import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { extname } from "path";
import Anthropic from "@anthropic-ai/sdk";
import { queryListings, countListings } from "./db/listings.js";

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

function loadImage(path) {
  const ext = extname(path).toLowerCase();
  const data = readFileSync(path).toString("base64");
  return { base64: data, mediaType: MIME[ext] || "image/jpeg" };
}

async function analyzeWithClaude(images) {
  const client = new Anthropic();
  const imageBlocks = images.map(img => ({
    type: "image",
    source: { type: "base64", media_type: img.mediaType, data: img.base64 },
  }));

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    system: `You are an interior design assistant. Analyze the room photo(s) and return ONLY a raw JSON object — no markdown, no backticks.
Keys: "style_tags" (up to 5 descriptors e.g. warm wood, minimalist, traditional, contemporary, mid-century) and "item_types" (furniture categories: sofa, sectional, armchair, coffee table, dining table, side table, floor lamp, table lamp, dresser, credenza, bookshelf, media console, area rug). Start with {`,
    messages: [
      {
        role: "user",
        content: [
          ...imageBlocks,
          { type: "text", text: `Analyze ${images.length > 1 ? "these room photos" : "this room"} and return style_tags and item_types. Start with {` },
        ],
      },
      { role: "assistant", content: "{" },
    ],
  });

  const raw = "{" + message.content.filter(b => b.type === "text").map(b => b.text).join("");
  return JSON.parse(raw);
}

// Visual analysis of the 1BR apartment photos provided by the user:
// - Large empty living room, parquet hardwood floors, cream walls, sliding glass door, baseboard heating
// - Bedroom: clean hardwood strip floors, white walls, natural light through window
// - Kitchen: dated but clean, wood cabinets, parquet floors
// Confident prediction of what Claude vision would return:
const MOCK_ANALYSIS = {
  style_tags: ["warm wood", "traditional", "contemporary", "minimalist"],
  item_types: ["sofa", "coffee table", "area rug", "floor lamp", "dining table", "armchair", "dresser"],
};

async function main() {
  const args = process.argv.slice(2);
  const mock = args.includes("--mock") || !process.env.ANTHROPIC_API_KEY;
  const imagePaths = args.filter(a => !a.startsWith("--") && existsSync(a));

  console.log(`\n=== Furnish E2E Test ===`);
  console.log(`DB: ${countListings()} active listings\n`);

  let analysis;
  if (mock || imagePaths.length === 0) {
    console.log(`[analyze] MOCK mode — using pre-set room analysis`);
    analysis = MOCK_ANALYSIS;
  } else {
    console.log(`[analyze] Sending ${imagePaths.length} photo(s) to Claude vision...`);
    const images = imagePaths.map(loadImage);
    analysis = await analyzeWithClaude(images);
  }

  console.log(`[analyze] style_tags: ${analysis.style_tags.join(", ")}`);
  console.log(`[analyze] item_types: ${analysis.item_types.join(", ")}\n`);

  console.log(`[listings] Querying DB...`);
  const listings = queryListings({
    styleTags: analysis.style_tags,
    itemTypes: analysis.item_types,
    city: null,
    limit: 6,
  });

  if (listings.length === 0) {
    console.log("No listings found. Run the scraper first: npm run scrape");
    return;
  }

  console.log(`[listings] ${listings.length} results:\n`);
  for (const l of listings) {
    const price = l.price ? `$${Math.round(l.price / 100)}` : "free";
    const tags = l.style_tags.join(", ") || "untagged";
    console.log(`  ${l.match_score} match  ${price.padStart(5)}  ${l.category.padEnd(15)} ${l.title.slice(0, 50)}`);
    console.log(`         tags: ${tags}`);
    console.log(`         city: ${l.city || "—"}   cond: ${l.condition || "—"}`);
    console.log(`         img:  ${l.images[0] || "none"}`);
    console.log(`         url:  ${l.listing_url}`);
    console.log();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
