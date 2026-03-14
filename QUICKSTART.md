# Quick Start: Local Development → Cloud Run

## Local Testing (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Re-authorize Gmail (new scope for delete feature)
npm run auth-gmail

# 3. Test digest locally (should work as before)
npm run dev

# 4. Test HTTP server locally
npm start
# In another terminal:
curl http://localhost:8080/health  # Should return 200
```

## Deploy to Cloud Run (15 minutes)

### Setup (one-time)

```bash
# 1. Set your project
export PROJECT_ID=your-gcp-project
gcloud config set project $PROJECT_ID

# 2. Create Secret Manager secret for Gmail token
gcloud secrets create gmail-token-secret --data-file=credentials/gmail-token.json

# 3. Build and push Docker image
gcloud builds submit --tag gcr.io/$PROJECT_ID/email-agent .

# 4. Get the service account name
export SA_EMAIL=$(gcloud iam service-accounts list --filter="displayName:email-agent" --format="value(email)" || echo "email-agent@$PROJECT_ID.iam.gserviceaccount.com")

# 5. Grant service account access to secret
gcloud secrets add-iam-policy-binding gmail-token-secret \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor"
```

### Deploy

```bash
# Get full secret name
export GMAIL_TOKEN_SECRET=$(gcloud secrets describe gmail-token-secret --format='value(name)')

# Deploy to Cloud Run
gcloud run deploy email-agent \
  --image=gcr.io/$PROJECT_ID/email-agent \
  --region=europe-west1 \
  --memory=256Mi \
  --timeout=3600 \
  --set-env-vars=GMAIL_CLIENT_ID=$GMAIL_CLIENT_ID,\
GMAIL_CLIENT_SECRET=$GMAIL_CLIENT_SECRET,\
GMAIL_REDIRECT_URI=$GMAIL_REDIRECT_URI,\
GMAIL_TOKEN_SECRET_NAME=$GMAIL_TOKEN_SECRET,\
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY,\
TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID,\
TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN,\
TWILIO_WHATSAPP_FROM=$TWILIO_WHATSAPP_FROM,\
TWILIO_WHATSAPP_TO=$TWILIO_WHATSAPP_TO,\
WEBHOOK_URL=https://$(gcloud run services describe email-agent --region=europe-west1 --format='value(status.url)' | cut -d'/' -f3)/webhook \
  --allow-unauthenticated

# Get your service URL
gcloud run services describe email-agent --region=europe-west1 --format='value(status.url)'
```

### Setup Cloud Scheduler & Twilio

```bash
# Create Cloud Scheduler job (daily at 22:00)
gcloud scheduler jobs create http nightly-digest \
  --location=europe-west1 \
  --schedule="0 22 * * *" \
  --time-zone="Europe/Madrid" \
  --uri="https://YOUR-SERVICE-URL/run-digest" \
  --http-method=POST \
  --oidc-service-account-email=$SA_EMAIL \
  --oidc-token-audience="https://YOUR-SERVICE-URL"
```

Then in Twilio Console:
1. Go to Messaging → Services → WhatsApp
2. Set webhook URL: `https://YOUR-SERVICE-URL/webhook`
3. Save

## Test It

```bash
# Test digest endpoint
curl -X POST https://YOUR-SERVICE-URL/run-digest

# Test webhook (send WhatsApp message from your configured number)
# The agent will respond with email commands like:
# "Search emails from marketing"
# "How many unread emails?"
# "Delete emails from newsletter@example.com"

# Check logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=email-agent" --limit=50
```

## What Changed?

- ✅ Scope: `gmail.readonly` → `gmail.modify` (enables delete)
- ✅ New modules: `server.js`, `digest.js`, `agent.js`
- ✅ Token storage: local file + Google Secret Manager
- ✅ HTTP endpoints: `/run-digest` and `/webhook`
- ✅ Interactive agent: Search, count, trash emails via WhatsApp

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Invalid Twilio signature" | Check WEBHOOK_URL env var matches your service URL |
| "Token not found" | Run `npm run auth-gmail` and upload new token to Secret Manager |
| 403 on Secret Manager | Run the `gcloud secrets add-iam-policy-binding` command above |
| Agent not responding | Check Cloud Logs: `gcloud logging read ... --limit=50` |

See `DEPLOYMENT.md` for detailed deployment guide.
