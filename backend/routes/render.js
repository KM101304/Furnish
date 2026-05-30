import { Router } from "express";
import OpenAI, { toFile } from "openai";

export const renderRouter = Router();
const client = new OpenAI();

renderRouter.post("/", async (req, res) => {
  const { image, roomDescription, styleTags, slots } = req.body;
  if (!image?.base64 || !Array.isArray(slots) || slots.length === 0) {
    return res.status(400).json({ error: "image and slots required" });
  }

  const style = (styleTags || []).join(", ") || "contemporary";

  try {
    // Build room image file
    const roomBuf = Buffer.from(image.base64, "base64");
    const roomFile = await toFile(roomBuf, "room.jpg", { type: image.mediaType || "image/jpeg" });

    // Fetch each listing's product photo to use as a reference
    const itemRefs = [];
    for (const slot of slots) {
      const imgUrl = slot.listing?.images?.[0];
      if (!imgUrl) continue;
      try {
        const resp = await fetch(imgUrl, { signal: AbortSignal.timeout(6000) });
        if (!resp.ok) continue;
        const buf = Buffer.from(await resp.arrayBuffer());
        const file = await toFile(buf, `item.jpg`, { type: "image/jpeg" });
        itemRefs.push({ file, label: slot.label, placement: slot.placement });
      } catch { /* skip unreachable images */ }
    }

    // Prompt references each image by position
    const refLines = itemRefs.map((r, i) =>
      `Image ${i + 2} is a "${r.label}" — place it ${r.placement}.`
    ).join(" ");

    const prompt =
      `Image 1 is the empty room to furnish. ` +
      (refLines ? refLines + " " : "") +
      `Furnish the room with all these specific items, using the reference photos to match their exact appearance, color, and material. ` +
      `Style: ${style}. ` +
      `Preserve the room's original floors, walls, windows, ceiling, and proportions exactly. ` +
      `Photorealistic interior photography with warm natural lighting.`;

    const allImages = [roomFile, ...itemRefs.map(r => r.file)];

    const response = await client.images.edit({
      model: "gpt-image-1",
      image: allImages.length === 1 ? allImages[0] : allImages,
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const b64 = response.data[0].b64_json;
    res.json({ imageUrl: `data:image/png;base64,${b64}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
