import fs from 'fs';
import path from 'path';
import http from 'http';
import url from 'url';
import { exec } from 'child_process';
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

function openBrowser(authUrl) {
  if (process.platform === 'darwin') {
    exec(`open "${authUrl}"`);
  } else if (process.platform === 'linux') {
    exec(`xdg-open "${authUrl}"`);
  } else if (process.platform === 'win32') {
    exec(`start "${authUrl}"`);
  }
}

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
  console.log('1. A local server is starting on http://localhost:3000');
  console.log('2. Your browser will open automatically\n');

  // Create a simple HTTP server to receive the callback
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);

    if (parsedUrl.pathname === '/auth/callback') {
      const code = parsedUrl.query.code;
      const error = parsedUrl.query.error;

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>❌ Authorization Failed</h1><p>Error: ${error}</p>`);
        console.error('\n❌ Authorization failed:', error);
        server.close();
        process.exit(1);
      }

      if (code) {
        try {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(
            '<h1>✅ Authorization successful!</h1><p>You can close this window. Setting up your credentials...</p>'
          );

          await getTokenFromCode(auth, code);
          console.log('\n✅ Authorization successful!');
          console.log('Token saved. You can now run: npm start');

          server.close();
          process.exit(0);
        } catch (err) {
          console.error('\n❌ Token exchange failed:', err.message);
          res.writeHead(400);
          res.end(`<h1>❌ Error</h1><p>${err.message}</p>`);
          server.close();
          process.exit(1);
        }
      }
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(3000, () => {
    console.log('Opening browser...\n');
    openBrowser(authUrl);
  });

  // Timeout after 5 minutes
  setTimeout(() => {
    console.error('\n⏱️  Authorization timeout');
    server.close();
    process.exit(1);
  }, 5 * 60 * 1000);
}

authorize();
