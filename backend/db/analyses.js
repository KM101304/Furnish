import { v4 as uuidv4 } from "uuid";
import { db } from "./index.js";

export function saveAnalysis({ userId, roomDescription, styleTags, slots, city, thumbUrl }) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO analyses (id, user_id, room_description, style_tags, slots, city, thumb_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, userId, roomDescription || "",
    JSON.stringify(styleTags || []),
    JSON.stringify(slots || []),
    city || null,
    thumbUrl || null,
  );
  return id;
}

export function saveRenderedUrl(analysisId, renderedUrl) {
  db.prepare("UPDATE analyses SET rendered_url = ? WHERE id = ?").run(renderedUrl, analysisId);
}

export function getUserAnalyses(userId, limit = 20) {
  return db.prepare(`
    SELECT id, room_description, style_tags, slots, rendered_url, city, thumb_url, created_at
    FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
  `).all(userId, limit).map(row => ({
    ...row,
    style_tags: JSON.parse(row.style_tags || "[]"),
    slots: JSON.parse(row.slots || "[]"),
  }));
}

export function getAnalysis(id, userId) {
  const row = db.prepare("SELECT * FROM analyses WHERE id = ? AND user_id = ?").get(id, userId);
  if (!row) return null;
  return {
    ...row,
    style_tags: JSON.parse(row.style_tags || "[]"),
    slots: JSON.parse(row.slots || "[]"),
  };
}
