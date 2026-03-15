import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const TVMAZE_BASE_URL = 'https://api.tvmaze.com';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

/**
 * Search for TV series on TVMaze
 */
async function searchSeriesTVMaze(query) {
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
        source: 'TVMaze',
      };
    });
  } catch (err) {
    console.error('[series] Error searching TVMaze:', err.message);
    return [];
  }
}

/**
 * Search for TV series on TMDB
 */
async function searchSeriesTMDB(query) {
  if (!TMDB_API_KEY) {
    console.warn('[series] TMDB_API_KEY not set, skipping TMDB search');
    return [];
  }

  try {
    console.log(`[series] Searching TMDB for: "${query}"`);

    const response = await axios.get(`${TMDB_BASE_URL}/search/tv`, {
      params: {
        api_key: TMDB_API_KEY,
        query,
        language: 'es',
      },
    });

    if (!response.data.results || response.data.results.length === 0) {
      return [];
    }

    // Return top 5 results with relevant info
    return response.data.results.slice(0, 5).map(show => {
      return {
        id: show.id,
        name: show.name,
        premiered: show.first_air_date || 'N/A',
        status: show.in_production ? 'Running' : 'Ended',
        genres: show.genre_ids.join(', ') || 'N/A',
        summary: show.overview ? show.overview.slice(0, 150) : 'No summary',
        image: show.poster_path ? `https://image.tmdb.org/t/p/w200${show.poster_path}` : null,
        rating: show.vote_average || 'N/A',
        source: 'TMDB',
      };
    });
  } catch (err) {
    console.error('[series] Error searching TMDB:', err.message);
    return [];
  }
}

/**
 * Search for TV series on multiple sources and return combined results
 */
export async function searchSeries(query) {
  try {
    console.log(`[series] Searching for: "${query}" (TVMaze + TMDB)`);

    const [tvmazeResults, tmdbResults] = await Promise.all([
      searchSeriesTVMaze(query),
      searchSeriesTMDB(query),
    ]);

    // Combine results, prioritizing exact matches
    const combined = [...tmdbResults, ...tvmazeResults];

    // Deduplicate by name (fuzzy match)
    const seen = new Set();
    const unique = combined.filter(show => {
      const key = show.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[series] Found ${unique.length} unique series (TMDB: ${tmdbResults.length}, TVMaze: ${tvmazeResults.length})`);
    return unique.slice(0, 5);
  } catch (err) {
    console.error('[series] Error searching series:', err.message);
    throw new Error(`Failed to search series: ${err.message}`);
  }
}

/**
 * Get detailed info about a series by ID from TVMaze
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
 * Get detailed info about a series from TMDB (including seasons)
 */
export async function getSeriesDetailsTMDB(seriesId) {
  if (!TMDB_API_KEY) {
    return null;
  }

  try {
    console.log(`[series] Fetching TMDB details for series ID: ${seriesId}`);

    const response = await axios.get(`${TMDB_BASE_URL}/tv/${seriesId}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'es',
      },
    });

    const show = response.data;
    const latestSeason = show.seasons ? show.seasons[show.seasons.length - 1] : null;

    return {
      id: show.id,
      name: show.name,
      premiered: show.first_air_date || 'N/A',
      status: show.status || 'N/A',
      genres: show.genres?.map(g => g.name).join(', ') || 'N/A',
      summary: show.overview || 'No summary',
      totalSeasons: show.number_of_seasons,
      totalEpisodes: show.number_of_episodes,
      latestSeason: latestSeason ? {
        seasonNumber: latestSeason.season_number,
        episodeCount: latestSeason.episode_count,
        airDate: latestSeason.air_date || 'TBA',
      } : null,
      rating: show.vote_average,
    };
  } catch (err) {
    console.error('[series] Error getting TMDB series details:', err.message);
    return null;
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
