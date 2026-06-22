import { Router } from "express";
import { openai } from "../lib/openai.js";
import { db } from "../db/index.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireUsage } from "../middleware/requireUsage.js";
import { saveAnalysis } from "../db/analyses.js";
import { getUsageSummary } from "../db/users.js";

export const furnishRouter = Router();

const SYSTEM = `You are an interior design AI. Analyze the room photo(s) and return ONLY a JSON object with these keys:

"roomDescription": 1-2 sentences describing floors, walls, light, size.
"dimensions": "small" | "medium" | "large"
"styleTags": array of 3-5 from: warm wood, minimalist, traditional, contemporary, mid-century, bohemian, industrial, scandinavian, coastal, rustic
"slots": array of exactly 6 objects, each with:
  "id": "item_0" through "item_5"
  "label": short furniture label (e.g. "Sectional sofa")
  "category": one of: sofa, sectional, armchair, coffee table, dining table, side table, floor lamp, table lamp, dresser, credenza, bookshelf, media console, area rug
  "placement": 1 sentence placement note
  "x": integer 5–95 (% from left in photo where item center would be)
  "y": integer 5–95 (% from top in photo where item center would be)
  "why": 1-2 sentences why this suits the room
  "listing": {
    "source": "mercari" or "offerup",
    "title": realistic secondhand listing title,
    "description": 1-2 sentence listing in seller voice,
    "price": integer cents (e.g. 28000 = $280),
    "condition": "Like New" | "Good" | "Fair",
    "city": use the city from the user message,
    "postedAgo": e.g. "2h ago",
    "images": [],
    "listing_url": "#"
  }

Spread hotspots spatially across the image. Place rugs low-center, lamps in corners, sofas along walls.`;

furnishRouter.post("/", requireAuth, requireUsage, async (req, res) => {
  const { images, city } = req.body;
  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "images array required" });
  }

  const imageBlocks = images.map(img => ({
    type: "image_url",
    image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
  }));

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text",
              text: `Analyze ${images.length > 1 ? `these ${images.length} room photos` : "this room"}. City: ${city || "Vancouver"}. Return JSON with roomDescription, styleTags, and 6 furniture slots each with a realistic listing.`,
            },
          ],
        },
      ],
    });

    const data = JSON.parse(response.choices[0].message.content);

    if (Array.isArray(data.slots)) {
      for (const slot of data.slots) {
        const real = findRealListing(slot.category, city);
        if (real) slot.listing = real;
        else if (slot.listing && city) slot.listing.city = city;
      }
    }

    // Save to history (non-blocking — don't fail the request if this errors)
    try {
      const thumbUrl = images[0] ? `data:${images[0].mediaType};base64,${images[0].base64.slice(0, 100)}` : null;
      const analysisId = saveAnalysis({
        userId: req.user.id,
        roomDescription: data.roomDescription,
        styleTags: data.styleTags,
        slots: data.slots,
        city,
        thumbUrl: images[0]?.previewUrl || null,
      });
      data._analysisId = analysisId;
    } catch { /* ignore history errors */ }

    data._usage = getUsageSummary(req.user);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function findRealListing(category, city) {
  if (!category) return null;
  try {
    const withImages = `images IS NOT NULL AND images != '[]'`;
    let row = city
      ? db.prepare(`SELECT * FROM listings WHERE active=1 AND category=? AND (city LIKE ?) AND ${withImages} ORDER BY RANDOM() LIMIT 1`).get(category, `%${city}%`)
      : null;

    if (!row) row = db.prepare(`SELECT * FROM listings WHERE active=1 AND category=? AND ${withImages} ORDER BY RANDOM() LIMIT 1`).get(category);
    if (!row) row = db.prepare(`SELECT * FROM listings WHERE active=1 AND category=? ORDER BY RANDOM() LIMIT 1`).get(category);
    if (!row) return null;

    const h = row.posted_at ? Math.floor((Date.now() - new Date(row.posted_at)) / 3600000) : null;
    return {
      source: row.source,
      title: row.title,
      description: row.description || "",
      price: row.price,
      condition: row.condition || "Good",
      city: city || row.city || "",
      postedAgo: h == null ? "recently" : h < 1 ? "just now" : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`,
      images: JSON.parse(row.images || "[]"),
      listing_url: row.listing_url,
    };
  } catch {
    return null;
  }
}
