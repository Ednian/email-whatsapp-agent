# Email → WhatsApp Agent 🚀

Automated agent that reads your unread Gmail emails each night, summarizes them using Claude AI, and sends the summary via WhatsApp using Twilio.

## Setup Instructions

### 1. Prerequisites

- **Node.js** 16+ (`node --version`)
- **npm** (comes with Node.js)
- **macOS** (uses `launchd` for scheduling)

### 2. Clone or Create Project

```bash
cd ~/email-whatsapp-agent
npm install
```

### 3. Get Gmail API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., "Email WhatsApp Agent")
3. Enable the **Gmail API**:
   - Click "Enable APIs and Services"
   - Search for "Gmail API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "Credentials" in the left sidebar
   - Click "Create Credentials" → "OAuth client ID"
   - Choose **Desktop app**
   - Download the JSON file
5. Add to `.env`:
   ```bash
   # From the downloaded credentials.json
   GMAIL_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GMAIL_CLIENT_SECRET=your-client-secret-here
   GMAIL_REDIRECT_URI=urn:ietf:wg:oauth:2.0:oob
   ```

### 4. Get Claude API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an API key (or use existing)
3. Add to `.env`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   ```

### 5. Set Up Twilio WhatsApp

1. Create a [Twilio account](https://www.twilio.com)
2. Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Follow the setup wizard to enable WhatsApp Sandbox
4. You'll get a sandbox number (e.g., `whatsapp:+14155238886`)
5. Send the activation message from your phone to the sandbox
6. Get your credentials:
   - **Account SID**: Found on Twilio dashboard
   - **Auth Token**: Found on Twilio dashboard
7. Add to `.env`:
   ```bash
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   TWILIO_WHATSAPP_TO=whatsapp:+34XXXXXXXXX  # Your phone number
   ```

### 6. Authorize Gmail

Run the OAuth setup (one-time only):

```bash
npm run auth-gmail
```

This will:
1. Print a Google authorization URL
2. Open your browser (or manually visit the URL)
3. Grant permission to read Gmail
4. Save the token locally in `credentials/gmail-token.json`

### 7. Test Manually

Test the agent before scheduling:

```bash
npm start
```

Expected output:
- ✅ Connects to Gmail
- ✅ Fetches unread emails
- ✅ Summarizes with Claude
- ✅ Sends WhatsApp message
- ✅ Marks emails as read

Check `agent.log` for detailed logs.

### 8. Schedule with launchd

Install the daily cron job (runs at 22:00 / 10 PM by default):

```bash
npm run install-cron
```

To change the time, edit the `CRON_HOUR` and `CRON_MINUTE` in `.env`:

```bash
CRON_HOUR=22       # 0-23
CRON_MINUTE=0      # 0-59
```

Then reinstall:

```bash
npm run remove-cron
npm run install-cron
```

### 9. Verify Installation

Check that the agent is running:

```bash
# List all scheduled agents
launchctl list | grep emailagent

# View logs
tail -f agent.log
```

### 10. Uninstall

To remove the scheduled agent:

```bash
npm run remove-cron
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_WHATSAPP_TO=whatsapp:+34XXXXXXXXX

# Gmail OAuth
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REDIRECT_URI=urn:ietf:wg:oauth:2.0:oob

# Scheduler
CRON_HOUR=22
CRON_MINUTE=0
```

⚠️ **Never commit `.env` to version control** — it contains credentials!

---

## Project Structure

```
email-whatsapp-agent/
├── src/
│   ├── index.js           # Main orchestrator
│   ├── gmail.js           # Gmail API integration
│   ├── summarize.js       # Claude summarization
│   ├── whatsapp.js        # Twilio WhatsApp sender
│   └── gmail-auth.js      # OAuth setup
├── scripts/
│   ├── install-cron.js    # Install launchd job
│   └── remove-cron.js     # Remove launchd job
├── credentials/
│   └── gmail-token.json   # (Generated after auth)
├── .env                   # Your secrets
├── .env.example           # Template
├── package.json
├── agent.log              # Execution logs
└── README.md
```

---

## How It Works

1. **Each night at 22:00 (10 PM)**:
   - `launchd` automatically runs the agent

2. **The agent**:
   - Connects to Gmail using OAuth2
   - Fetches unread emails from the last 24 hours
   - Passes them to Claude API for summarization
   - Sends the summary via Twilio WhatsApp
   - Marks all emails as read

3. **Logs**:
   - All activity is logged to `agent.log`
   - Timestamps for debugging

---

## Troubleshooting

### Agent doesn't run at scheduled time

1. Check if it's installed:
   ```bash
   launchctl list | grep emailagent
   ```

2. View system logs:
   ```bash
   log stream --level debug --predicate 'process == "launchd"'
   ```

3. Reinstall:
   ```bash
   npm run remove-cron
   npm run install-cron
   ```

### Gmail authorization fails

1. Ensure `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` are correct
2. Re-run authorization:
   ```bash
   rm credentials/gmail-token.json
   npm run auth-gmail
   ```

### WhatsApp message not sent

1. Check Twilio credentials are correct
2. Ensure your phone has joined the WhatsApp Sandbox
3. Check `agent.log` for error details

### No unread emails found

- The agent runs once daily at the scheduled time
- Only emails unread for the last 24 hours are included
- Check Gmail to confirm unread count

---

## Security Notes

- ✅ Credentials stored in `.env` (not in code)
- ✅ Gmail token saved locally (not shared)
- ✅ API calls encrypted (HTTPS)
- ⚠️ Never commit `.env` file
- ⚠️ Rotate API keys periodically

---

## Support

For issues:
1. Check `agent.log` for error details
2. Run `npm start` manually to test
3. Review setup steps above

---

**Made with ❤️ for email sanity**
