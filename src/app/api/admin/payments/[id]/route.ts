import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/payments\/(.+?)(\/|$)/);
  return match ? match[1] : null;
}

export async function PUT(request: NextRequest) {
  try {
    const id = extractIdFromUrl(request);
    if (!id) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    const { data: adminCheck } = await supabase
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const rawPaymentData = await request.json();
    console.log('Updating payment with data:', rawPaymentData);

    // Validate required fields
    if (!rawPaymentData.subscription_id) {
      return NextResponse.json({ error: 'subscription_id is required' }, { status: 400 });
    }
    if (!rawPaymentData.user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }
    if (!rawPaymentData.amount || rawPaymentData.amount <= 0) {
      return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 });
    }

    // Transform the data to match database schema
    const paymentData = {
      subscription_id: parseInt(rawPaymentData.subscription_id),
      user_id: rawPaymentData.user_id,
      amount: parseFloat(rawPaymentData.amount),
      payment_type: rawPaymentData.payment_type || 'cash',
      payment_status: rawPaymentData.payment_status || 'paid',
      payment_date: rawPaymentData.payment_date || new Date().toISOString().split('T')[0],
      transaction_id: rawPaymentData.transaction_id || null,
      notes: rawPaymentData.notes || null,
      updated_at: new Date().toISOString(),
    };

    console.log('Transformed payment data for update:', paymentData);

    // Update the payment
    const { data: payment, error } = await supabase
      .from('payments')
      .update(paymentData)
      .eq('id', parseInt(id))
      .select('*')
      .single();

    if (error) {
      console.error('Payment update error:', error);
      return NextResponse.json({ 
        error: 'Failed to update payment', 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Check if this payment update affects the subscription status
    if (payment.subscription_id) {
      // Get the subscription and plan details
      const { data: subscription, error: subError } = await supabase
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
        // Get all payments for this subscription
        const { data: allPayments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount')
          .eq('subscription_id', payment.subscription_id)
          .eq('payment_status', 'paid');
          
        if (paymentsError) {
          console.error('Error fetching payments:', paymentsError);
        } else {
          // Calculate total paid
          const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
          const planPrice = parseFloat(subscription.plan?.price || '0');
          
          console.log(`Subscription ${subscription.id}: Total paid: ${totalPaid}, Plan price: ${planPrice}`);
          
          // Determine the correct status based on payment amount
          let newStatus = subscription.status;
          if (totalPaid >= planPrice) {
            // Full payment made - activate subscription
            newStatus = 'active';
          } else if (totalPaid > 0) {
            // Partial payment - keep as pending
            newStatus = 'pending';
          } else {
            // No payment - keep as pending
            newStatus = 'pending';
          }
          
          // Update subscription status if it changed
          if (newStatus !== subscription.status) {
            const { error: updateError } = await supabase
              .from('subscriptions')
              .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
              })
              .eq('id', subscription.id);
              
            if (updateError) {
              console.error('Error updating subscription status:', updateError);
            } else {
              console.log(`Updated subscription ${subscription.id} status from '${subscription.status}' to '${newStatus}'`);
            }
          }
        }
      }
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

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    const { data: adminCheck } = await supabase
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get the payment details before deletion to check subscription
    const { data: paymentToDelete, error: fetchError } = await supabase
      .from('payments')
      .select('subscription_id')
      .eq('id', parseInt(id))
      .single();

    if (fetchError) {
      console.error('Error fetching payment before deletion:', fetchError);
      return NextResponse.json({ 
        error: 'Payment not found', 
        details: fetchError.message,
        code: fetchError.code 
      }, { status: 404 });
    }

    // Delete the payment
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('Payment deletion error:', error);
      return NextResponse.json({ 
        error: 'Failed to delete payment', 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    // Check if this payment deletion affects the subscription status
    if (paymentToDelete.subscription_id) {
      // Get the subscription and plan details
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:plans(price)
        `)
        .eq('id', paymentToDelete.subscription_id)
        .single();
        
      if (subError) {
        console.error('Error fetching subscription:', subError);
      } else if (subscription) {
        // Get all remaining payments for this subscription
        const { data: allPayments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount')
          .eq('subscription_id', paymentToDelete.subscription_id)
          .eq('payment_status', 'paid');
          
        if (paymentsError) {
          console.error('Error fetching payments:', paymentsError);
        } else {
          // Calculate total paid after deletion
          const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
          const planPrice = parseFloat(subscription.plan?.price || '0');
          
          console.log(`After payment deletion - Subscription ${subscription.id}: Total paid: ${totalPaid}, Plan price: ${planPrice}`);
          
          // Determine the correct status based on payment amount
          let newStatus = subscription.status;
          if (totalPaid >= planPrice) {
            // Full payment made - activate subscription
            newStatus = 'active';
          } else if (totalPaid > 0) {
            // Partial payment - keep as pending
            newStatus = 'pending';
          } else {
            // No payment - keep as pending
            newStatus = 'pending';
          }
          
          // Update subscription status if it changed
          if (newStatus !== subscription.status) {
            const { error: updateError } = await supabase
              .from('subscriptions')
              .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
              })
              .eq('id', subscription.id);
              
            if (updateError) {
              console.error('Error updating subscription status:', updateError);
            } else {
              console.log(`Updated subscription ${subscription.id} status from '${subscription.status}' to '${newStatus}' after payment deletion`);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Payment deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
} 