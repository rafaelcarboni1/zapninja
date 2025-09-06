import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { sessionController } from '../dashboard/session-controller';
import { portManager } from '../dashboard/port-manager';

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

app.get('/sessions', async (_req, res) => {
  try {
    const running = sessionController.getRunningProcesses();
    res.json({ running });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'internal_error' });
  }
});

const PORT = Number(process.env.ORCHESTRATOR_PORT || 4000);
app.listen(PORT, () => {
  console.log(`✅ Orchestrator listening on http://localhost:${PORT}`);
});


