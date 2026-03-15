import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

/**
 * Search for TV series using Gemini (with web search)
 */
export async function searchSeries(query) {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY not set in environment');
  }

  try {
    console.log(`[series] Searching for: "${query}" via Gemini`);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      tools: [
        {
          googleSearch: {},
        },
      ],
    });

    const prompt = `Search for information about the TV series "${query}".
    Provide:
    - Series name
    - Current status (airing, ended, cancelled)
    - Latest/current season number and episode count
    - Premiere date of latest/current season or next season
    - Brief description
    - Any upcoming season information

    Focus on current and accurate information from news and reliable sources.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log(`[series] Gemini response: ${responseText.substring(0, 200)}...`);

    // Parse Gemini response into structured format
    return {
      name: query,
      info: responseText,
      source: 'Gemini Search (Web)',
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
