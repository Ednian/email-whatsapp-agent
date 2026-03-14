import dotenv from 'dotenv';
import { runDigest } from './digest.js';

dotenv.config();

/**
 * Local development entrypoint
 * For Cloud Run, use: npm start (which runs src/server.js)
 */
async function main() {
  try {
    await runDigest();
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

main();
