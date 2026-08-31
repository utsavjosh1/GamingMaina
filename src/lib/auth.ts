import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

const baseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const secret = process.env.BETTER_AUTH_SECRET;

if (process.env.NODE_ENV === "production" && !secret) {
  throw new Error("BETTER_AUTH_SECRET must be configured in production");
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  baseURL,
  secret: secret || "development-only-secret-change-me-before-deploying-32-chars",
  trustedOrigins: [baseURL],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
