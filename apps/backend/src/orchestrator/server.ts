import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { sessionController } from '../dashboard/session-controller';
import { portManager } from '../dashboard/port-manager';
import { evolutionClient } from '../services/whatsapp/evolution.client';
import { databaseService } from '../services/database.service';
import { SessionManager } from '../services/session.manager';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const sessionManager = new SessionManager();

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'orchestrator', time: new Date().toISOString() });
});

app.post('/sessions/start', async (req, res) => {
  try {
    const { sessionName } = req.body || {};
    if (!sessionName) return res.status(400).json({ error: 'sessionName is required' });
    const port = await portManager.getAvailablePort(3002);
    const ok = await sessionController.launchSession(sessionName, port);
    return res.status(ok ? 200 : 500).json({ ok, port });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'internal_error' });
  }
});

app.post('/sessions/stop', async (req, res) => {
  try {
    const { sessionName } = req.body || {};
    if (!sessionName) return res.status(400).json({ error: 'sessionName is required' });
    const ok = await sessionController.stopSession(sessionName);
    return res.status(ok ? 200 : 500).json({ ok });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'internal_error' });
  }
});

app.post('/sessions/restart', async (req, res) => {
  try {
    const { sessionName } = req.body || {};
    if (!sessionName) return res.status(400).json({ error: 'sessionName is required' });
    const ok = await sessionController.restartSession(sessionName);
    return res.status(ok ? 200 : 500).json({ ok });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'internal_error' });
  }
});

// Evolution API endpoints
app.post('/evolution/instances', async (req, res) => {
  try {
    const { sessionName } = req.body || {};
    if (!sessionName) return res.status(400).json({ error: 'sessionName is required' });
    // Alguns provedores criam instância on-demand; aqui apenas retornamos ok=true
    return res.json({ ok: true, sessionName });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'internal_error' });
  }
});

app.get('/evolution/instances/:sessionName/qr', async (req, res) => {
  try {
    const { sessionName } = req.params;
    if (!sessionName) return res.status(400).json({ error: 'sessionName is required' });
    const qr = await evolutionClient.getQrCode(sessionName);
    if (!qr) return res.status(502).json({ error: 'qr_unavailable' });
    return res.json({ qrCode: qr.base64, sessionName });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'internal_error' });
  }
});

app.get('/evolution/instances/:sessionName/status', async (req, res) => {
  try {
    const { sessionName } = req.params;
    if (!sessionName) return res.status(400).json({ error: 'sessionName is required' });
    const status = await evolutionClient.status(sessionName);
    return res.json({ sessionName, status });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'internal_error' });
  }
});

app.post('/evolution/webhook', async (req, res) => {
  try {
    const token = req.headers['x-evolution-token'] || req.query.token;
    if (!process.env.EVOLUTION_WEBHOOK_TOKEN) {
      return res.status(500).json({ error: 'webhook_token_not_configured' });
    }
    if (token !== process.env.EVOLUTION_WEBHOOK_TOKEN) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const body = req.body || {};
    const eventType = body?.event || body?.type || 'message';
    const sessionName = body?.instance || body?.session || body?.sessionName;

    if (!sessionName) {
      return res.status(400).json({ error: 'missing_session' });
    }

    // Mensagem recebida
    if (eventType === 'message' && body?.data) {
      const from = (body.data.from || '').replace(/[^0-9]/g, '');
      const content = body.data?.message?.text || body.data?.body || body.data?.message || '';

      if (from && content) {
        // Garante usuário e conversa
        await databaseService.upsertUser({
          phone_number: from,
          is_active: true,
          profile_data: {},
          preferences: {},
          name: '',
          display_name: ''
        } as any);

        const conversation = await databaseService.getActiveConversation(from, sessionName)
          || await databaseService.createConversation({
            session_id: (await databaseService.getSession(sessionName))?.id as string,
            user_id: (await databaseService.getUserByPhone(from, sessionName))?.id as string,
            conversation_data: {},
            context_summary: '',
            last_interaction: new Date().toISOString()
          } as any);

        if (conversation?.id) {
          await databaseService.saveMessage({
            conversation_id: conversation.id,
            sender_type: 'user',
            content,
            message_type: 'text',
            metadata: body.data
          });
          await databaseService.updateConversationInteraction(conversation.id);
        }
      }
    }

    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'internal_error' });
  }
});

app.get('/sessions', async (_req, res) => {
  try {
    const running = sessionController.getRunningProcesses();
    res.json({ running });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'internal_error' });
  }
});

// Bind to service PORT to satisfy Railway healthcheck
const PORT = Number(process.env.PORT || process.env.ORCHESTRATOR_PORT || 4000);
app.listen(PORT, () => {
  console.log(`✅ Orchestrator listening on http://localhost:${PORT}`);
});


