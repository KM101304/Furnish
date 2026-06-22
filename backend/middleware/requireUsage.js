import { PLANS, incrementUse, getUsageSummary } from "../db/users.js";

export function requireUsage(req, res, next) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const plan = PLANS[user.plan] || PLANS.free;

  if (plan.monthlyLimit !== Infinity && user.uses_this_month >= plan.monthlyLimit) {
    const summary = getUsageSummary(user);
    return res.status(402).json({
      error: "usage_limit_reached",
      message: `You've used all ${plan.monthlyLimit} rooms this month on the ${plan.label} plan.`,
      usage: summary,
    });
  }

  incrementUse(user.id);
  // Optimistically update for downstream handlers
  req.user = { ...user, uses_this_month: user.uses_this_month + 1 };
  next();
}
