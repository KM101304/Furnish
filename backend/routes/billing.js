import { Router } from "express";
import Stripe from "stripe";
import { requireAuth } from "../middleware/requireAuth.js";
import { updatePlan, updatePlanBySubscription, getUsageSummary, getUserByClerkId } from "../db/users.js";

export const billingRouter = Router();

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro:     process.env.STRIPE_PRICE_PRO,
};

billingRouter.post("/checkout", requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Billing not configured" });

  const { plan } = req.body;
  if (!PRICE_IDS[plan]) return res.status(400).json({ error: "Invalid plan" });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      success_url: `${process.env.APP_URL || "http://localhost:5173"}/?upgraded=1`,
      cancel_url:  `${process.env.APP_URL || "http://localhost:5173"}/pricing`,
      customer_email: req.user.email || undefined,
      metadata: { clerk_id: req.user.clerk_id, plan },
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

billingRouter.post("/portal", requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Billing not configured" });

  const customerId = req.user.stripe_customer_id;
  if (!customerId) return res.status(400).json({ error: "No billing account" });

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.APP_URL || "http://localhost:5173"}`,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

billingRouter.get("/usage", requireAuth, (req, res) => {
  res.json(getUsageSummary(req.user));
});

// Stripe webhook — raw body required
billingRouter.post("/webhook", async (req, res) => {
  if (!stripe) return res.status(503).end();

  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  const session = event.data.object;

  if (event.type === "checkout.session.completed") {
    const clerkId = session.metadata?.clerk_id;
    const plan = session.metadata?.plan;
    if (clerkId && plan) {
      updatePlan(clerkId, plan, session.customer, session.subscription);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    updatePlanBySubscription(session.id, "free");
  }

  if (event.type === "customer.subscription.updated") {
    // Handle plan changes via portal (map price ID back to plan name)
    const priceId = session.items?.data?.[0]?.price?.id;
    const plan = Object.entries(PRICE_IDS).find(([, p]) => p === priceId)?.[0];
    if (plan) updatePlanBySubscription(session.id, plan);
  }

  res.json({ received: true });
});
