/**
 * Supabase client singleton for the MCP server.
 *
 * Uses the service role key (server-side only) to bypass RLS.
 * Environment variables are read at import time; crash early
 * if they're missing so operators see a clear error on startup.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables. ' +
      'Set them in .env or your deployment environment.'
  );
}

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY
);
