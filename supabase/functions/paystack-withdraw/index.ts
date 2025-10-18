import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { amount, accountNumber, bankCode } = await req.json();

    if (!amount || !accountNumber || !bankCode) {
      throw new Error('Missing required fields');
    }

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabaseClient
      .from('user_wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Initiate Paystack transfer
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      throw new Error('Paystack configuration missing');
    }

    // Create transfer recipient
    const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: user.email || 'User',
        account_number: accountNumber,
        bank_code: bankCode,
        currency: wallet.currency,
      }),
    });

    const recipientData = await recipientResponse.json();
    if (!recipientData.status) {
      throw new Error(recipientData.message || 'Failed to create recipient');
    }

    // Initiate transfer
    const transferResponse = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: amount * 100, // Convert to kobo
        recipient: recipientData.data.recipient_code,
        reason: 'Wallet withdrawal',
      }),
    });

    const transferData = await transferResponse.json();
    if (!transferData.status) {
      throw new Error(transferData.message || 'Transfer failed');
    }

    // Deduct from wallet and create transaction
    const { error: updateError } = await supabaseClient
      .from('user_wallets')
      .update({ balance: wallet.balance - amount })
      .eq('id', wallet.id);

    if (updateError) {
      console.error('Failed to update wallet:', updateError);
      throw new Error('Failed to update wallet balance');
    }

    // Record transaction
    const { error: transactionError } = await supabaseClient
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        amount: -amount,
        type: 'withdrawal',
        status: 'completed',
        reference: transferData.data.transfer_code,
        description: `Withdrawal to ${accountNumber}`,
      });

    if (transactionError) {
      console.error('Failed to record transaction:', transactionError);
    }

    console.log(`Withdrawal successful for user ${user.id}: ${amount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Withdrawal initiated successfully',
        reference: transferData.data.transfer_code,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing withdrawal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
