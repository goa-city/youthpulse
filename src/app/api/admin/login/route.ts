import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase/admin';

type LoginLookupBody = {
  username?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as LoginLookupBody;
  const username = body.username?.trim();

  if (!username) {
    return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
  }

  if (username.includes('@')) {
    return NextResponse.json({ email: username.toLowerCase() });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: 'Unable to verify username.' }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id);

  if (userError || !userData.user?.email) {
    return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
  }

  return NextResponse.json({ email: userData.user.email });
}
