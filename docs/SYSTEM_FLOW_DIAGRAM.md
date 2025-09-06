## ZAPNINJA System Flow Diagram

This document describes the high-level flow and component relationships between Frontend(s), Supabase, and Backend.

```mermaid
graph TD
  %% Frontends
  subgraph FE[Frontends]
    FE1[Next.js Dashboard (apps/frontend)]
    FE2[Next.js Dashboard (zapninja-dashboard)]
    API[Next API routes (/api/sessions/*)]
    RT[Hooks Realtime (use-realtime)]
  end

  %% Supabase
  subgraph SB[Supabase]
    DB[(Postgres)]
    REAL[Realtime]
    RPC[Functions/RPC]
  end

  %% Backend
  subgraph BE[Backend (apps/backend)]
    ML[MainLauncher]
    TD[Terminal Dashboard]
    SC[Session Controller]
    PM[Port Manager]
    SM[Session Manager]
    DS[Database Service]
    AI[AI Services (OpenAI/Gemini)]
    WPP[WPPConnect WhatsApp Client]
    HTTP[Per-session HTTP (/health, /status)]
  end

  %% External
  TOK[Tokens folder per session]
  WA[WhatsApp Network]

  %% Frontend <-> Supabase
  FE1 -->|read/write| DB
  FE2 -->|read/write| DB
  API -->|mutate sessions| DB
  FE1 -->|call| API
  FE2 -->|call| API
  RT -->|subscribe| REAL
  REAL -->|push updates| FE1
  REAL -->|push updates| FE2

  %% Backend wiring
  ML --> TD
  TD --> SC
  SC --> PM
  SC -->|start/stop| WPP
  SM --> DS
  DS --> DB
  WPP -->|inbound/outbound messages| SM
  SM --> AI
  AI --> SM
  SM --> DS
  SC --> HTTP
  FE1 -->|fetch metrics| HTTP
  FE2 -->|fetch metrics| HTTP
  WPP -->|network IO| WA
  WPP -->|persist tokens| TOK

  %% Notes
  note over FE1,FE2: Dashboards list/manage sessions, users, messages, metrics
  note over SB: Source of truth for sessions/users/conversations/messages
  note over BE: Orchestrates sessions, AI, WhatsApp, and exposes health endpoints
```

Key files:

- Frontend: `apps/frontend/src/lib/supabase.ts`, `apps/frontend/src/hooks/use-realtime.ts`, `apps/frontend/src/app/api/sessions/*`
- Backend: `apps/backend/src/main.ts`, `apps/backend/src/dashboard/main-launcher.ts`, `apps/backend/src/dashboard/terminal-dashboard.ts`, `apps/backend/src/dashboard/session-controller.ts`, `apps/backend/src/dashboard/port-manager.ts`, `apps/backend/src/services/session.manager.ts`, `apps/backend/src/services/database.service.ts`, `apps/backend/src/index.ts`
- Docs: see `docs/` for detailed architecture and database schema


