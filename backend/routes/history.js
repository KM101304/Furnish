import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getUserAnalyses, getAnalysis } from "../db/analyses.js";

export const historyRouter = Router();

historyRouter.get("/", requireAuth, (req, res) => {
  try {
    const analyses = getUserAnalyses(req.user.id, 30);
    res.json(analyses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

historyRouter.get("/:id", requireAuth, (req, res) => {
  try {
    const analysis = getAnalysis(req.params.id, req.user.id);
    if (!analysis) return res.status(404).json({ error: "Not found" });
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
