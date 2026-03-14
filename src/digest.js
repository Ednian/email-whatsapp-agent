import { getGmailClient, getUnreadEmails, markAsRead } from './gmail.js';
import { summarizeEmails } from './summarize.js';
import { sendWhatsAppMessage } from './whatsapp.js';

/**
 * Log message with timestamp (Cloud Run logs to Cloud Logging)
 */
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

/**
 * Main email digest pipeline (runs nightly)
 * Fetches unread emails, summarizes with Claude, sends via WhatsApp
 */
export async function runDigest() {
  try {
    log('🚀 Starting email digest...');

    // 1. Connect to Gmail
    log('📧 Connecting to Gmail...');
    const gmail = await getGmailClient(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    // 2. Fetch unread emails
    log('📨 Fetching unread emails...');
    const emails = await getUnreadEmails(gmail);
    log(`✅ Found ${emails.length} unread emails`);

    if (emails.length === 0) {
      log('ℹ️  No unread emails to summarize');
      return;
    }

    // 3. Summarize with Claude
    log('🤖 Summarizing with Claude...');
    const summary = await summarizeEmails(emails);
    log(`✅ Summary generated (${summary.length} chars)`);

    // 4. Send via WhatsApp
    log('💬 Sending to WhatsApp...');
    const messageSid = await sendWhatsAppMessage(summary);
    log(`✅ WhatsApp message sent: ${messageSid}`);

    // 5. Mark emails as read
    log('✔️  Marking emails as read...');
    for (const email of emails) {
      await markAsRead(gmail, email.messageId);
    }
    log(`✅ Marked ${emails.length} emails as read`);

    log('✨ Digest completed successfully');
  } catch (err) {
    log(`❌ ERROR: ${err.message}`);
    console.error(err);
    throw err;
  }
}
