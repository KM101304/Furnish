import { Router } from "express";
import OpenAI from "openai";

export const analyzeRouter = Router();

const client = new OpenAI();

const SYSTEM = `You are an interior design assistant. Analyze the room photo(s) and return ONLY a raw JSON object — no markdown, no backticks, no explanation.

The object must have exactly two keys:
"style_tags": array of up to 5 style descriptors (e.g. "mid-century", "minimalist", "bohemian", "warm wood", "industrial", "scandinavian", "coastal", "traditional")
"item_types": array of furniture/decor categories the room would benefit from (choose from: "sofa", "sectional", "armchair", "coffee table", "dining table", "side table", "console table", "floor lamp", "table lamp", "dresser", "credenza", "bookshelf", "media console", "sideboard", "area rug")

Return valid JSON only.`;

analyzeRouter.post("/", async (req, res) => {
  const { images } = req.body;
  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "images array required" });
  }

  const imageBlocks = images.map(img => ({
    type: "image_url",
    image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
  }));

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 256,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text",
              text: `Analyze ${images.length > 1 ? `these ${images.length} photos of my room` : "my room"} and return a JSON object with style_tags and item_types.`,
            },
          ],
        },
      ],
    });

    const result = JSON.parse(response.choices[0].message.content);

    if (!Array.isArray(result.style_tags) || !Array.isArray(result.item_types)) {
      throw new Error("Unexpected response shape");
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
