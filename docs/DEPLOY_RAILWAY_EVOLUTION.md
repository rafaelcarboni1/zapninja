## Deploy na Railway com Evolution API e Postgres

### 1) Provisionar serviços
- PostgreSQL (Railway) → copie o `DATABASE_URL`.
- Redis (opcional) → copie o `REDIS_URL`.
- Evolution API → obtenha `EVOLUTION_API_URL` e `EVOLUTION_API_KEY`.

### 2) Variáveis de ambiente (Backend)
Defina no serviço do Backend (Railway):
```
ORCHESTRATOR_PORT=4000
WHATSAPP_PROVIDER=evolution
EVOLUTION_API_URL=...  
EVOLUTION_API_KEY=...  
DATABASE_URL=...       
REDIS_URL=...          
```
Opcional (se usar Supabase como store):
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### 3) Build & Start (Railway)
- Build Command: `pnpm --filter @zapninja/backend build`
- Start Command: `pnpm --filter @zapninja/backend orchestrator`

### 4) Frontend (Railway)
- Variáveis:
```
NEXT_PUBLIC_ORCHESTRATOR_URL=https://<domain>/  # se expor o backend publicamente
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
- Build: `pnpm --filter @zapninja/frontend build`
- Start: `pnpm --filter @zapninja/frontend start`

### 5) Teste
1. Acesse `/health` do orquestrador (porta 4000).  
2. Use o Dashboard para iniciar uma sessão.  
3. Verifique logs do backend e status da sessão.

### 6) Segurança
- Restrinja `EVOLUTION_API_KEY` e variáveis sensíveis em Railway.  
- Se expor o orquestrador, proteja com auth proxy ou network restrito.  
- Use SSL (Railway já entrega HTTPS nos domínios gerenciados).


