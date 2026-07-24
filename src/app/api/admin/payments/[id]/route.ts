import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import {
  applyPaymentCreditEffects,
  reversePaymentCreditLedger,
} from '@/lib/member-credit';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/payments\/(.+?)(\/|$)/);
  return match ? match[1] : null;
}

async function syncSubscriptionStatus(subscriptionId: number) {
  const { data: subscription, error: subError } = await supabaseServer()
    .from('subscriptions')
    .select(`
      *,
      plan:plans(price)
    `)
    .eq('id', subscriptionId)
    .single();

  if (subError || !subscription) {
    console.error('Error fetching subscription for status sync:', subError);
    return;
  }

  const { data: allPayments, error: paymentsError } = await supabaseServer()
    .from('payments')
    .select('amount')
    .eq('subscription_id', subscriptionId)
    .eq('payment_status', 'paid');

  if (paymentsError) {
    console.error('Error fetching payments for status sync:', paymentsError);
    return;
  }

  const totalPaid = (allPayments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const planPrice = parseFloat(subscription.plan?.price || '0');

  let newStatus = subscription.status;
  if (totalPaid >= planPrice) {
    newStatus = 'active';
  } else if (totalPaid > 0) {
    newStatus = 'pending';
  } else {
    newStatus = 'pending';
  }

  if (newStatus !== subscription.status) {
    const { error: updateError } = await supabaseServer()
      .from('subscriptions')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Error updating subscription status:', updateError);
    }
  }
}

export async function PUT(request: NextRequest) {
  try {
    const id = extractIdFromUrl(request);
    if (!id) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }
    const paymentId = parseInt(id, 10);

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin')
      .eq('email', adminUser.email)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const rawPaymentData = await request.json();

    if (!rawPaymentData.subscription_id) {
      return NextResponse.json({ error: 'subscription_id is required' }, { status: 400 });
    }
    if (!rawPaymentData.member_id) {
      return NextResponse.json({ error: 'member_id is required' }, { status: 400 });
    }
    if (!rawPaymentData.amount || rawPaymentData.amount <= 0) {
      return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 });
    }

    const { data: existingPayment, error: existingError } = await supabaseServer()
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (existingError || !existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const paymentData = {
      subscription_id: parseInt(rawPaymentData.subscription_id),
      member_id: rawPaymentData.member_id,
      amount: parseFloat(rawPaymentData.amount),
      payment_type: rawPaymentData.payment_type || 'cash',
      payment_status: rawPaymentData.payment_status || rawPaymentData.status || 'paid',
      payment_date: rawPaymentData.payment_date || new Date().toISOString().split('T')[0],
      transaction_id: rawPaymentData.transaction_id || rawPaymentData.payment_reference || null,
      notes: rawPaymentData.notes || null,
      updated_at: new Date().toISOString(),
    };

    // Undo previous wallet effects for this payment before re-applying
    try {
      await reversePaymentCreditLedger({
        paymentId,
        memberId: existingPayment.member_id,
        entryDate: paymentData.payment_date,
        createdBy: adminUser.email,
        reason: `Reversal before update of payment #${paymentId}`,
        legacyPayment: existingPayment,
      });
    } catch (reverseError) {
      console.error('Error reversing payment credit before update:', reverseError);
      return NextResponse.json(
        {
          error: reverseError instanceof Error
            ? reverseError.message
            : 'Failed to reverse previous credit effects',
        },
        { status: 400 }
      );
    }

    const { data: payment, error } = await supabaseServer()
      .from('payments')
      .update(paymentData)
      .eq('id', paymentId)
      .select('*')
      .single();

    if (error) {
      console.error('Payment update error:', error);
      return NextResponse.json({
        error: 'Failed to update payment',
        details: error.message,
        code: error.code,
      }, { status: 500 });
    }

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.subscription_id) {
      const { data: subscription, error: subError } = await supabaseServer()
        .from('subscriptions')
        .select(`
          *,
          plan:plans(price)
        `)
        .eq('id', payment.subscription_id)
        .single();

      if (subError) {
        console.error('Error fetching subscription:', subError);
      } else if (subscription) {
        const { data: allPayments, error: paymentsError } = await supabaseServer()
          .from('payments')
          .select('id, amount')
          .eq('subscription_id', payment.subscription_id)
          .eq('payment_status', 'paid');

        if (paymentsError) {
          console.error('Error fetching payments:', paymentsError);
        } else {
          const planPrice = parseFloat(subscription.plan?.price || '0');
          const otherPaidTotal = (allPayments || [])
            .filter((p) => p.id !== paymentId)
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);

          try {
            await applyPaymentCreditEffects({
              paymentId,
              memberId: paymentData.member_id,
              amount: paymentData.amount,
              paymentType: paymentData.payment_type,
              paymentStatus: paymentData.payment_status,
              paymentDate: paymentData.payment_date,
              planPrice,
              otherPaidTotal,
              createdBy: adminUser.email,
            });
          } catch (creditError) {
            console.error('Error applying payment credit after update:', creditError);
            // Best-effort restore previous payment row
            await supabaseServer()
              .from('payments')
              .update({
                subscription_id: existingPayment.subscription_id,
                member_id: existingPayment.member_id,
                amount: existingPayment.amount,
                payment_type: existingPayment.payment_type,
                payment_status: existingPayment.payment_status,
                payment_date: existingPayment.payment_date,
                transaction_id: existingPayment.transaction_id,
                notes: existingPayment.notes,
                updated_at: new Date().toISOString(),
              })
              .eq('id', paymentId);

            try {
              const { data: restoredPayments } = await supabaseServer()
                .from('payments')
                .select('id, amount')
                .eq('subscription_id', existingPayment.subscription_id)
                .eq('payment_status', 'paid');
              const restoredOther = (restoredPayments || [])
                .filter((p) => p.id !== paymentId)
                .reduce((sum, p) => sum + parseFloat(p.amount), 0);
              await applyPaymentCreditEffects({
                paymentId,
                memberId: existingPayment.member_id,
                amount: parseFloat(existingPayment.amount),
                paymentType: existingPayment.payment_type,
                paymentStatus: existingPayment.payment_status,
                paymentDate: existingPayment.payment_date,
                planPrice,
                otherPaidTotal: restoredOther,
                createdBy: adminUser.email,
              });
            } catch (restoreError) {
              console.error('Failed to restore previous credit effects:', restoreError);
            }

            return NextResponse.json(
              {
                error: creditError instanceof Error
                  ? creditError.message
                  : 'Failed to apply credit for updated payment',
              },
              { status: 400 }
            );
          }
        }

        await syncSubscriptionStatus(payment.subscription_id);
      }
    }

    // If subscription changed, sync old one too
    if (
      existingPayment.subscription_id &&
      existingPayment.subscription_id !== payment.subscription_id
    ) {
      await syncSubscriptionStatus(existingPayment.subscription_id);
    }

    return NextResponse.json({ success: true, payment });
  } catch (error) {
    console.error('Payment update error:', error);
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = extractIdFromUrl(request);
    if (!id) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }
    const paymentId = parseInt(id, 10);

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin')
      .eq('email', adminUser.email)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { data: paymentToDelete, error: fetchError } = await supabaseServer()
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !paymentToDelete) {
      console.error('Error fetching payment before deletion:', fetchError);
      return NextResponse.json({
        error: 'Payment not found',
        details: fetchError?.message,
        code: fetchError?.code,
      }, { status: 404 });
    }

    // Reverse wallet effects before deleting (FK sets payment_id null on delete)
    try {
      await reversePaymentCreditLedger({
        paymentId,
        memberId: paymentToDelete.member_id,
        entryDate: paymentToDelete.payment_date || undefined,
        createdBy: adminUser.email,
        reason: `Reversal after deleting payment #${paymentId}`,
        legacyPayment: paymentToDelete,
      });
    } catch (reverseError) {
      console.error('Error reversing payment credit on delete:', reverseError);
      return NextResponse.json(
        {
          error: reverseError instanceof Error
            ? reverseError.message
            : 'Failed to reverse credit for deleted payment',
        },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer()
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (error) {
      console.error('Payment deletion error:', error);
      return NextResponse.json({
        error: 'Failed to delete payment',
        details: error.message,
        code: error.code,
      }, { status: 500 });
    }

    if (paymentToDelete.subscription_id) {
      await syncSubscriptionStatus(paymentToDelete.subscription_id);
    }

    return NextResponse.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Payment deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
}
