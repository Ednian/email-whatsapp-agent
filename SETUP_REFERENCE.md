# 📋 Setup Reference - Email WhatsApp Agent

Documento de referencia con endpoints y configuración pública.

## 🔗 URLs de Acceso

### Render (Servidor en la nube)
- **URL pública:** https://email-whatsapp-agent-fsjs.onrender.com
- **Health check:** https://email-whatsapp-agent-fsjs.onrender.com/health
- **Digest endpoint:** https://email-whatsapp-agent-fsjs.onrender.com/run-digest
- **Webhook endpoint:** https://email-whatsapp-agent-fsjs.onrender.com/webhook

## 🔐 Configuración de Variables de Entorno

### En Render (Environment Variables)
Todas las credenciales se almacenan en Render. **NO van en el repo.**

Variables requeridas:
- `ANTHROPIC_API_KEY` — Claude API key
- `TWILIO_ACCOUNT_SID` — Twilio account ID
- `TWILIO_AUTH_TOKEN` — Twilio auth token
- `TWILIO_WHATSAPP_FROM` — Twilio WhatsApp number
- `TWILIO_WHATSAPP_TO` — Recipient WhatsApp number
- `GMAIL_CLIENT_ID` — Google OAuth client ID
- `GMAIL_CLIENT_SECRET` — Google OAuth secret
- `GMAIL_REDIRECT_URI` — OAuth redirect URI
- `GMAIL_TOKEN_BASE64` — Gmail token (base64 encoded)
- `REDIS_URL` — Redis connection URL
- `PORT` — Server port

⚠️ **SECURITY:** All secrets are stored in Render, not in version control.

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
