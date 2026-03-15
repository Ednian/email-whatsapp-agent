import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

/**
 * Search for TV series using Gemini (without explicit web search tool)
 */
export async function searchSeries(query) {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY not set in environment');
  }

  try {
    console.log(`[series] Searching for: "${query}" via Gemini`);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });

    const prompt = `Tell me about the TV series "${query}".
Include:
- Current status (airing, ended, cancelled)
- Latest season/episode information
- When the last/next season aired or will air
- Brief description

Be concise and factual.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log(`[series] Gemini response: ${responseText.substring(0, 200)}...`);

    return {
      name: query,
      info: responseText,
      source: 'Gemini',
    };
  } catch (err) {
    console.error('[series] Error searching with Gemini:', err.message);
    throw new Error(`Failed to search series: ${err.message}`);
  }
}

/**
 * Add a series premiere/next episode to Google Calendar
 */
export async function addSeriesToCalendar(calendarClient, seriesName, eventDate) {
  try {
    console.log(`[series] Adding "${seriesName}" to calendar for ${eventDate}`);

    const event = {
      summary: `New episode: ${seriesName}`,
      description: `New episode available on ${eventDate}`,
      start: {
        date: eventDate, // Format: YYYY-MM-DD
      },
      end: {
        date: eventDate,
      },
    };

    const response = await calendarClient.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    console.log(`[series] Event created: ${response.data.htmlLink}`);

    return {
      success: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
    };
  } catch (err) {
    console.error('[series] Error adding to calendar:', err.message);
    throw new Error(`Failed to add to calendar: ${err.message}`);
  }
}
