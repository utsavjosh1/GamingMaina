import "server-only";

export function getValidatedEnv() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@127.0.0.1:5432/gaming_mania_unconfigured";

  const siteUrl =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  const authSecret =
    process.env.BETTER_AUTH_SECRET ||
    "development-only-secret-change-me-before-deploying-32-chars";

  if (process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_SECRET) {
    console.warn("WARN: BETTER_AUTH_SECRET should be explicitly set in production.");
  }

  return {
    databaseUrl,
    siteUrl,
    authSecret,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    isDevBypass:
      process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_BYPASS === "true",
  };
}
