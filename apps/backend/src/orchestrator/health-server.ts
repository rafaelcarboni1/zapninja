import express from 'express';

export function startHealthServer(): void {
  const app = express();
  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'backend', time: new Date().toISOString() });
  });

  const port = Number(process.env.PORT || process.env.ORCHESTRATOR_PORT || 4000);
  app.listen(port, () => {
    console.log(`✅ Health server listening on http://localhost:${port}/health`);
  });
}


