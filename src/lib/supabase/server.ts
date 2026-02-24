import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { headers } from 'next/headers';

export function getServerSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      headers,
    }
  );
}