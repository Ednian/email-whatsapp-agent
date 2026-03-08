import twilio from 'twilio';

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

  try {
    // If message is too long, split it
    if (summary.length > 1500) {
      const messages = [];
      let remaining = summary;

      while (remaining.length > 0) {
        const chunk = remaining.slice(0, 1500);
        messages.push(chunk);
        remaining = remaining.slice(1500);
      }

      // Send all chunks
      const sids = [];
      for (const chunk of messages) {
        const msg = await twilioClient.messages.create({
          from,
          to,
          body: chunk,
        });
        sids.push(msg.sid);
      }

      return sids.join(',');
    }

    // Single message
    const message = await twilioClient.messages.create({
      from,
      to,
      body: summary,
    });

    return message.sid;
  } catch (err) {
    throw new Error(`Failed to send WhatsApp message: ${err.message}`);
  }
}
