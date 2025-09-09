import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('account_id', user.id)
    .single();
  return userProfile;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    const userProfile = await getUserFromToken(token);
    if (!userProfile) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('member_id', userProfile.id);
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
    }
    
    // Convert amount from string to number for proper handling
    const processedPayments = payments?.map(payment => ({
      ...payment,
      amount: parseFloat(payment.amount) || 0
    })) || [];
    
    return NextResponse.json(processedPayments);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 