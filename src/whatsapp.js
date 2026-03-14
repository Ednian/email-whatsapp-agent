import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send summary via WhatsApp
 * @param {string} summary - Summary text to send
 * @returns {Promise<string>} Message SID
 */
export async function sendWhatsAppMessage(summary) {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.TWILIO_WHATSAPP_TO;

  if (!from || !to) {
    throw new Error(
      'Missing TWILIO_WHATSAPP_FROM or TWILIO_WHATSAPP_TO in .env'
    );
  }

  return replyToWebhook(to, summary, from);
}

/**
 * Reply to a WhatsApp message (webhook)
 * @param {string} to - Recipient phone number (whatsapp:+1234567890)
 * @param {string} message - Message text to send
 * @param {string} from - Sender number (defaults to TWILIO_WHATSAPP_FROM)
 * @returns {Promise<string>} Message SID
 */
export async function replyToWebhook(to, message, from = null) {
  const fromNumber = from || process.env.TWILIO_WHATSAPP_FROM;

  if (!fromNumber || !to) {
    throw new Error(
      'Missing TWILIO_WHATSAPP_FROM or recipient phone number'
    );
  }

  try {
    // If message is too long, split it
    if (message.length > 1500) {
      const messages = [];
      let remaining = message;

      while (remaining.length > 0) {
        const chunk = remaining.slice(0, 1500);
        messages.push(chunk);
        remaining = remaining.slice(1500);
      }

      // Send all chunks
      const sids = [];
      for (const chunk of messages) {
        const msg = await twilioClient.messages.create({
          from: fromNumber,
          to,
          body: chunk,
        });
        sids.push(msg.sid);
      }

      return sids.join(',');
    }

    // Single message
    const msg = await twilioClient.messages.create({
      from: fromNumber,
      to,
      body: message,
    });

    return msg.sid;
  } catch (err) {
    throw new Error(`Failed to send WhatsApp message: ${err.message}`);
  }
}
