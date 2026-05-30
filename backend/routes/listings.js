import { Router } from "express";
import { queryListings } from "../db/listings.js";

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
