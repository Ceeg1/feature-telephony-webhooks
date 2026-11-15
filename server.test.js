const request = require('supertest');
const app = require('./server');

describe('Telephony Webhook Handler', () => {
  it('should accept valid requests and return TwiML', async () => {
    const response = await request(app)
      .post('/api/webhook/telephony')
      .send({ MessageSid: 'SM12345', From: '+15551234567', Consented: 'true' });
    
    expect(response.status).toBe(200);
    expect(response.text).toContain('<Response>');
  });

  it('should handle idempotency for duplicate event IDs', async () => {
    await request(app)
      .post('/api/webhook/telephony')
      .send({ MessageSid: 'SM_DUPLICATE', From: '+15551234567', Consented: 'true' });

    const response = await request(app)
      .post('/api/webhook/telephony')
      .send({ MessageSid: 'SM_DUPLICATE', From: '+15551234567', Consented: 'true' });

    expect(response.status).toBe(200);
    expect(response.text).toContain('<Response>');
  });
});


