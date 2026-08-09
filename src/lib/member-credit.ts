import { supabaseServer } from '@/lib/supabase';

export type CreditEntryType =
  | 'manual_add'
  | 'manual_remove'
  | 'payment_use'
  | 'payment_excess'
  | 'payment_reversal'
  | 'initial'
  | 'opening_balance';

export interface ApplyCreditChangeParams {
  memberId: string;
  /** Signed delta: positive adds credit, negative removes credit. */
  delta: number;
  entryType: CreditEntryType;
  entryDate?: string; // YYYY-MM-DD
  notes?: string | null;
  paymentId?: number | null;
  createdBy?: string | null;
}

export interface ApplyCreditChangeResult {
  previousCredit: number;
  newCredit: number;
  entryId: number;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Source of truth: SUM(member_credit_entries.amount).
 * There is no members.credit column.
 */
export async function getMemberCreditBalance(memberId: string): Promise<number> {
  const { data, error } = await supabaseServer().rpc('get_member_credit_balance', {
    p_member_id: memberId,
  });

  if (!error && data !== null && data !== undefined) {
    return roundMoney(parseFloat(String(data)));
  }

  const { data: entries, error: entriesError } = await supabaseServer()
    .from('member_credit_entries')
    .select('amount')
    .eq('member_id', memberId);

  if (entriesError) {
    throw new Error(entriesError.message || 'Failed to load credit balance');
  }

  const sum = (entries || []).reduce(
    (total, row) => total + parseFloat(row.amount || '0'),
    0
  );
  return roundMoney(sum);
}

/** Bulk balances for list/stats views. Missing ids map to 0. */
export async function getMemberCreditBalancesMap(
  memberIds?: string[]
): Promise<Map<string, number>> {
  const balances = new Map<string, number>();

  if (memberIds && memberIds.length === 0) {
    return balances;
  }

  let query = supabaseServer()
    .from('member_credit_entries')
    .select('member_id, amount');

  if (memberIds?.length) {
    query = query.in('member_id', memberIds);
  }

  const { data: entries, error } = await query;
  if (error) {
    throw new Error(error.message || 'Failed to load credit balances');
  }

  for (const row of entries || []) {
    const id = row.member_id as string;
    const next = (balances.get(id) || 0) + parseFloat(row.amount || '0');
    balances.set(id, roundMoney(next));
  }

  if (memberIds) {
    for (const id of memberIds) {
      if (!balances.has(id)) balances.set(id, 0);
    }
  }

  return balances;
}

/**
 * Update entry_date for a manual_add row only. Amount / balance unchanged.
 */
export async function updateManualCreditEntryDate(params: {
  memberId: string;
  entryId: number;
  entryDate: string;
}): Promise<{ entryId: number; entryDate: string }> {
  const { memberId, entryId, entryDate } = params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    throw new Error('Invalid entry date');
  }

  const { data: entry, error: fetchError } = await supabaseServer()
    .from('member_credit_entries')
    .select('id, entry_type, member_id')
    .eq('id', entryId)
    .eq('member_id', memberId)
    .single();

  if (fetchError || !entry) {
    throw new Error(fetchError?.message || 'Credit entry not found');
  }

  if (entry.entry_type !== 'manual_add') {
    throw new Error('Only manually added credits can have their date edited');
  }

  const { error: updateError } = await supabaseServer()
    .from('member_credit_entries')
    .update({ entry_date: entryDate })
    .eq('id', entryId)
    .eq('member_id', memberId);

  if (updateError) {
    throw new Error(updateError.message || 'Failed to update credit entry date');
  }

  return { entryId, entryDate };
}

/**
 * Append-only ledger write. Removals cannot drive balance below 0.
 */
export async function applyMemberCreditChange(
  params: ApplyCreditChangeParams
): Promise<ApplyCreditChangeResult> {
  const {
    memberId,
    delta,
    entryType,
    entryDate,
    notes,
    paymentId,
    createdBy,
  } = params;

  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error('Credit change amount must be a non-zero number');
  }

  const { data: member, error: memberError } = await supabaseServer()
    .from('members')
    .select('id')
    .eq('id', memberId)
    .single();

  if (memberError || !member) {
    throw new Error(memberError?.message || 'Member not found');
  }

  const previousCredit = await getMemberCreditBalance(memberId);
  const rawNext = previousCredit + delta;
  const newCredit = roundMoney(Math.max(0, rawNext));
  const appliedDelta = roundMoney(newCredit - previousCredit);

  if (appliedDelta === 0) {
    throw new Error('Insufficient credit balance');
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: entry, error: entryError } = await supabaseServer()
    .from('member_credit_entries')
    .insert({
      member_id: memberId,
      amount: appliedDelta.toString(),
      entry_type: entryType,
      entry_date: entryDate || today,
      notes: notes || null,
      balance_after: newCredit.toString(),
      payment_id: paymentId ?? null,
      created_by: createdBy || null,
    })
    .select('id')
    .single();

  if (entryError || !entry) {
    throw new Error(entryError?.message || 'Failed to record credit entry');
  }

  return {
    previousCredit,
    newCredit,
    entryId: entry.id,
  };
}

/** Net ledger impact for a payment (0 if none / already fully reversed). */
export async function getPaymentCreditLedgerNet(paymentId: number): Promise<number> {
  const { data: entries, error } = await supabaseServer()
    .from('member_credit_entries')
    .select('amount')
    .eq('payment_id', paymentId);

  if (error) {
    throw new Error(error.message || 'Failed to load payment credit ledger');
  }

  const sum = (entries || []).reduce(
    (total, row) => total + parseFloat(row.amount || '0'),
    0
  );
  return roundMoney(sum);
}

/**
 * Undo all wallet effects tied to a payment by appending the opposite delta.
 * Idempotent when net is already 0.
 * Legacy fallback: paid credit payments created before the ledger had no rows —
 * treat them as payment_use (-amount) so delete/update restores the wallet.
 * Blocks if reversing an excess credit that has already been spent.
 */
export async function reversePaymentCreditLedger(params: {
  paymentId: number;
  memberId: string;
  entryDate?: string;
  createdBy?: string | null;
  reason?: string;
  /** Used when no ledger rows exist for this payment (pre-ledger data). */
  legacyPayment?: {
    amount: number | string;
    payment_type: string;
    payment_status: string;
  } | null;
}): Promise<{ reversed: number }> {
  let net = await getPaymentCreditLedgerNet(params.paymentId);

  if (net === 0 && params.legacyPayment) {
    const amount = roundMoney(parseFloat(String(params.legacyPayment.amount || 0)));
    if (
      params.legacyPayment.payment_type === 'credit' &&
      params.legacyPayment.payment_status === 'paid' &&
      amount > 0
    ) {
      // Pretend a historical payment_use existed
      net = roundMoney(-amount);
    }
  }

  if (net === 0) {
    return { reversed: 0 };
  }

  // net > 0 means payment added wallet credit (excess); removing it requires available balance
  if (net > 0) {
    const balance = await getMemberCreditBalance(params.memberId);
    if (balance < net) {
      throw new Error(
        `Cannot reverse payment #${params.paymentId}: only ${balance} credit left, need ${net}`
      );
    }
  }

  await applyMemberCreditChange({
    memberId: params.memberId,
    delta: -net,
    entryType: 'payment_reversal',
    entryDate: params.entryDate,
    notes: params.reason || `Reversal of credit ledger for payment #${params.paymentId}`,
    paymentId: params.paymentId,
    createdBy: params.createdBy || null,
  });

  return { reversed: roundMoney(-net) };
}

/**
 * Excess wallet credit created by this payment only (not the full overpay total).
 * Credit-type payments never create excess.
 */
export function computePaymentExcessDelta(params: {
  planPrice: number;
  otherPaidTotal: number;
  thisAmount: number;
  paymentType: string;
  paymentStatus: string;
}): number {
  if (params.paymentType === 'credit' || params.paymentStatus !== 'paid') {
    return 0;
  }
  const planPrice = roundMoney(params.planPrice);
  const other = roundMoney(params.otherPaidTotal);
  const amount = roundMoney(params.thisAmount);
  const excessBefore = Math.max(0, other - planPrice);
  const excessAfter = Math.max(0, other + amount - planPrice);
  return roundMoney(excessAfter - excessBefore);
}

/** Apply wallet effects for a paid payment (use credit and/or excess). */
export async function applyPaymentCreditEffects(params: {
  paymentId: number;
  memberId: string;
  amount: number;
  paymentType: string;
  paymentStatus: string;
  paymentDate?: string;
  planPrice: number;
  otherPaidTotal: number;
  createdBy?: string | null;
}): Promise<void> {
  if (params.paymentStatus !== 'paid') return;

  if (params.paymentType === 'credit') {
    await applyMemberCreditChange({
      memberId: params.memberId,
      delta: -params.amount,
      entryType: 'payment_use',
      entryDate: params.paymentDate,
      notes: `Payment #${params.paymentId} for subscription`,
      paymentId: params.paymentId,
      createdBy: params.createdBy || null,
    });
    return;
  }

  const excess = computePaymentExcessDelta({
    planPrice: params.planPrice,
    otherPaidTotal: params.otherPaidTotal,
    thisAmount: params.amount,
    paymentType: params.paymentType,
    paymentStatus: params.paymentStatus,
  });

  if (excess > 0) {
    await applyMemberCreditChange({
      memberId: params.memberId,
      delta: excess,
      entryType: 'payment_excess',
      entryDate: params.paymentDate,
      notes: `Overpayment on payment #${params.paymentId}`,
      paymentId: params.paymentId,
      createdBy: params.createdBy || null,
    });
  }
}

export async function getMemberOutstandingDebit(memberId: string): Promise<number> {
  const { data: subscriptions, error: subError } = await supabaseServer()
    .from('subscriptions')
    .select(`
      id,
      plans ( price )
    `)
    .eq('member_id', memberId);

  if (subError) {
    throw new Error(subError.message || 'Failed to load subscriptions');
  }

  if (!subscriptions?.length) return 0;

  const { data: payments, error: payError } = await supabaseServer()
    .from('payments')
    .select('subscription_id, amount, payment_status')
    .eq('member_id', memberId)
    .eq('payment_status', 'paid');

  if (payError) {
    throw new Error(payError.message || 'Failed to load payments');
  }

  const paidBySub = new Map<number, number>();
  for (const payment of payments || []) {
    const subId = payment.subscription_id as number;
    const amount = parseFloat(payment.amount || '0');
    paidBySub.set(subId, (paidBySub.get(subId) || 0) + amount);
  }

  let debit = 0;
  for (const sub of subscriptions) {
    const plan = Array.isArray(sub.plans) ? sub.plans[0] : sub.plans;
    const planPrice = parseFloat((plan as { price?: string } | null)?.price || '0');
    const paid = paidBySub.get(sub.id) || 0;
    debit += Math.max(0, planPrice - paid);
  }

  return roundMoney(debit);
}
