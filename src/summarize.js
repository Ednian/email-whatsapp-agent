import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Summarize emails using Claude
 * @param {Array} emails - Array of {from, subject, body}
 * @returns {Promise<string>} Formatted summary for WhatsApp
 */
export async function summarizeEmails(emails) {
  if (!emails || emails.length === 0) {
    return '📧 No unread emails in the last 24 hours.';
  }

  // Build email context
  const emailList = emails
    .map(
      (email, i) =>
        `[${i + 1}] From: ${email.from}\n    Subject: ${email.subject}\n    Preview: ${email.body.slice(0, 200)}`
    )
    .join('\n\n');

  const prompt = `You are an email summarizer. Analyze these unread emails and provide a concise, WhatsApp-friendly summary.

Emails:
${emailList}

Format your response as:
📧 DAILY EMAIL SUMMARY
==================

🔴 ACTION REQUIRED (if any):
- List emails that need immediate action with brief descriptions

📋 IMPORTANT UPDATES (if any):
- List key informational emails grouped by topic

📌 OTHER EMAILS:
- Brief count and categories of remaining emails

Keep it under 1500 characters. Use emojis. Be concise.`;

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const summary = message.content[0].text;

    // Ensure it fits in WhatsApp message limit
    if (summary.length > 1500) {
      return summary.slice(0, 1497) + '...';
    }

    return summary;
  } catch (err) {
    throw new Error(`Failed to summarize emails: ${err.message}`);
  }
}
