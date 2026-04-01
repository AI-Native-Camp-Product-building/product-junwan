// SERVER ONLY — never import from client components.
// This client uses the service_role key which bypasses Row Level Security.
// It is intended exclusively for server-side API routes and the sync pipeline.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase admin client authenticated with the service role key.
 *
 * NOT a singleton — each call returns a fresh instance to avoid stale
 * connections in serverless environments (Vercel Edge/Node functions).
 *
 * @throws {Error} if NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing
 */
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL environment variable. " +
        "Set it in .env.local or your deployment environment.",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. " +
        "This key is required for server-side write operations. " +
        "Find it in Supabase Dashboard > Settings > API > service_role.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
