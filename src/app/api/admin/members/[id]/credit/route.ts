import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import {
  applyMemberCreditChange,
  getMemberCreditBalance,
  getMemberOutstandingDebit,
  updateManualCreditEntryDate,
} from '@/lib/member-credit';

async function verifyAdminAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return { error: NextResponse.json({ error: 'No token provided' }, { status: 401 }) };
  }

  const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
  if (authError || !adminUser) {
    return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) };
  }

  const { data: adminCheck } = await supabaseServer()
    .from('user_profiles')
    .select('is_admin, accessible_portals')
    .eq('email', adminUser.email)
    .single();

  if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }

  return { adminUser };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (authResult.error) return authResult.error;

    const { id: memberId } = await context.params;
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const { data: member, error: memberError } = await supabaseServer()
      .from('members')
      .select('id')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const { data: entries, error: entriesError } = await supabaseServer()
      .from('member_credit_entries')
      .select('*')
      .eq('member_id', memberId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (entriesError) {
      console.error('Credit entries fetch error:', entriesError);
      return NextResponse.json({ error: 'Failed to load credit history' }, { status: 500 });
    }

    const credit = await getMemberCreditBalance(memberId);
    const debit = await getMemberOutstandingDebit(memberId);

    return NextResponse.json({
      credit,
      debit,
      entries: (entries || []).map((entry) => ({
        id: entry.id,
        amount: parseFloat(entry.amount || '0'),
        entryType: entry.entry_type,
        entryDate: entry.entry_date,
        notes: entry.notes,
        balanceAfter: parseFloat(entry.balance_after || '0'),
        paymentId: entry.payment_id,
        createdBy: entry.created_by,
        createdAt: entry.created_at,
      })),
    });
  } catch (error: any) {
    console.error('Get member credit error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load member credit' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (authResult.error) return authResult.error;

    const { id: memberId } = await context.params;
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const amount = Number(body.amount);
    const action = body.action === 'remove' ? 'remove' : 'add';
    const entryDate = typeof body.entryDate === 'string' ? body.entryDate : undefined;
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    if (entryDate && !/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      return NextResponse.json({ error: 'Invalid entry date' }, { status: 400 });
    }

    const result = await applyMemberCreditChange({
      memberId,
      delta: action === 'remove' ? -amount : amount,
      entryType: action === 'remove' ? 'manual_remove' : 'manual_add',
      entryDate,
      notes: notes || null,
      createdBy: authResult.adminUser?.email || null,
    });

    const debit = await getMemberOutstandingDebit(memberId);

    return NextResponse.json({
      success: true,
      credit: result.newCredit,
      previousCredit: result.previousCredit,
      debit,
      entryId: result.entryId,
    });
  } catch (error: any) {
    console.error('Adjust member credit error:', error);
    const message = error.message || 'Failed to adjust member credit';
    const status = message.includes('Insufficient') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (authResult.error) return authResult.error;

    const { id: memberId } = await context.params;
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const entryId = Number(body.entryId);
    const entryDate = typeof body.entryDate === 'string' ? body.entryDate : '';

    if (!Number.isFinite(entryId) || entryId <= 0) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      return NextResponse.json({ error: 'Invalid entry date' }, { status: 400 });
    }

    const result = await updateManualCreditEntryDate({
      memberId,
      entryId,
      entryDate,
    });

    return NextResponse.json({
      success: true,
      entryId: result.entryId,
      entryDate: result.entryDate,
    });
  } catch (error: any) {
    console.error('Update credit entry date error:', error);
    const message = error.message || 'Failed to update credit entry date';
    const status =
      message.includes('not found') || message.includes('Only manually')
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
