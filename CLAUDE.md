# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZAPNINJA is a sophisticated multi-session WhatsApp bot system with AI integration (OpenAI GPT-4 and Google Gemini). Built as a monorepo using pnpm workspaces and Turbo, it enables running multiple concurrent WhatsApp sessions with individual AI context per user. Features include terminal dashboard, Next.js web interface, and comprehensive admin commands.

## Essential Commands

### Development (Monorepo)
```bash
# Install dependencies
pnpm install

# Development (all apps)
pnpm dev                    # Start all apps with hot reload
pnpm dev:backend           # Start only backend
pnpm dev:frontend          # Start only frontend

# Build
pnpm build                 # Build all apps
pnpm build:backend         # Build only backend  
pnpm build:frontend        # Build only frontend

# Production
pnpm start                 # Start all apps (production)

# Testing
pnpm test                  # Run all tests
```

### Database Management
```bash
pnpm db:migrate            # Run pending migrations
pnpm db:status             # Check migration status
pnpm db:rollback           # Rollback last migration
pnpm db:validate           # Validate data integrity
pnpm db:fix                # Run automated fixes
pnpm db:report             # Generate validation report
```

### Code Quality
```bash
# Linting and type checking (all packages)
pnpm lint                  # Lint all packages
pnpm typecheck             # Type check all packages

# Individual packages
turbo run lint --filter=@zapninja/backend
turbo run typecheck --filter=@zapninja/frontend

# Clean builds
pnpm clean                 # Clean all build artifacts
```

**Requirements**: Node.js 18+, pnpm 8+. The project uses Turbo for build orchestration with dependency caching.

## Architecture & Key Concepts

### Monorepo Structure
```
/apps/
  backend/     (@zapninja/backend) - Node.js/Express API
  frontend/    (@zapninja/frontend) - Next.js 15.1 web dashboard
/packages/
  shared/      - Common types, utilities, Zod schemas
  database/    - Migrations, queries, connection management
  ai-services/ - OpenAI/Gemini integration abstractions
  whatsapp-core/ - Session management core logic
  ui-components/ - Shared UI components
```

### Service Layer Architecture (`apps/backend/src/services/`)
- **session.manager.ts**: Multi-session WhatsApp lifecycle management
- **database.service.ts**: PostgreSQL/Supabase operations with connection pooling
- **context-engine.service.ts**: Advanced AI context with sentiment analysis
- **admin-commands.service.ts**: 35+ commands across 6 categories
- **timing.service.ts**: Human-like response delays and typing simulation
- **websocketService.ts**: Real-time dashboard communication

### Multi-Session Management
- **Port Allocation**: Dynamic port assignment for concurrent instances
- **Session States**: initializing → ready → disconnected with auto-recovery
- **Context Isolation**: Individual AI memory per user per session
- **Health Monitoring**: Automatic restart on failures with exponential backoff

### AI Integration Architecture
```typescript
// Dual AI System with Context Engine
Primary: OpenAI GPT-4 Assistants API
Fallback: Google Gemini Pro 1.5
Context: PostgreSQL with relevance scoring and entity extraction
Memory: Persistent conversation history with sentiment analysis
```

### Database Schema (8 Production Tables)
- **whatsapp_sessions**: Multi-session state and AI configuration
- **whatsapp_users**: User profiles with display names and preferences
- **conversations**: Active conversation mapping with context inheritance
- **messages**: Complete message history with metadata and attachments
- **user_context**: Advanced context system with relevance scoring
- **admin_commands**: Command execution audit trail
- **system_metrics**: Performance monitoring and resource tracking
- **learning_data**: AI interaction improvements with feedback loops

## Development Principles

From AI_CODE_GENERATOR v3.3 protocols:
1. **Quality > Organization > Maintainability > Performance > Speed**
2. **One file = one responsibility**
3. **Language separation** (TypeScript, CSS, HTML in separate files)
4. **Context-first approach** - Check `/ai_context/CONTEXT.md` for updates
5. **Automatic documentation** for validated features in `/docs/funcionalidades_confirmadas/`

## Environment Setup

Required environment variables (copy `.env.example` to `.env`):
```bash
# AI Configuration
AI_SELECTED="GPT" | "GEMINI"
OPENAI_KEY=
OPENAI_ASSISTANT=
GEMINI_KEY=
GEMINI_PROMPT=

# Database
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Redis (Optional - for caching)
REDIS_URL=
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=

# Runtime
NODE_ENV=development|production
```

**Environment Inheritance**: Turbo manages global environment variables across all packages (see turbo.json `globalEnv`).

## Key Directories (Monorepo Structure)

- `/apps/backend/` - Backend application (Node.js/TypeScript)
  - `src/` - Core backend logic
  - `database/` - Migrations and DB utilities  
  - `scripts/` - Setup and maintenance scripts
  - `tests/` - Backend tests
- `/apps/frontend/` - Frontend application (Next.js)
  - `src/` - React components and pages
  - `public/` - Static assets
- `/packages/` - Shared packages
  - `shared/` - Common types, utilities, constants
  - `database/` - Database queries and schemas
  - `ai-services/` - AI integrations (OpenAI/Gemini)
  - `whatsapp-core/` - WhatsApp session management
- `/docs/` - Project documentation
- `/ai_context/` - AI context tracking (check CONTEXT.md)
- `/logs/` - Application logs (symlinked in backend)
- `/tokens/` - WhatsApp session data (symlinked in backend)

## Important Context Files

Always check these files for project state:
- `/ai_context/CONTEXT.md` - Current project state and last changes
- `/docs/TECHNICAL_SPECIFICATIONS.md` - Detailed technical specs
- `/docs/DATABASE_SCHEMA.md` - Complete database structure
- `/docs/funcionalidades_confirmadas/` - Validated features

## Testing & Debugging

### Testing Approach
```bash
# Run all tests (defined in turbo.json)
pnpm test

# Backend integration tests (Node.js .cjs files)
cd apps/backend
node test-integration.cjs
node test-message-flow.cjs
```

### Development Tools
- **Hot Reload**: All apps support hot reload in development mode
- **Dashboard**: Access web dashboard at http://localhost:3000 (frontend)
- **API**: Backend runs on configurable ports (default: 3001)
- **Database Tools**: Built-in validation, migration, and reporting commands
- **Logs**: Application logs available in `/logs/` (symlinked in backend)

## Common Development Workflows

### Adding a New Admin Command
1. Add command handler to `apps/backend/src/services/admin-commands.service.ts`
2. Update command categories and help system
3. Add database logging in `admin_commands` table
4. Test via WhatsApp interface

### Implementing New AI Features
1. Update context engine in `context-engine.service.ts`
2. Modify AI service prompts and handlers
3. Run database migration if schema changes needed: `pnpm db:migrate`
4. Document validated features in `/docs/funcionalidades_confirmadas/`

### Working with WhatsApp Sessions
1. Session tokens stored in `/tokens/` (symlinked in backend)
2. Use web dashboard for QR code scanning and session management
3. Session lifecycle managed by `session.manager.ts` service
4. Check session health via admin commands or dashboard

### Working with the Database
1. **Schema Changes**: Create migration files, run `pnpm db:migrate`
2. **Data Validation**: Use `pnpm db:validate` and `pnpm db:report`
3. **Troubleshooting**: Check connection with `pnpm db:status`

### Package Development
When working with shared packages (`/packages/`):
1. Changes are automatically picked up by Turbo's dependency graph
2. TypeScript types are shared via package references
3. Build shared packages first: `turbo run build --filter=@zapninja/shared`

## Key Technical Considerations

- **Performance**: Uses connection pooling, Redis caching, and optimized database queries
- **Security**: Environment variables, input validation, and SQL injection protection
- **Scalability**: Multi-session architecture with health monitoring and auto-recovery
- **Maintainability**: Service layer separation, TypeScript strict mode, comprehensive logging