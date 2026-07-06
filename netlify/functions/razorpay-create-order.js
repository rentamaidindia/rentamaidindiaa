const https = require('https');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const PLANS = {
  basic:    { price: 100   },  // ₹1
  standard: { price: 4900  },  // ₹49
  premium:  { price: 9900  },  // ₹99
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let planKey;
  try {
    planKey = JSON.parse(event.body).planKey;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  if (!planKey || !PLANS[planKey]) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid plan' }) };
  }

  const amountPaise = PLANS[planKey].price;

  const orderData = JSON.stringify({
    amount: amountPaise,
    currency: 'INR',
    receipt: 'rcpt_' + Date.now(),
    notes: { plan_key: planKey }
  });

  const credentials = Buffer.from(RAZORPAY_KEY_ID + ':' + RAZORPAY_KEY_SECRET).toString('base64');

  try {
    const order = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.razorpay.com',
        path: '/v1/orders',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + credentials,
          'Content-Length': Buffer.byteLength(orderData)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          const parsed = JSON.parse(body);
          if (res.statusCode !== 200) reject(new Error(parsed.error?.description || 'Order failed'));
          else resolve(parsed);
        });
      });
      req.on('error', reject);
      req.write(orderData);
      req.end();
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency
      })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
