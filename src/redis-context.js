import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient = null;
let isConnected = false;

/**
 * Initialize Redis connection
 */
async function initRedis() {
  if (isConnected && redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    redisClient = createClient({ url: redisUrl });

    redisClient.on('error', (err) => {
      console.error('[redis] Error:', err);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('[redis] Connected');
      isConnected = true;
    });

    await redisClient.connect();
    return redisClient;
  } catch (err) {
    console.error('[redis] Failed to connect:', err);
    throw err;
  }
}

/**
 * Get user context from Redis
 * Returns: { lastEmails, conversationHistory, lastSeries }
 */
export async function getUserContext(userPhoneNumber) {
  try {
    const client = await initRedis();
    const contextKey = `user:${userPhoneNumber}:context`;
    const contextData = await client.get(contextKey);

    if (contextData) {
      const parsed = JSON.parse(contextData);
      console.log(`[redis] Loaded context for ${userPhoneNumber}`);
      return parsed;
    }

    // Default empty context
    return {
      lastEmails: [],
      conversationHistory: [],
      lastSeries: [],
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[redis] Error getting context:', err);
    // Return default context on error (graceful degradation)
    return {
      lastEmails: [],
      conversationHistory: [],
      lastSeries: [],
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Save user context to Redis with 24h TTL
 */
export async function saveUserContext(userPhoneNumber, context) {
  try {
    const client = await initRedis();
    const contextKey = `user:${userPhoneNumber}:context`;
    const contextData = JSON.stringify(context);

    // Set with 24h TTL (86400 seconds)
    await client.setEx(contextKey, 86400, contextData);

    console.log(`[redis] Saved context for ${userPhoneNumber}`);
  } catch (err) {
    console.error('[redis] Error saving context:', err);
    // Don't throw - let the agent continue even if Redis fails
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis() {
  if (redisClient && isConnected) {
    await redisClient.disconnect();
    isConnected = false;
    console.log('[redis] Disconnected');
  }
}
