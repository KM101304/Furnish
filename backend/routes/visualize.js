import { Router } from "express";
import OpenAI from "openai";

export const visualizeRouter = Router();

const client = new OpenAI();

const SYSTEM = `You are an interior design visualizer. In 3-4 vivid sentences, describe exactly how the furniture would look placed in the room shown. Be specific about placement, how it relates to existing features (floor, windows, walls), and how the colors/materials interact. Present tense only.`;

visualizeRouter.post("/", async (req, res) => {
  const { roomImage, name, description } = req.body;
  if (!roomImage?.base64 || !name) {
    return res.status(400).json({ error: "roomImage and name required" });
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 512,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${roomImage.mediaType};base64,${roomImage.base64}` },
            },
            { type: "text", text: `Item: ${name}\n${description}\n\nDescribe how this would look in my room.` },
          ],
        },
      ],
    });

    const text = response.choices[0].message.content;
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
