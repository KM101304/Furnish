import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { extname } from "path";
import OpenAI from "openai";
import { queryListings, countListings } from "./db/listings.js";

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

function loadImage(path) {
  const ext = extname(path).toLowerCase();
  const base64 = readFileSync(path).toString("base64");
  return { base64, mediaType: MIME[ext] || "image/jpeg" };
}

async function analyzeRoom(images) {
  const client = new OpenAI();
  const imageBlocks = images.map(img => ({
    type: "image_url",
    image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
  }));

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 256,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an interior design assistant. Analyze the room photo(s) and return ONLY a raw JSON object.
Keys: "style_tags" (up to 5 descriptors: warm wood, minimalist, traditional, contemporary, mid-century, bohemian, industrial, scandinavian, coastal, rustic)
and "item_types" (furniture the room needs: sofa, sectional, armchair, coffee table, dining table, side table, floor lamp, table lamp, dresser, credenza, bookshelf, media console, area rug).`,
      },
      {
        role: "user",
        content: [
          ...imageBlocks,
          { type: "text", text: `Analyze ${images.length > 1 ? `these ${images.length} room photos` : "this room"} and return JSON with style_tags and item_types.` },
        ],
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
}

async function main() {
  const args = process.argv.slice(2);
  const imagePaths = args.filter(a => existsSync(a));

  console.log(`\n=== Furnish OpenAI Test ===`);
  console.log(`DB: ${countListings()} active listings\n`);

  if (imagePaths.length === 0) {
    console.log("Usage: node test-openai.js photo1.jpg [photo2.jpg ...]");
    process.exit(1);
  }

  console.log(`[analyze] Sending ${imagePaths.length} photo(s) to gpt-4o vision...`);
  const images = imagePaths.map(loadImage);
  const analysis = await analyzeRoom(images);

  console.log(`\n[analyze] Result:`);
  console.log(`  style_tags : ${analysis.style_tags.join(", ")}`);
  console.log(`  item_types : ${analysis.item_types.join(", ")}\n`);

  console.log(`[listings] Querying DB for matches...`);
  const listings = queryListings({
    styleTags: analysis.style_tags,
    itemTypes: analysis.item_types,
    city: "Vancouver",
    limit: 6,
  });

  if (listings.length === 0) {
    console.log("No listings matched. Run the scraper first: npm run scrape");
    return;
  }

  console.log(`[listings] ${listings.length} results:\n`);
  for (const l of listings) {
    const price = l.price ? `$${Math.round(l.price / 100)}` : "free";
    console.log(`  ${l.match_score} match  ${price.padStart(5)}  ${l.category.padEnd(15)} ${l.title.slice(0, 50)}`);
    console.log(`         tags: ${(l.style_tags || []).join(", ") || "untagged"}`);
    console.log(`         url:  ${l.listing_url}`);
    console.log();
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
