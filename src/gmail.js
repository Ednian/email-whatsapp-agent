import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
const TOKEN_PATH = path.resolve('credentials/gmail-token.json');
const CREDENTIALS_PATH = path.resolve('credentials/gmail-credentials.json');

const secretManagerClient = new SecretManagerServiceClient();

/**
 * Load token from Secret Manager or file (fallback)
 */
async function loadSavedToken() {
  // Try Secret Manager first (Cloud Run environment)
  if (process.env.GMAIL_TOKEN_SECRET_NAME) {
    try {
      const secretName = process.env.GMAIL_TOKEN_SECRET_NAME;
      const [version] = await secretManagerClient.accessSecretVersion({
        name: secretName,
      });
      return JSON.parse(version.payload.data.toString('utf8'));
    } catch (err) {
      console.warn('Failed to load token from Secret Manager:', err.message);
    }
  }

  // Fallback to file (local development)
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading saved token:', err.message);
  }
  return null;
}

/**
 * Save token to file and optionally to Secret Manager
 */
async function saveToken(token) {
  // Always save to file for local development
  try {
    fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
    console.log('Token saved to', TOKEN_PATH);
  } catch (err) {
    console.warn('Failed to save token to file:', err.message);
  }

  // Try to save to Secret Manager if configured
  if (process.env.GMAIL_TOKEN_SECRET_NAME) {
    try {
      const secretName = process.env.GMAIL_TOKEN_SECRET_NAME;
      await secretManagerClient.addSecretVersion({
        parent: secretName.substring(0, secretName.lastIndexOf('/')),
        payload: {
          data: Buffer.from(JSON.stringify(token)),
        },
      });
      console.log('Token saved to Secret Manager');
    } catch (err) {
      console.warn('Failed to save token to Secret Manager:', err.message);
    }
  }
}

/**
 * Create OAuth2 client
 */
export function createAuthClient(clientId, clientSecret, redirectUri) {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Get authorization URL for user to visit
 */
export function getAuthorizationUrl(auth) {
  return auth.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokenFromCode(auth, code) {
  const { tokens } = await auth.getToken(code);
  saveToken(tokens);
  return tokens;
}

/**
 * Get authenticated Gmail client (with saved token or new auth)
 */
export async function getGmailClient(clientId, clientSecret, redirectUri) {
  const auth = createAuthClient(clientId, clientSecret, redirectUri);

  // Try to load saved token
  const savedToken = await loadSavedToken();
  if (savedToken) {
    auth.setCredentials(savedToken);
    return google.gmail({ version: 'v1', auth });
  }

  throw new Error('No saved token found. Run gmail-auth.js first to authorize.');
}

/**
 * Fetch unread emails from last 24 hours
 */
export async function getUnreadEmails(gmail) {
  try {
    // Search for unread emails from last 24 hours
    const searchRes = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread newer_than:1d',
      maxResults: 20,
    });

    const messages = searchRes.data.messages || [];

    if (messages.length === 0) {
      return [];
    }

    // Fetch full details for each message
    const emails = await Promise.all(
      messages.map(msg =>
        gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        })
      )
    );

    return emails.map(email => {
      const headers = email.data.payload.headers;
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
      const subject = headers.find(h => h.name === 'Subject')?.value || '(No subject)';

      // Extract body (handle both plain text and HTML)
      let body = '';
      if (email.data.payload.parts) {
        const textPart = email.data.payload.parts.find(
          p => p.mimeType === 'text/plain'
        );
        if (textPart && textPart.body.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf8');
        }
      } else if (email.data.payload.body.data) {
        body = Buffer.from(email.data.payload.body.data, 'base64').toString('utf8');
      }

      return {
        from,
        subject,
        body: body.slice(0, 500), // Limit to 500 chars
        messageId: email.data.id,
      };
    });
  } catch (err) {
    throw new Error(`Failed to fetch emails: ${err.message}`);
  }
}

/**
 * Mark email as read
 */
export async function markAsRead(gmail, messageId) {
  try {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });
  } catch (err) {
    console.warn(`Failed to mark message ${messageId} as read:`, err.message);
  }
}

/**
 * Search emails by query (used by agent for interactive commands)
 * @param {Object} gmail - Gmail client
 * @param {string} query - Gmail search query (e.g., "from:marketing@example.com")
 * @returns {Promise<Array>} Array of {from, subject, body, messageId}
 */
export async function searchEmails(gmail, query) {
  try {
    const searchRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 20,
    });

    const messages = searchRes.data.messages || [];

    if (messages.length === 0) {
      return [];
    }

    // Fetch full details for each message
    const emails = await Promise.all(
      messages.map(msg =>
        gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        })
      )
    );

    return emails.map(email => {
      const headers = email.data.payload.headers;
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
      const subject = headers.find(h => h.name === 'Subject')?.value || '(No subject)';

      // Extract body
      let body = '';
      if (email.data.payload.parts) {
        const textPart = email.data.payload.parts.find(
          p => p.mimeType === 'text/plain'
        );
        if (textPart && textPart.body.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf8');
        }
      } else if (email.data.payload.body.data) {
        body = Buffer.from(email.data.payload.body.data, 'base64').toString('utf8');
      }

      return {
        from,
        subject,
        body: body.slice(0, 500),
        messageId: email.data.id,
      };
    });
  } catch (err) {
    throw new Error(`Failed to search emails: ${err.message}`);
  }
}

/**
 * Get count of emails matching query (without fetching full content)
 * @param {Object} gmail - Gmail client
 * @param {string} query - Gmail search query
 * @returns {Promise<number>} Count of matching emails
 */
export async function getEmailCount(gmail, query) {
  try {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 1,
    });
    return res.data.resultSizeEstimate || 0;
  } catch (err) {
    throw new Error(`Failed to get email count: ${err.message}`);
  }
}

/**
 * Trash email (move to trash)
 * @param {Object} gmail - Gmail client
 * @param {string} messageId - Email message ID
 */
export async function trashEmail(gmail, messageId) {
  try {
    await gmail.users.messages.trash({
      userId: 'me',
      id: messageId,
    });
  } catch (err) {
    throw new Error(`Failed to trash message ${messageId}: ${err.message}`);
  }
}

/**
 * Trash multiple emails
 * @param {Object} gmail - Gmail client
 * @param {Array<string>} messageIds - Email message IDs
 * @returns {Promise<number>} Count of successfully trashed emails
 */
export async function trashEmails(gmail, messageIds) {
  let successCount = 0;
  for (const messageId of messageIds) {
    try {
      await trashEmail(gmail, messageId);
      successCount++;
    } catch (err) {
      console.warn(`Failed to trash ${messageId}:`, err.message);
    }
  }
  return successCount;
}
