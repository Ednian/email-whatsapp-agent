# 📋 Setup Reference - Email WhatsApp Agent

Documento de referencia con todos los servicios y credenciales configuradas.

## 🔗 URLs y Accesos

### GitHub
- **Repo:** https://github.com/Ednian/email-whatsapp-agent
- **Username:** Ednian
- **Acceso:** Personal (token guardado en .env local)

### Render (Servidor en la nube)
- **URL pública:** https://email-whatsapp-agent-fsjs.onrender.com
- **Health check:** https://email-whatsapp-agent-fsjs.onrender.com/health
- **Digest endpoint:** https://email-whatsapp-agent-fsjs.onrender.com/run-digest
- **Webhook endpoint:** https://email-whatsapp-agent-fsjs.onrender.com/webhook
- **Dashboard:** https://dashboard.render.com
- **Status:** Live y activo

### Google Cloud
- **Proyecto:** email-whatsapp-agent-489620
- **Gmail API:** Habilitada
- **Secret Manager:** gmail-token-secret (contiene token de Gmail)
- **Console:** https://console.cloud.google.com

### Twilio
- **Console:** https://console.twilio.com
- **WhatsApp Webhook URL:** https://email-whatsapp-agent-fsjs.onrender.com/webhook
- **Nota:** Credenciales almacenadas en variables de entorno de Render

### Anthropic (Claude API)
- **Model:** claude-opus-4-6
- **Dashboard:** https://console.anthropic.com
- **Nota:** API Key almacenada en variables de entorno de Render

---

## 🔐 Variables de Entorno

### En Render (Environment Variables)
- `ANTHROPIC_API_KEY` — Clave Claude API
- `TWILIO_ACCOUNT_SID` — ID de cuenta Twilio
- `TWILIO_AUTH_TOKEN` — Token de autenticación Twilio
- `TWILIO_WHATSAPP_FROM` — Número WhatsApp de Twilio
- `TWILIO_WHATSAPP_TO` — Tu número WhatsApp personal
- `GMAIL_CLIENT_ID` — ID cliente OAuth Google
- `GMAIL_CLIENT_SECRET` — Secret OAuth Google
- `GMAIL_REDIRECT_URI` — URI de redirección OAuth
- `GMAIL_TOKEN_BASE64` — Token de Gmail en base64
- `PORT=10000` — Puerto del servidor

⚠️ **IMPORTANTE:** Las credenciales están guardadas en Render. NO van en el repo.

### En GitHub (Secrets)
- **RENDER_DIGEST_URL:** Webhook URL de Render para GitHub Actions

---

## 📅 Automatización

### GitHub Actions
- **Workflow:** `.github/workflows/nightly-digest.yml`
- **Trigger:** Cada día a las 20:00 UTC (= 22:00 Madrid en invierno, 21:00 en verano)
- **Acción:** Llama a `/run-digest` en Render
- **Resultado:** Te llega WhatsApp con resumen a las 22:00

---

## 🎯 Funcionalidades Activas

### Agente Interactivo (WhatsApp)
- **Comando:** Cualquier mensaje por WhatsApp
- **Acciones:**
  - `Busca emails de marketing` → Busca y lista
  - `Elimina todos los no leídos` → Borra automáticamente
  - `¿Cuántos emails tengo?` → Cuenta y reporta
  - `Borra emails de X remitente` → Elimina específicos

### Digest Automático (22:00 cada día)
- **Trigger:** GitHub Actions programado
- **Contenido:** Resumen de emails sin leer del día
- **Entrega:** WhatsApp en +34609865449

---

## 🛠️ Mantenimiento

### Monitorear Logs
- **Render:** https://dashboard.render.com → email-whatsapp-agent → Logs
- **GitHub Actions:** https://github.com/Ednian/email-whatsapp-agent → Actions

### Actualizar Secretos
- **GitHub Token:** Agregado en `.env` local (NO en repo)
- **Gmail Token:** Actualizar `GMAIL_TOKEN_BASE64` en Render si expira
- **Twilio Credentials:** Cambiar en Render variables

### Desplegar Cambios
```bash
git add .
git commit -m "descripción"
git push origin main
# Render redeploy automático en ~2 minutos
```

---

## 📌 Checklist de Acceso

- [ ] Puedo acceder a GitHub (Ednian)
- [ ] Puedo acceder a Render dashboard
- [ ] Puedo acceder a Twilio console
- [ ] Recibo WhatsApps en +34609865449
- [ ] A las 22:00 recibo el digest automático
- [ ] El agente responde a mis comandos

---

## 🚀 Próximas Ideas

- Audio en WhatsApp (speech-to-text)
- Multi-plataforma (Slack, Teams, Discord)
- Dashboard de estadísticas
- Automatización de reglas
- Monetizar como SaaS

---

**Última actualización:** 14/03/2026
**Estado:** ✅ Producción activa
