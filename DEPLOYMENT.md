# Cloud Run Deployment Guide

This guide walks through migrating the email-to-WhatsApp agent from local launchd to Google Cloud Run with an interactive WhatsApp agent.

## Architecture Overview

The application now runs as a single Cloud Run service with two HTTP endpoints:

- **`POST /run-digest`** — Called by Cloud Scheduler at 22:00 (nightly email digest)
- **`POST /webhook`** — Called by Twilio when the user sends a WhatsApp message (interactive agent)

Both endpoints return immediately to avoid timeouts and process in the background.

## Prerequisites

1. Google Cloud Project with billing enabled
2. Gmail API enabled with OAuth 2.0 credentials
3. Twilio account with WhatsApp sandbox or production setup
4. gcloud CLI installed and authenticated
5. Docker installed locally (for building the image)

## Step-by-Step Deployment

### 1. Re-authorize Gmail with New Scope

The application now requires `gmail.modify` scope (instead of `gmail.readonly`) to support the delete/trash feature.

```bash
npm run auth-gmail
```

This will:
- Open your browser for Gmail OAuth
- Save the new token to `credentials/gmail-token.json`
- The token includes both read and modify permissions

### 2. Set Up Google Secret Manager

Store sensitive credentials in Google Secret Manager:

```bash
# Create a secret for the Gmail token
gcloud secrets create gmail-token-secret --data-file=credentials/gmail-token.json

# Verify it was created
gcloud secrets list
```

Get the full secret resource name (you'll need this later):
```bash
gcloud secrets describe gmail-token-secret --format='value(name)'
# Output: projects/YOUR_PROJECT_ID/secrets/gmail-token-secret/versions/latest
```

### 3. Build and Push Docker Image

```bash
# Set your project ID
export PROJECT_ID=$(gcloud config get-value project)

# Build the image
gcloud builds submit --tag gcr.io/${PROJECT_ID}/email-agent .

# Or build locally:
docker build -t gcr.io/${PROJECT_ID}/email-agent .
docker push gcr.io/${PROJECT_ID}/email-agent
```

### 4. Deploy to Cloud Run

```bash
export PROJECT_ID=$(gcloud config get-value project)
export GMAIL_TOKEN_SECRET="projects/${PROJECT_ID}/secrets/gmail-token-secret/versions/latest"

gcloud run deploy email-agent \
  --image=gcr.io/${PROJECT_ID}/email-agent \
  --platform=managed \
  --region=europe-west1 \
  --memory=256Mi \
  --cpu=1 \
  --timeout=3600 \
  --set-env-vars="\
GMAIL_CLIENT_ID=${GMAIL_CLIENT_ID},\
GMAIL_CLIENT_SECRET=${GMAIL_CLIENT_SECRET},\
GMAIL_REDIRECT_URI=${GMAIL_REDIRECT_URI},\
GMAIL_TOKEN_SECRET_NAME=${GMAIL_TOKEN_SECRET},\
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY},\
TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID},\
TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN},\
TWILIO_WHATSAPP_FROM=${TWILIO_WHATSAPP_FROM},\
TWILIO_WHATSAPP_TO=${TWILIO_WHATSAPP_TO},\
WEBHOOK_URL=https://YOUR-SERVICE-URL/webhook" \
  --allow-unauthenticated
```

Get your service URL after deployment:
```bash
gcloud run services describe email-agent --region=europe-west1 --format='value(status.url)'
```

### 5. Grant Cloud Run Service Access to Secret Manager

The Cloud Run service needs permission to read the Gmail token secret:

```bash
export PROJECT_ID=$(gcloud config get-value project)
export SERVICE_ACCOUNT="email-agent@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant the service account permission to access secrets
gcloud secrets add-iam-policy-binding gmail-token-secret \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

### 6. Set Up Cloud Scheduler

Create a job to trigger the digest at 22:00 every day:

```bash
gcloud scheduler jobs create http nightly-digest \
  --location=europe-west1 \
  --schedule="0 22 * * *" \
  --time-zone="Europe/Madrid" \
  --uri="https://YOUR-SERVICE-URL/run-digest" \
  --http-method=POST \
  --oidc-service-account-email="email-agent@${PROJECT_ID}.iam.gserviceaccount.com" \
  --oidc-token-audience="https://YOUR-SERVICE-URL"
```

### 7. Configure Twilio Webhook

In your Twilio console, set the webhook URL for incoming WhatsApp messages:

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to Messaging → Services → WhatsApp
3. Set the webhook URL for incoming messages:
   ```
   https://YOUR-SERVICE-URL/webhook
   ```
4. Method: POST
5. Save

### 8. Test the Deployment

**Test the digest endpoint:**
```bash
curl -X POST https://YOUR-SERVICE-URL/run-digest
```

**Test the webhook endpoint:**
```bash
# This requires proper Twilio signature validation
# Send a WhatsApp message from your configured number
```

**Test the health check:**
```bash
curl https://YOUR-SERVICE-URL/health
```

## Environment Variables

| Variable | Source | Description |
|---|---|---|
| `GMAIL_CLIENT_ID` | .env / Cloud Run | Gmail OAuth client ID |
| `GMAIL_CLIENT_SECRET` | .env / Cloud Run | Gmail OAuth client secret |
| `GMAIL_REDIRECT_URI` | .env / Cloud Run | OAuth redirect URI |
| `GMAIL_TOKEN_SECRET_NAME` | Cloud Run only | Secret Manager secret name |
| `ANTHROPIC_API_KEY` | Cloud Run | Claude API key |
| `TWILIO_ACCOUNT_SID` | Cloud Run | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Cloud Run | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | Cloud Run | Twilio WhatsApp number |
| `TWILIO_WHATSAPP_TO` | Cloud Run | Your WhatsApp number (for digest) |
| `WEBHOOK_URL` | Cloud Run | Public URL of the service (for Twilio validation) |
| `PORT` | Cloud Run (default: 8080) | HTTP port |

## Local Development

For local development, use the old launchd setup or run the dev server:

```bash
# Run one-time digest
npm run dev

# Run interactive server locally (for testing webhooks)
npm start
# Then use ngrok or similar to expose locally: ngrok http 8080
```

## Files Changed/Created

### Modified Files
- `package.json` — Added Express and Secret Manager dependencies
- `src/gmail.js` — Added Secret Manager integration, new functions (`searchEmails`, `getEmailCount`, `trashEmails`)
- `src/whatsapp.js` — Added `replyToWebhook()` function
- `src/index.js` — Refactored to use new digest module

### New Files
- `src/server.js` — Express entrypoint with `/run-digest` and `/webhook` routes
- `src/digest.js` — Extracted nightly digest pipeline
- `src/agent.js` — Interactive email agent with Claude tool use
- `Dockerfile` — Container image definition
- `.dockerignore` — Build ignore file
- `DEPLOYMENT.md` — This file

## Monitoring and Logging

Cloud Run automatically logs to Cloud Logging. View logs:

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=email-agent" \
  --limit 100 --format json | jq '.'
```

Or in the Cloud Console: [Cloud Run → Services → email-agent → Logs](https://console.cloud.google.com/run)

## Troubleshooting

### 403 Unauthorized on Secret Manager
- Ensure the Cloud Run service account has `roles/secretmanager.secretAccessor` role
- Check: `gcloud secrets get-iam-policy gmail-token-secret`

### Twilio webhook not working
- Verify the webhook URL is correct in Twilio console
- Check Cloud Run logs for signature validation errors
- Ensure `WEBHOOK_URL` env var matches the public service URL

### Token refresh failures
- The token may have expired and need re-authorization
- Run `npm run auth-gmail` locally to get a fresh token
- Update the Secret Manager secret: `gcloud secrets versions add gmail-token-secret --data-file=credentials/gmail-token.json`

## Rollback

To revert to local launchd:

```bash
# Uninstall Cloud Run setup
gcloud run services delete email-agent --region=europe-west1

# Reinstall launchd cron
npm run install-cron

# Run local digest
npm run dev
```
