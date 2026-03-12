const axios = require('axios');
const crypto = require('crypto');

// Kashier API Configuration
const KASHIER_API_KEY = process.env.KASHIER_API_KEY;
const KASHIER_MERCHANT_ID = process.env.KASHIER_MERCHANT_ID;
const KASHIER_SECRET_KEY = process.env.KASHIER_SECRET_KEY;
const KASHIER_BASE_URL = 'https://checkout.kashier.io';

// Validate configuration on module load
if (!KASHIER_API_KEY) {
    console.warn('⚠️  WARNING: KASHIER_API_KEY is not set in environment variables');
}
if (!KASHIER_MERCHANT_ID) {
    console.warn('⚠️  WARNING: KASHIER_MERCHANT_ID is not set in environment variables');
}
if (!KASHIER_SECRET_KEY) {
    console.warn('⚠️  WARNING: KASHIER_SECRET_KEY is not set in environment variables');
}

/**
 * Create a payment order with Kashier
 * @param {Object} planData - Plan information (planType, price, name, credits)
 * @param {Object} userData - User information (userId, email, fullName, phone)
 * @returns {Object} Payment result with checkout URL
 */
async function createPayment(planData, userData) {
    try {
        // Check if credentials are configured
        if (!KASHIER_API_KEY || !KASHIER_MERCHANT_ID) {
            throw new Error('Kashier credentials are not configured in .env file');
        }

        console.log('🔐 Creating Kashier payment...');
        console.log('   Plan:', planData.name);
        console.log('   Amount:', planData.price, 'EGP');
        console.log('   Mode:', process.env.KASHIER_MODE || 'test');
        console.log('   Merchant ID:', KASHIER_MERCHANT_ID);
        console.log('   API Key:', KASHIER_API_KEY ? KASHIER_API_KEY.substring(0, 10) + '...' : 'NOT SET');

        // Generate unique order ID
        const merchantOrderId = `ORDER_${Date.now()}_${userData.userId}`;
        
        // Get the base URL from environment or use default
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        
        // Kashier iframe uses the actual amount in EGP, not cents
        const amount = planData.price.toString(); // e.g., "240"
        const currency = 'EGP';
        
        // Optional: Customer reference for card saving (can be user ID)
        // TEMPORARILY DISABLED - Testing without customer reference
        const customerReference = '';
        
        // Generate hash signature using HMAC SHA256 (Kashier's official method)
        // IMPORTANT: Use API_KEY as the secret (not SECRET_KEY)
        // Path format: /?payment=merchantId.orderId.amount.currency[.customerReference]
        const path = `/?payment=${KASHIER_MERCHANT_ID}.${merchantOrderId}.${amount}.${currency}${customerReference ? '.' + customerReference : ''}`;
        const hash = crypto.createHmac('sha256', KASHIER_API_KEY).update(path).digest('hex');
        
        console.log('🔑 Hash Details:');
        console.log('   Path:', path);
        console.log('   Hash:', hash);
        console.log('   Customer Ref:', customerReference || 'none');

        console.log('📤 Preparing Kashier iframe data...');

        // Prepare data for Kashier's official iframe
        const kashierData = {
            amount: amount,
            hash: hash,
            currency: currency,
            orderId: merchantOrderId,
            merchantId: KASHIER_MERCHANT_ID,
            merchantRedirect: `${baseUrl}/payment-callback?order_id=${merchantOrderId}`,
            serverWebhook: `${baseUrl}/api/payment/callback`,
            mode: process.env.KASHIER_MODE || 'test',
            // Customer reference disabled for testing
            // ...(customerReference && { customerReference: customerReference }),
            metaData: JSON.stringify({
                email: userData.email,
                name: userData.fullName,
                planName: planData.name,
                credits: planData.credits
            })
        };

        console.log('✅ Kashier iframe data prepared');
        console.log('   Order ID:', merchantOrderId);
        console.log('   Amount:', amount, 'EGP');

        return {
            success: true,
            kashierData: kashierData,
            orderId: merchantOrderId,
            merchantOrderId: merchantOrderId,
            kashierOrderId: merchantOrderId
        };
    } catch (error) {
        console.error('❌ Kashier payment error:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.error('   Invalid API key - please check your KASHIER_API_KEY in .env');
        }
        
        return {
            success: false,
            error: error.response?.data?.message || error.message || 'Failed to create payment with Kashier'
        };
    }
}

/**
 * Generate hash signature for Kashier order (HMAC SHA256)
 * Uses API_KEY as the secret according to Kashier official docs
 * @param {string} merchantId - Merchant ID
 * @param {string} orderId - Order ID
 * @param {string} amount - Amount in EGP
 * @param {string} currency - Currency code
 * @param {string} customerReference - Optional customer reference for card saving
 * @returns {string} Hash signature
 */
function generateHash(merchantId, orderId, amount, currency, customerReference = '') {
    // Kashier official hash format: /?payment=merchantId.orderId.amount.currency[.customerReference]
    const path = `/?payment=${merchantId}.${orderId}.${amount}.${currency}${customerReference ? '.' + customerReference : ''}`;
    
    // IMPORTANT: Use API_KEY as the secret (not SECRET_KEY)
    return crypto
        .createHmac('sha256', KASHIER_API_KEY)
        .update(path)
        .digest('hex');
}

/**
 * Verify webhook/redirect signature from Kashier (HMAC SHA256)
 * According to Kashier docs, signature is generated from all query params except 'signature' and 'mode'
 * @param {Object} query - Query parameters from webhook/redirect
 * @returns {boolean} True if signature is valid
 */
function verifyWebhookSignature(query) {
    try {
        if (!query.signature) {
            console.error('❌ No signature in webhook data');
            return false;
        }
        
        // Build query string from all parameters except 'signature' and 'mode'
        let queryString = '';
        for (let key in query) {
            if (key === 'signature' || key === 'mode') continue;
            queryString += '&' + key + '=' + query[key];
        }
        
        // Remove leading '&'
        const finalUrl = queryString.substr(1);
        
        // Calculate signature using HMAC SHA256
        // IMPORTANT: Use API_KEY as the secret (not SECRET_KEY)
        const calculatedSignature = crypto
            .createHmac('sha256', KASHIER_API_KEY)
            .update(finalUrl)
            .digest('hex');

        const isValid = calculatedSignature === query.signature;
        
        if (!isValid) {
            console.error('❌ Webhook signature verification failed');
            console.error('   Calculated:', calculatedSignature);
            console.error('   Received:', query.signature);
            console.error('   Query string:', finalUrl);
        } else {
            console.log('✅ Webhook signature verified');
        }

        return isValid;
    } catch (error) {
        console.error('❌ Error verifying webhook signature:', error);
        return false;
    }
}

/**
 * Verify transaction status with Kashier API
 * @param {string} orderId - Order ID to verify
 * @returns {Object} Transaction status
 */
async function verifyTransaction(orderId) {
    try {
        const response = await axios.get(
            `${KASHIER_BASE_URL}/transaction/${orderId}`,
            {
                headers: {
                    'Authorization': `Bearer ${KASHIER_API_KEY}`
                }
            }
        );

        if (response.data && response.data.status === 'success') {
            return {
                success: true,
                data: response.data.data
            };
        }

        return {
            success: false,
            error: 'Transaction not found'
        };
    } catch (error) {
        console.error('Error verifying transaction:', error.response?.data || error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    createPayment,
    verifyWebhookSignature,
    verifyTransaction,
    generateHash
};
