import { v4 as uuidv4 } from "uuid";
import { db } from "./index.js";

export const PLANS = {
  free:    { label: "Free",    price: 0,  monthlyLimit: 3  },
  starter: { label: "Starter", price: 12, monthlyLimit: 20 },
  pro:     { label: "Pro",     price: 24, monthlyLimit: Infinity },
};

export function getOrCreateUser(clerkId, email) {
  let user = db.prepare("SELECT * FROM users WHERE clerk_id = ?").get(clerkId);
  if (!user) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO users (id, clerk_id, email) VALUES (?, ?, ?)
    `).run(id, clerkId, email || null);
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  }
  return user;
}

export function getUserByClerkId(clerkId) {
  return db.prepare("SELECT * FROM users WHERE clerk_id = ?").get(clerkId);
}

export function getUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

export function incrementUse(userId) {
  db.prepare("UPDATE users SET uses_this_month = uses_this_month + 1 WHERE id = ?").run(userId);
}

export function resetMonthlyUsageIfNeeded(user) {
  const now = new Date();
  const resetAt = new Date(user.period_reset_at);
  if (now >= resetAt) {
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);
    db.prepare(`
      UPDATE users SET uses_this_month = 0, period_reset_at = ? WHERE id = ?
    `).run(nextReset, user.id);
    return { ...user, uses_this_month: 0, period_reset_at: nextReset };
  }
  return user;
}

export function updatePlan(clerkId, plan, stripeCustomerId, stripeSubscriptionId) {
  db.prepare(`
    UPDATE users SET plan = ?, stripe_customer_id = ?, stripe_subscription_id = ?
    WHERE clerk_id = ?
  `).run(plan, stripeCustomerId, stripeSubscriptionId, clerkId);
}

export function updatePlanBySubscription(stripeSubscriptionId, plan) {
  db.prepare(`UPDATE users SET plan = ? WHERE stripe_subscription_id = ?`).run(plan, stripeSubscriptionId);
}

export function getUsageSummary(user) {
  const plan = PLANS[user.plan] || PLANS.free;
  return {
    plan: user.plan,
    planLabel: plan.label,
    used: user.uses_this_month,
    limit: plan.monthlyLimit,
    remaining: plan.monthlyLimit === Infinity ? Infinity : Math.max(0, plan.monthlyLimit - user.uses_this_month),
    resetsAt: user.period_reset_at,
  };
}
