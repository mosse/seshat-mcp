/**
 * Supabase client for server-side use in API routes.
 *
 * Uses the service role key — this module must only be imported
 * in server components and Route Handlers, never on the client.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.'
    );
  }
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _client;
}
