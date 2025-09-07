import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { sessionController } from '../dashboard/session-controller';
import { portManager } from '../dashboard/port-manager';
import { evolutionClient } from '../services/whatsapp/evolution.client';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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


