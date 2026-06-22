import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { clerkAuth } from "./middleware/requireAuth.js";
import { furnishRouter } from "./routes/furnish.js";
import { renderRouter }  from "./routes/render.js";
import { listingsRouter } from "./routes/listings.js";
import { historyRouter } from "./routes/history.js";
import { billingRouter } from "./routes/billing.js";

const app = express();

// Security headers (relaxed CSP for data: URIs used by the image render)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS — allow the frontend origin
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",");
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o.trim()))) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

// Stripe webhook needs raw body BEFORE json parsing
app.use("/api/billing/webhook",
  express.raw({ type: "application/json" }),
  (req, _res, next) => { req.rawBody = req.body; next(); }
);

app.use(express.json({ limit: "20mb" }));

// Clerk auth on every request (no-op if CLERK_SECRET_KEY is not set)
if (process.env.CLERK_SECRET_KEY) app.use(clerkAuth);

// Global rate limit — 120 req / 15 min per IP
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false }));

// AI endpoint rate limits — stricter
const aiLimit = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

app.use("/api/furnish",   aiLimit, furnishRouter);
app.use("/api/render",    aiLimit, renderRouter);
app.use("/api/listings",  listingsRouter);
app.use("/api/history",   historyRouter);
app.use("/api/billing",   billingRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Generic error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Furnish backend on :${port}`));
