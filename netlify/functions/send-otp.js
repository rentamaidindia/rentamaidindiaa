exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { phone, otp } = JSON.parse(event.body || '{}');

    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid phone number' }) };
    }
    if (!otp || !/^\d{4,6}$/.test(otp)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid OTP' }) };
    }

    const apiKey = process.env.FAST2SMS_API_KEY;
    const url = 'https://www.fast2sms.com/dev/bulkV2?authorization=' + apiKey +
      '&route=otp&variables_values=' + otp + '&flash=0&numbers=' + phone;

    const resp = await fetch(url);
    const data = await resp.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: data.return === true, raw: data })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
