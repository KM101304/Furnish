import { clerkMiddleware, getAuth } from "@clerk/express";
import { getOrCreateUser, resetMonthlyUsageIfNeeded } from "../db/users.js";

// Mounts Clerk's request verification on every route
export const clerkAuth = clerkMiddleware();

// Resolves the Clerk identity to a DB user and attaches to req.user
export async function requireAuth(req, res, next) {
  // Dev bypass — only when CLERK_SECRET_KEY is not set
  if (!process.env.CLERK_SECRET_KEY) {
    req.user = {
      id: "dev-user",
      clerk_id: "dev",
      email: "dev@localhost",
      plan: "pro",
      uses_this_month: 0,
      period_reset_at: "2099-01-01",
    };
    return next();
  }

  const auth = getAuth(req);
  if (!auth?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    let user = getOrCreateUser(auth.userId, auth.sessionClaims?.email);
    user = resetMonthlyUsageIfNeeded(user);
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
