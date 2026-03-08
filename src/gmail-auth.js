import fs from 'fs';
import path from 'path';
import readline from 'readline';
import {
  createAuthClient,
  getAuthorizationUrl,
  getTokenFromCode,
} from './gmail.js';
import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI;

async function authorize() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error(
      'Error: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in .env'
    );
    console.error('Get these from Google Cloud Console:');
    console.error('1. Create project in Google Cloud Console');
    console.error('2. Enable Gmail API');
    console.error('3. Create OAuth 2.0 credentials (Desktop app)');
    console.error('4. Download and save the credentials JSON');
    process.exit(1);
  }

  const auth = createAuthClient(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  const authUrl = getAuthorizationUrl(auth);

  console.log('\n📧 Gmail OAuth Setup');
  console.log('===================\n');
  console.log('1. Open this URL in your browser:');
  console.log(authUrl);
  console.log('\n2. Authorize the application');
  console.log('3. Copy the authorization code from the browser\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Paste the authorization code here: ', async (code) => {
      rl.close();

      try {
        await getTokenFromCode(auth, code);
        console.log('\n✅ Authorization successful!');
        console.log('Token saved. You can now run: npm start');
        resolve();
      } catch (err) {
        console.error('\n❌ Authorization failed:', err.message);
        process.exit(1);
      }
    });
  });
}

authorize();
