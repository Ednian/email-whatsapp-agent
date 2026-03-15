import axios from 'axios';

const TVMAZE_BASE_URL = 'https://api.tvmaze.com';

/**
 * Search for TV series on TVMaze
 */
export async function searchSeries(query) {
  try {
    console.log(`[series] Searching TVMaze for: "${query}"`);

    const response = await axios.get(`${TVMAZE_BASE_URL}/search/shows`, {
      params: { q: query },
    });

    if (!response.data || response.data.length === 0) {
      return [];
    }

    // Return top 5 results with relevant info
    return response.data.slice(0, 5).map(item => {
      const show = item.show;
      return {
        id: show.id,
        name: show.name,
        premiered: show.premiered || 'N/A',
        status: show.status || 'N/A',
        genres: show.genres.join(', ') || 'N/A',
        summary: show.summary ? show.summary.replace(/<[^>]*>/g, '').slice(0, 150) : 'No summary',
        image: show.image?.medium || null,
      };
    });
  } catch (err) {
    console.error('[series] Error searching TVMaze:', err.message);
    throw new Error(`Failed to search series: ${err.message}`);
  }
}

/**
 * Get detailed info about a series by ID
 */
export async function getSeriesDetails(seriesId) {
  try {
    console.log(`[series] Fetching details for series ID: ${seriesId}`);

    const response = await axios.get(`${TVMAZE_BASE_URL}/shows/${seriesId}`);
    const show = response.data;

    return {
      id: show.id,
      name: show.name,
      premiered: show.premiered || 'N/A',
      status: show.status || 'N/A',
      genres: show.genres.join(', ') || 'N/A',
      summary: show.summary ? show.summary.replace(/<[^>]*>/g, '') : 'No summary',
      officialSite: show.officialSite || 'N/A',
    };
  } catch (err) {
    console.error('[series] Error getting series details:', err.message);
    throw new Error(`Failed to get series details: ${err.message}`);
  }
}

/**
 * Get next episode for a series
 */
export async function getNextEpisode(seriesId) {
  try {
    console.log(`[series] Fetching next episode for series ID: ${seriesId}`);

    const response = await axios.get(`${TVMAZE_BASE_URL}/shows/${seriesId}/nextepisode`);
    const episode = response.data;

    return {
      number: `S${String(episode.season).padStart(2, '0')}E${String(episode.number).padStart(2, '0')}`,
      name: episode.name,
      airdate: episode.airdate || 'TBA',
      airtime: episode.airtime || 'TBA',
      summary: episode.summary ? episode.summary.replace(/<[^>]*>/g, '') : 'No summary',
    };
  } catch (err) {
    // No next episode is not really an error
    console.log('[series] No next episode info available');
    return null;
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
