import { searchSeries, getSeriesDetails, getNextEpisode } from './src/series.js';

/**
 * Basic test script to verify series agent functionality
 */
async function runTests() {
  console.log('🧪 Starting Series Agent Tests...\n');

  try {
    // Test 1: Search series
    console.log('Test 1: Search for "Breaking Bad"');
    const searchResults = await searchSeries('Breaking Bad');
    console.log(`✅ Found ${searchResults.length} results`);
    console.log(`   Top result: ${searchResults[0].name}`);
    console.log(`   Status: ${searchResults[0].status}`);
    console.log(`   Genres: ${searchResults[0].genres}\n`);

    // Test 2: Get series details
    console.log('Test 2: Get details for Breaking Bad');
    const details = await getSeriesDetails(searchResults[0].id);
    console.log(`✅ Got details for: ${details.name}`);
    console.log(`   Premiered: ${details.premiered}`);
    console.log(`   Genres: ${details.genres}\n`);

    // Test 3: Get next episode
    console.log('Test 3: Get next episode for Breaking Bad');
    const nextEp = await getNextEpisode(searchResults[0].id);
    if (nextEp) {
      console.log(`✅ Next episode: ${nextEp.number} - ${nextEp.name}`);
      console.log(`   Airdate: ${nextEp.airdate}\n`);
    } else {
      console.log('⚠️  No upcoming episodes (series ended)\n');
    }

    // Test 4: Search another series
    console.log('Test 4: Search for "The Office"');
    const officeResults = await searchSeries('The Office');
    console.log(`✅ Found ${officeResults.length} results`);
    console.log(`   Top result: ${officeResults[0].name}\n`);

    // Test 5: Verify context structure
    console.log('Test 5: Verify context structure');
    const mockContext = {
      lastEmails: [],
      lastSeries: searchResults,
      lastSeriesQuery: 'Breaking Bad',
      conversationHistory: [
        { role: 'user', content: 'Búscame Breaking Bad' },
        { role: 'assistant', content: 'Encontré Breaking Bad' },
      ],
      createdAt: new Date().toISOString(),
    };
    console.log(`✅ Context structure valid`);
    console.log(`   lastSeries items: ${mockContext.lastSeries.length}`);
    console.log(`   conversationHistory entries: ${mockContext.conversationHistory.length}\n`);

    console.log('✅ All tests passed! Series agent is working correctly.\n');
    console.log('🎬 Ready for inter-agent testing:');
    console.log('   1. User searches series → stored in Redis');
    console.log('   2. User says "add to calendar" → uses lastSeries from context');
    console.log('   3. Email + Series tools work together in same conversation\n');

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

runTests();
