const https = require('https');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

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

  const { planKey, amount } = body;

  if (!planKey || !amount || amount < 100) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid plan or amount' }) };
  }

  const orderData = JSON.stringify({
    amount: amount,
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
