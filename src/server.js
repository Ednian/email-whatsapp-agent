import express from 'express';
import twilio from 'twilio';
import { validateRequest } from 'twilio/lib/webhooks/webhooks.js';
import dotenv from 'dotenv';
import { runDigest } from './digest.js';
import { handleUserMessage } from './agent.js';
import { replyToWebhook } from './whatsapp.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * POST /run-digest
 * Called by Cloud Scheduler to run the nightly email digest
 */
app.post('/run-digest', async (req, res) => {
  console.log('[server] Digest endpoint called');

  // Return 200 immediately to Cloud Scheduler
  res.status(200).json({ status: 'digest started' });

  // Run digest in background
  try {
    await runDigest();
    console.log('[server] Digest completed successfully');
  } catch (err) {
    console.error('[server] Digest failed:', err);
  }
});

/**
 * Validate Twilio webhook signature
 */
function validateTwilioSignature(req, url) {
  // Skip validation in development if no TWILIO_AUTH_TOKEN
  if (!process.env.TWILIO_AUTH_TOKEN) {
    console.log('[server] Skipping Twilio signature validation (no auth token in env)');
    return true;
  }

  const twilioSignature = req.get('X-Twilio-Signature') || '';
  const auth = validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    twilioSignature,
    url,
    req.body
  );

  return auth;
}

/**
 * POST /webhook
 * Called by Twilio when a user sends a WhatsApp message
 */
app.post('/webhook', async (req, res) => {
  console.log('[server] Webhook called');

  // Validate Twilio signature
  const webhookUrl = `${process.env.WEBHOOK_URL || 'https://localhost:8080'}/webhook`;
  const isValid = validateTwilioSignature(req, webhookUrl);

  if (!isValid) {
    console.warn('[server] Invalid Twilio signature');
    return res.status(403).json({ error: 'Invalid signature' });
  }

  const incomingMessage = req.body.Body;
  const fromPhoneNumber = req.body.From;

  console.log(`[server] Message from ${fromPhoneNumber}: "${incomingMessage}"`);

  // Return 200 immediately to Twilio (avoid timeout)
  // Twilio expects a response within 15 seconds
  res.status(200).json({ status: 'webhook received' });

  // Process message in background (fire and forget)
  setImmediate(async () => {
    try {
      // Get agent response
      const agentResponse = await handleUserMessage(incomingMessage, fromPhoneNumber);

      // Send response back via WhatsApp
      console.log(`[server] Sending response to ${fromPhoneNumber}`);
      await replyToWebhook(fromPhoneNumber, agentResponse);

      console.log('[server] Response sent successfully');
    } catch (err) {
      console.error('[server] Failed to process webhook:', err.message || err);

      // Try to send error message back to user
      try {
        await replyToWebhook(
          fromPhoneNumber,
          '❌ Sorry, I encountered an error processing your request. Please try again.'
        );
      } catch (sendErr) {
        console.error('[server] Failed to send error message:', sendErr.message || sendErr);
      }
    }
  });
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

/**
 * Error handlers
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('[server] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught Exception:', err);
  process.exit(1);
});

/**
 * Start server
 */
app.listen(port, () => {
  console.log(`[server] Server running on port ${port}`);
  console.log(`[server] /run-digest endpoint: POST http://localhost:${port}/run-digest`);
  console.log(`[server] /webhook endpoint: POST http://localhost:${port}/webhook`);
  console.log(`[server] /health endpoint: GET http://localhost:${port}/health`);
});
