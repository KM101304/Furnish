import { Router } from "express";
import { toFile } from "openai";
import { openai } from "../lib/openai.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { saveRenderedUrl } from "../db/analyses.js";

export const renderRouter = Router();

renderRouter.post("/", requireAuth, async (req, res) => {
  const { image, roomDescription, styleTags, slots, analysisId } = req.body;
  if (!image?.base64 || !Array.isArray(slots) || slots.length === 0) {
    return res.status(400).json({ error: "image and slots required" });
  }

  const style = (styleTags || []).join(", ") || "contemporary";

  try {
    const roomBuf = Buffer.from(image.base64, "base64");
    const roomFile = await toFile(roomBuf, "room.jpg", { type: image.mediaType || "image/jpeg" });

    const itemRefs = [];
    for (const slot of slots) {
      const imgUrl = slot.listing?.images?.[0];
      if (!imgUrl) continue;
      try {
        const resp = await fetch(imgUrl, { signal: AbortSignal.timeout(6000) });
        if (!resp.ok) continue;
        const buf = Buffer.from(await resp.arrayBuffer());
        const file = await toFile(buf, "item.jpg", { type: "image/jpeg" });
        itemRefs.push({ file, label: slot.label, placement: slot.placement });
      } catch { /* skip unreachable */ }
    }

    const refLines = itemRefs.map((r, i) =>
      `Image ${i + 2}: a "${r.label}" — reproduce its exact color, material, and shape, place it ${r.placement}.`
    ).join(" ");

    const prompt =
      `Image 1 is the empty room. ` +
      (refLines ? refLines + " " : "") +
      `Place every referenced furniture item into the room, faithfully reproducing each item's exact color, texture, and silhouette as shown in its reference photo. ` +
      `Do not substitute or invent furniture — use only what the reference images show. ` +
      `Preserve the room's original architecture: floors, walls, windows, ceiling height, and natural light direction. ` +
      `Style: ${style}. Photorealistic interior photography, 50mm lens, soft natural light.`;

    const allImages = [roomFile, ...itemRefs.map(r => r.file)];

    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: allImages.length === 1 ? allImages[0] : allImages,
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const imageUrl = `data:image/png;base64,${response.data[0].b64_json}`;

    if (analysisId) {
      saveRenderedUrl(analysisId, imageUrl).catch(() => {});
    }

    res.json({ imageUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
