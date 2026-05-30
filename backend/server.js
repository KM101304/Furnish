import "dotenv/config";
import express from "express";
import { analyzeRouter } from "./routes/analyze.js";
import { visualizeRouter } from "./routes/visualize.js";
import { listingsRouter } from "./routes/listings.js";
import { furnishRouter } from "./routes/furnish.js";
import { renderRouter } from "./routes/render.js";

const app = express();
app.use(express.json({ limit: "20mb" }));

app.use("/api/analyze", analyzeRouter);
app.use("/api/visualize", visualizeRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/furnish", furnishRouter);
app.use("/api/render", renderRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Furnish backend on :${port}`));
