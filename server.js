const express = require('express');
const twilio = require('twilio');
require('dotenv').config();

const app = express();

// Use express.urlencoded because Twilio sends form-encoded payloads
app.use(express.urlencoded({ extended: false }));

// In-memory idempotency store (key: Event/Message ID)
const processedEvents = new Set();

app.post('/api/webhook/telephony', (req, res) => {
  const twilioSignature = req.headers['x-twilio-signature'];
  const eventId = req.body.MessageSid || req.body.EventId || 'unknown-id';
  const rawPhone = req.body.From || '0000000000';
  const redactedPhone = `***-***-${rawPhone.slice(-4)}`;

  // 1. Log event ID, status, and redacted phone (No PII or tokens)
  console.log(`Event ID: ${eventId} | Status: Received | Phone: ${redactedPhone}`);

  // 2. Idempotency check: prevent duplicate processing on retries
  if (processedEvents.has(eventId)) {
    console.log(`Duplicate event detected: ${eventId}. Skipping.`);
    return res.type('text/xml').send('<Response></Response>');
  }

  // 3. Signature verification (skip if simulator mode / environment flag is enabled for testing)
  const isSimulator = process.env.SIMULATOR_MODE === 'true';
  if (!isSimulator) {
    const publicUrl = process.env.PUBLIC_CALLBACK_URL || 'https://your-domain.com/api/webhook/telephony';
    const isValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      twilioSignature,
      publicUrl,
      req.body
    );

    if (!isValid) {
      console.warn(`Invalid signature for event: ${eventId}`);
      return res.status(403).send('Forbidden: Invalid signature');
    }
  }

  // Mark event as processed
  processedEvents.add(eventId);

  // 4. Consent and environment flag check for outbound SMS
  const outboundEnabled = process.env.ENABLE_OUTBOUND_SMS === 'true';
  const userConsented = req.body.Consented === 'true';

  if (outboundEnabled && userConsented) {
    // Outbound SMS logic would go here
    console.log(`Outbound SMS sent for event: ${eventId}`);
  } else {
    console.log(`Outbound SMS skipped (Flag: ${outboundEnabled}, Consent: ${userConsented})`);
  }

  // 5. Return minimal valid TwiML response
  res.type('text/xml');
  res.send('<Response></Response>');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

