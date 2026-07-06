const crypto = require('crypto');

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const PLANS = {
  basic:    { price: 199 },
  standard: { price: 499 },
  premium:  { price: 999 },
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planKey } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planKey) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };
  }

  if (!PLANS[planKey]) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid plan' }) };
  }

  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Signature mismatch — payment not verified' })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ verified: true, planKey, payment_id: razorpay_payment_id })
  };
};
