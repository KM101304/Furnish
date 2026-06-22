import { Router } from "express";
import { queryListings } from "../db/listings.js";
import { db } from "../db/index.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const listingsRouter = Router();

listingsRouter.get("/", (req, res) => {
  const { tags, types, city, limit } = req.query;

  const styleTags = tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [];
  const itemTypes = types ? types.split(",").map(t => t.trim()).filter(Boolean) : [];

  if (itemTypes.length === 0) {
    return res.status(400).json({ error: "types query param required" });
  }

  try {
    const rows = queryListings({
      styleTags,
      itemTypes,
      city: city || null,
      limit: limit ? parseInt(limit, 10) : 6,
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Swap out a single listing slot without re-running the full analysis
listingsRouter.post("/shuffle", requireAuth, (req, res) => {
  const { category, city, styleTags = [], excludeUrls = [] } = req.body;
  if (!category) return res.status(400).json({ error: "category required" });

  try {
    const withImages = `images IS NOT NULL AND images != '[]' AND json_array_length(images) > 0`;
    let candidates = [];

    if (city) {
      candidates = db.prepare(
        `SELECT * FROM listings WHERE active=1 AND category=? AND city LIKE ? AND ${withImages} ORDER BY scraped_at DESC LIMIT 60`
      ).all(category, `%${city}%`);
    }

    if (candidates.length < 8) {
      const extra = db.prepare(
        `SELECT * FROM listings WHERE active=1 AND category=? AND ${withImages} ORDER BY scraped_at DESC LIMIT 80`
      ).all(category);
      const seen = new Set(candidates.map(r => r.external_id));
      candidates.push(...extra.filter(r => !seen.has(r.external_id)));
    }

    // Filter out already-shown listings
    const excludeSet = new Set(excludeUrls);
    candidates = candidates.filter(r => !excludeSet.has(r.listing_url));

    if (candidates.length === 0) return res.status(404).json({ error: "No more listings available" });

    const scored = candidates.map(row => {
      const tags = JSON.parse(row.style_tags || "[]");
      const imgs = JSON.parse(row.images || "[]");
      let score = styleTags.filter(t => tags.includes(t)).length * 2;
      if (imgs.length > 1) score += 1;
      if (row.description?.length > 20) score += 0.5;
      score += Math.random() * 0.4;
      return { row, score, imgs };
    });
    scored.sort((a, b) => b.score - a.score);
    const { row, imgs } = scored[Math.floor(Math.random() * Math.min(5, scored.length))];

    const h = row.posted_at ? Math.floor((Date.now() - new Date(row.posted_at)) / 3600000) : null;
    res.json({
      source: row.source,
      title: row.title,
      description: row.description || "",
      price: row.price,
      condition: row.condition || "Good",
      city: city || row.city || "",
      postedAgo: h == null ? "recently" : h < 1 ? "just now" : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`,
      images: imgs,
      listing_url: row.listing_url,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
