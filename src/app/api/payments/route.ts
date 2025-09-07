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
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
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
    return NextResponse.json(payments);
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
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const paymentData = await req.json();
    console.log('Creating payment with data:', paymentData);
    
    // Create the payment
    const { data: payment, error } = await supabase
      .from('payments')
      .insert(paymentData)
      .select('*')
      .single();
      
    if (error) {
      console.error('Payment creation error:', error);
      return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
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
          
          // If full payment is made, update subscription status to active
          if (totalPaid >= planPrice && subscription.status === 'pending') {
            const { error: updateError } = await supabase
              .from('subscriptions')
              .update({ 
                status: 'active',
                updated_at: new Date().toISOString()
              })
              .eq('id', subscription.id);
              
            if (updateError) {
              console.error('Error updating subscription status:', updateError);
            } else {
              console.log(`Updated subscription ${subscription.id} status to 'active'`);
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