import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { getGmailClient, searchEmails, trashEmails, getEmailCount } from './gmail.js';

dotenv.config();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const tools = [
  {
    name: 'search_emails',
    description: 'Search for emails in Gmail using a query. Returns up to 20 matching emails with subject, sender, and preview.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Gmail search query (e.g., "from:marketing@example.com", "subject:invoice", "newer_than:7d")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'trash_emails',
    description: 'Move emails to trash/delete them. Accepts a list of message IDs.',
    input_schema: {
      type: 'object',
      properties: {
        message_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of Gmail message IDs to trash',
        },
      },
      required: ['message_ids'],
    },
  },
  {
    name: 'get_email_count',
    description: 'Get the count of emails matching a query without fetching full content. Useful for statistics.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Gmail search query (e.g., "is:unread", "from:specific@email.com")',
        },
      },
      required: ['query'],
    },
  },
];

/**
 * Execute a tool call
 */
async function executeTool(toolName, toolInput, gmail) {
  console.log(`[agent] Executing tool: ${toolName}`, toolInput);

  switch (toolName) {
    case 'search_emails': {
      const emails = await searchEmails(gmail, toolInput.query);
      return {
        count: emails.length,
        emails: emails.map(e => ({
          messageId: e.messageId,
          from: e.from,
          subject: e.subject,
          preview: e.body.slice(0, 100),
        })),
      };
    }

    case 'trash_emails': {
      const count = await trashEmails(gmail, toolInput.message_ids);
      return {
        success: true,
        trashed_count: count,
      };
    }

    case 'get_email_count': {
      const count = await getEmailCount(gmail, toolInput.query);
      return {
        count,
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * Interactive email agent using Claude tool use
 * Receives user message, executes tools, sends response
 */
export async function handleUserMessage(userMessage, userPhoneNumber) {
  console.log(`[agent] Processing message from ${userPhoneNumber}: "${userMessage}"`);

  try {
    // Initialize Gmail client
    const gmail = await getGmailClient(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    // System prompt
    const systemPrompt = `You are a helpful email management assistant accessed via WhatsApp. Your role is to help users manage their Gmail inbox.

The user can ask you to:
- Search for emails (by sender, subject, date range, etc.)
- Delete/trash emails (marketing emails, spam, etc.)
- Get email statistics (count unread, from specific sender, etc.)

You have access to tools to perform these actions. When the user makes a request:
1. Use appropriate tools to help them
2. Respond in the same language as the user
3. Be concise and WhatsApp-friendly (short messages)
4. Confirm actions before executing when appropriate

Always be helpful and clear about what you're doing.`;

    // Build message history with tool use loop
    const messages = [
      {
        role: 'user',
        content: userMessage,
      },
    ];

    let response;
    let maxIterations = 10; // Prevent infinite loops
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      console.log(`[agent] API call iteration ${iteration}`);

      response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        tools,
        messages,
      });

      console.log(`[agent] Response stop_reason: ${response.stop_reason}`);

      // If Claude is done (no more tool calls)
      if (response.stop_reason === 'end_turn') {
        break;
      }

      // If Claude wants to use tools
      if (response.stop_reason === 'tool_use') {
        // Add assistant response to messages
        messages.push({
          role: 'assistant',
          content: response.content,
        });

        // Process each tool use
        const toolResults = [];
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            try {
              const result = await executeTool(block.name, block.input, gmail);
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(result),
              });
            } catch (err) {
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                is_error: true,
                content: err.message,
              });
            }
          }
        }

        // Add tool results to messages
        messages.push({
          role: 'user',
          content: toolResults,
        });
      }
    }

    // Extract final text response
    let finalResponse = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        finalResponse += block.text;
      }
    }

    if (!finalResponse) {
      finalResponse = '✅ Operation completed successfully.';
    }

    console.log(`[agent] Final response: "${finalResponse}"`);
    return finalResponse;
  } catch (err) {
    console.error('[agent] Error:', err);
    const errorMsg = `❌ Sorry, I encountered an error: ${err.message}`;
    return errorMsg;
  }
}
