import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
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
      .from('user_profiles')
      .select('is_admin')
      .eq('email', adminUser.email)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    // Fetch all payments
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });
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

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
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
      .from('user_profiles')
      .select('is_admin')
      .eq('email', adminUser.email)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const rawPaymentData = await req.json();
    console.log('Creating payment with data:', rawPaymentData);
    
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
    };
    
    console.log('Transformed payment data:', paymentData);
    
    // Create the payment
    const { data: payment, error } = await supabase
      .from('payments')
      .insert(paymentData)
      .select('*')
      .single();
      
    if (error) {
      console.error('Payment creation error:', error);
      console.error('Payment data that failed:', paymentData);
      return NextResponse.json({ 
        error: 'Failed to create payment', 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }
    
    // Check if this payment completes the subscription
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
    console.error('Payment creation error:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
} 