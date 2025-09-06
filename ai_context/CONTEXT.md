# CONTEXT.md – last update: 2025-09-05

## Summary of last change
- Feature: Database migration system + Monorepo architecture setup
- Files changed: 
  - /database/migrations/ (created migration system)
  - /database/migrationManager.ts, /database/migrate.ts
  - /database/dataValidator.ts, /database/validate.ts
  - /packages/shared/, /packages/database/, /packages/ai-services/, /packages/whatsapp-core/
  - /package.json (added database scripts)
  - /turbo.json (updated for monorepo)
- Purpose: Implement automated database management and prepare monorepo structure
- Dependencies: @supabase/supabase-js, pnpm workspaces, turbo
- Status: Phase 1 completed ✅, Phase 2 in progress 🚧

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
- `/src/` - Core backend logic
- `/zapninja-dashboard/` - Next.js frontend
- `/docs/` - Documentation and specifications
- `/database/` - Schema and migrations
- `/scripts/` - Maintenance and monitoring tools
- `/logs/` - System logging
- `/tokens/` - WhatsApp session data

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