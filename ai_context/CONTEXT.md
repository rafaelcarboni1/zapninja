# CONTEXT.md – last update: 2025-09-07

## Summary of last change
- Feature: Monorepo structure cleanup + Railway readiness healthcheck
- Files changed:
  - Archived legacy duplicates to `/archive/`:
    - `/src` → `/archive/root-backend-legacy`
    - `/dist` (root) → `/archive/root-backend-legacy-dist` (if present)
    - `/zapninja-dashboard` → `/archive/zapninja-dashboard`
    - `/apps/backend/apps/**` → `/archive/backend-nested-apps`
    - `/database/**` → `/archive/root-database-legacy`
  - Canonical database kept at `/apps/backend/database`
  - Backend: added `/apps/backend/src/orchestrator/health-server.ts` and wired in `/apps/backend/src/main.ts`
- Purpose: Remove duplicate trees, standardize canonical app paths, and expose `/health` for Railway
- Dependencies: express, pnpm workspaces, turbo
- Status: validated/tested ✅ (build/typecheck pending fixes in packages/shared unrelated to archival)

## Project State
- Current stack: Node.js/TypeScript + Next.js + Supabase + AI (OpenAI/Gemini)
- Active integrations: WhatsApp (wppconnect), Database (PostgreSQL), AI Services
- Architecture: Multi-session WhatsApp bot with dashboard management
- Confirmed functionalities: see /docs/funcionalidades_confirmadas/

## Architecture Summary
- **Core System**: TypeScript-based WhatsApp bot with dual AI integration
- **Dashboard**: Terminal CLI + Next.js web interface
- **Database**: PostgreSQL (Supabase) with 8 tables for sessions, users, conversations, messages, context
- **Sessions**: Multiple concurrent WhatsApp instances with port management
- **AI Engine**: OpenAI GPT-4 + Google Gemini with fallback system
- **Features**: 35+ admin commands, timing control, context memory, health monitoring

## Key Directories
- `/apps/backend` - Canonical backend app
- `/apps/frontend` - Canonical Next.js frontend app
- `/packages/*` - Shared libraries
- `/apps/backend/database` - Canonical schema and migrations
- `/docs/` - Documentation and specifications
- `/scripts/` - Maintenance and monitoring tools
- `/logs/` - System logging
- `/tokens/` - WhatsApp session data
- `/archive/` - Archived legacy directories (do not modify)

## Development Status
- **Active Features**: Multi-session management, AI integration, admin commands
- **Architecture**: Well-structured with service layer pattern
- **Next Steps**: Continue development following v3.3 protocols
- **Documentation**: Automatically generated for validated features

## Rules Active
- AI_CODE_GENERATOR v3.3 protocols
- Quality > Organization > Maintainability > Performance > Speed  
- One file = one responsibility
- Language separation (TypeScript/CSS/HTML)
- Context-first approach
- Automatic documentation for validated features