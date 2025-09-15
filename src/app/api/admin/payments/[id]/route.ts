import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

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
    console.log('Updating payment with data:', rawPaymentData);
    console.log('Payment method from frontend:', rawPaymentData.payment_method);
    console.log('Payment type from frontend:', rawPaymentData.payment_type);

    // Validate required fields
    if (!rawPaymentData.subscription_id) {
      return NextResponse.json({ error: 'subscription_id is required' }, { status: 400 });
    }
    if (!rawPaymentData.member_id) {
      return NextResponse.json({ error: 'member_id is required' }, { status: 400 });
    }
    if (!rawPaymentData.amount || rawPaymentData.amount <= 0) {
      return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 });
    }

    // Transform the data to match database schema
    const paymentData = {
      subscription_id: parseInt(rawPaymentData.subscription_id),
      member_id: rawPaymentData.member_id,
      amount: parseFloat(rawPaymentData.amount),
      payment_type: rawPaymentData.payment_type || 'cash',
      payment_status: rawPaymentData.payment_status || rawPaymentData.status || 'paid',
      payment_date: rawPaymentData.payment_date || new Date().toISOString().split('T')[0],
      transaction_id: rawPaymentData.payment_reference || rawPaymentData.transaction_id || null,
      notes: rawPaymentData.notes || null,
      updated_at: new Date().toISOString(),
    };

    console.log('Transformed payment data for update:', paymentData);

    // Update the payment
    const { data: payment, error } = await supabaseServer()
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
        // Get all payments for this subscription
        const { data: allPayments, error: paymentsError } = await supabaseServer()
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
          
          // Handle excess payment - add credit to member if payment exceeds subscription amount
          if (totalPaid > planPrice && paymentData.payment_type !== 'credit') {
            const excessAmount = totalPaid - planPrice;
            console.log(`Payment exceeds subscription amount by ${excessAmount} TND. Adding to member credit.`);
            
            try {
              // Get current member credit
              const { data: member, error: memberError } = await supabaseServer()
                .from('members')
                .select('credit')
                .eq('id', paymentData.member_id)
                .single();
                
              if (memberError) {
                console.error('Error fetching member credit for excess payment:', memberError);
              } else if (member) {
                const currentCredit = parseFloat(member.credit || '0');
                const newCredit = currentCredit + excessAmount;
                
                // Update member credit with excess amount
                const { error: creditUpdateError } = await supabaseServer()
                  .from('members')
                  .update({ 
                    credit: newCredit.toString(),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', paymentData.member_id);
                  
                if (creditUpdateError) {
                  console.error('Error updating member credit with excess payment:', creditUpdateError);
                } else {
                  console.log(`Added ${excessAmount} TND excess payment to member ${paymentData.member_id} credit. New balance: ${newCredit} TND`);
                }
              }
            } catch (error) {
              console.error('Error processing excess payment credit:', error);
            }
          }
          
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
            const { error: updateError } = await supabaseServer()
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

    // Get the payment details before deletion to check subscription
    const { data: paymentToDelete, error: fetchError } = await supabaseServer()
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
    const { error } = await supabaseServer()
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
      const { data: subscription, error: subError } = await supabaseServer()
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
        const { data: allPayments, error: paymentsError } = await supabaseServer()
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
            const { error: updateError } = await supabaseServer()
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