import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { refresh_token: refreshToken } = await req.json();
    if (!refreshToken || typeof refreshToken !== 'string') {
      return NextResponse.json({ error: 'refresh_token required' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const supabase = createClient(url, anonKey);
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      return NextResponse.json(
        { error: error?.message || 'Refresh failed' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Refresh failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
