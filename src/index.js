import fs from 'fs';
import path from 'path';
import { getGmailClient, getUnreadEmails, markAsRead } from './gmail.js';
import { summarizeEmails } from './summarize.js';
import { sendWhatsAppMessage } from './whatsapp.js';
import dotenv from 'dotenv';

dotenv.config();

const LOG_FILE = path.resolve('agent.log');

/**
 * Log message to file with timestamp
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  console.log(logEntry.trim());
  fs.appendFileSync(LOG_FILE, logEntry);
}

/**
 * Main agent function
 */
async function runAgent() {
  try {
    log('🚀 Starting email agent...');

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

    log('✨ Agent completed successfully');
  } catch (err) {
    log(`❌ ERROR: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

runAgent();
