import crypto from 'crypto';

// Helper to get kashier config
const getConfig = () => ({
  apiKey: process.env.KASHIER_API_KEY || '',
  secretKey: process.env.KASHIER_SECRET_KEY || '',
  merchantId: process.env.KASHIER_MERCHANT_ID || '',
  mode: process.env.KASHIER_MODE || 'test'
});

/**
 * Generate hash for Kashier payment
 */
export function generateHash(merchantId, orderId, amount, currency) {
  const { apiKey } = getConfig();
  const path = `/?payment=${merchantId}.${orderId}.${amount}.${currency}`;
  return crypto
    .createHmac('sha256', apiKey)
    .update(path)
    .digest('hex');
}

/**
 * Verify webhook signature from Kashier
 */
export function verifyWebhookSignature(webhookBody) {
  try {
    const { apiKey, secretKey, merchantId } = getConfig();
    const { data } = webhookBody;
    if (!data || !data.merchantOrderId) {
      return { verified: false, error: 'Invalid webhook data' };
    }

    const orderId = data.merchantOrderId;
    const orderAmount = data.amount?.amount || data.amount;
    const currency = data.currency || 'EGP';

    // Verify with API key
    const expectedHash = generateHash(merchantId, orderId, orderAmount, currency);

    // Check against signature in webhook
    const signature = data.signature || webhookBody.signature;

    if (signature === expectedHash) {
      return { verified: true, data };
    }

    // Also try with secret key
    const path2 = `/?payment=${merchantId}.${orderId}.${orderAmount}.${currency}`;
    const hash2 = crypto
      .createHmac('sha256', secretKey)
      .update(path2)
      .digest('hex');

    if (signature === hash2) {
      return { verified: true, data };
    }

    return { verified: false, error: 'Signature mismatch' };
  } catch (error) {
    return { verified: false, error: error.message };
  }
}

/**
 * Create Kashier payment URL for subscription
 */
export function createPaymentUrl({ orderId, amount, currency, userId, planId, billingCycle, email }) {
  const { merchantId, mode } = getConfig();
  const cur = currency || 'EGP';
  const hash = generateHash(merchantId, orderId, amount, cur);
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const params = new URLSearchParams({
    merchantId: merchantId,
    orderId: orderId,
    amount: amount,
    currency: cur,
    hash: hash,
    mode: mode,
    merchantRedirect: `${frontendUrl}/payment-callback`,
    serverWebhook: `${baseUrl}/api/payment/webhook`,
    display: 'ar',
    metaData: JSON.stringify({
      userId,
      planId,
      billingCycle,
      email,
    }),
  });

  return `https://payments.kashier.io/?${params.toString()}`;
}

/**
 * Check if Kashier is configured
 */
export function isConfigured() {
  const { apiKey, merchantId } = getConfig();
  console.log(`🔍 Checking Kashier Config: API Key present: ${!!apiKey}, Merchant ID present: ${!!merchantId}`);
  if (apiKey) console.log(`🔍 API Key starts with: ${apiKey.substring(0, 4)}...`);
  return !!(apiKey && merchantId);
}
