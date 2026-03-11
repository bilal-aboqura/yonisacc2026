/**
 * Shared CORS headers for Supabase Edge Functions.
 * 
 * In production, set the ALLOWED_ORIGIN env var in Supabase Dashboard 
 * → Edge Functions → Environment Variables to restrict requests to your domain.
 * 
 * If ALLOWED_ORIGIN is not set, defaults to '*' for development convenience.
 */

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';

export const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type, ' +
        'x-supabase-client-platform, x-supabase-client-platform-version, ' +
        'x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

/**
 * Quick CORS preflight response.
 * Use at the top of every edge function:
 *   if (req.method === 'OPTIONS') return corsResponse();
 */
export const corsResponse = () =>
    new Response(null, { headers: corsHeaders });
