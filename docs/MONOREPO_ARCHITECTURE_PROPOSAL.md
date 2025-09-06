# ZAPNINJA - Proposta de Arquitetura Monorepo

## 🎯 Visão Geral da Migração

Esta proposta apresenta a migração do ZAPNINJA atual para uma arquitetura monorepo moderna, separando claramente backend e frontend, melhorando a escalabilidade, manutenibilidade e experiência de desenvolvimento.

### Benefícios da Migração para Monorepo

- **🔄 Separação Clara**: Backend/Frontend isolados
- **📦 Compartilhamento de Código**: Types, utils, configs compartilhados
- **🚀 Deploy Independente**: Deploy separado para cada aplicação
- **👥 Desenvolvimento Paralelo**: Times podem trabalhar independentemente
- **🔧 Tooling Unificado**: Linting, testing, build system centralizado
- **📊 Escalabilidade**: Cada serviço pode escalar independentemente

---

## 🏗️ Estrutura Proposta do Monorepo

```
zapninja-monorepo/
├── apps/
│   ├── backend/                 # API + WhatsApp Bot Core
│   │   ├── src/
│   │   │   ├── api/            # REST API Routes
│   │   │   ├── bot/            # WhatsApp Bot Core
│   │   │   ├── services/       # Business Logic
│   │   │   └── workers/        # Background Jobs
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web-dashboard/          # Next.js Dashboard
│   │   ├── src/
│   │   │   ├── app/            # App Router
│   │   │   ├── components/     # UI Components
│   │   │   └── hooks/          # React Hooks
│   │   ├── package.json
│   │   └── next.config.ts
│   │
│   ├── mobile-app/             # React Native (Futuro)
│   │   ├── src/
│   │   ├── package.json
│   │   └── metro.config.js
│   │
│   └── admin-cli/              # CLI Tools
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/                   # Código Compartilhado
│   ├── shared/
│   │   ├── types/              # TypeScript Types
│   │   ├── constants/          # Constantes compartilhadas
│   │   ├── utils/              # Utilitários
│   │   └── validators/         # Validações
│   │
│   ├── database/
│   │   ├── src/
│   │   │   ├── client.ts       # Cliente Supabase
│   │   │   ├── schemas/        # Schemas de validação
│   │   │   ├── migrations/     # SQL Migrations
│   │   │   └── queries/        # Queries tipadas
│   │   └── package.json
│   │
│   ├── ai-services/
│   │   ├── src/
│   │   │   ├── openai/         # OpenAI Integration
│   │   │   ├── gemini/         # Google Gemini
│   │   │   ├── types/          # IA Types
│   │   │   └── utils/          # IA Utils
│   │   └── package.json
│   │
│   ├── whatsapp-core/
│   │   ├── src/
│   │   │   ├── client/         # WPP Connect wrapper
│   │   │   ├── handlers/       # Message handlers
│   │   │   ├── middleware/     # WhatsApp middleware
│   │   │   └── types/          # WhatsApp types
│   │   └── package.json
│   │
│   └── ui-components/          # Design System
│       ├── src/
│       │   ├── components/     # Reusable components
│       │   ├── styles/         # Shared styles
│       │   ├── icons/          # Custom icons
│       │   └── themes/         # Themes
│       └── package.json
│
├── tools/                      # Build tools e scripts
│   ├── eslint/                 # ESLint configs
│   ├── typescript/             # TS configs
│   ├── build/                  # Build scripts
│   └── testing/                # Test configs
│
├── docs/                       # Documentação
├── scripts/                    # Scripts utilitários
├── .github/                    # GitHub Actions
├── package.json                # Root package.json
├── turbo.json                  # Turborepo config
├── tsconfig.json               # Root TS config
├── .eslintrc.js               # Root ESLint
└── README.md
```

---

## 📦 Definição dos Packages

### 1. Backend App (`apps/backend`)

**Responsabilidades:**
- API REST para o dashboard
- Core do WhatsApp Bot
- Websockets para real-time
- Background jobs
- Authentication & Authorization

**Estrutura Detalhada:**
```
apps/backend/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── sessions.ts      # CRUD sessões
│   │   │   ├── users.ts         # CRUD usuários
│   │   │   ├── conversations.ts # Conversas
│   │   │   ├── messages.ts      # Mensagens
│   │   │   └── metrics.ts       # Analytics
│   │   ├── middleware/
│   │   │   ├── auth.ts          # Autenticação
│   │   │   ├── cors.ts          # CORS config
│   │   │   └── rateLimit.ts     # Rate limiting
│   │   └── server.ts            # Express server
│   │
│   ├── bot/
│   │   ├── core/
│   │   │   ├── session-manager.ts
│   │   │   ├── message-processor.ts
│   │   │   └── command-handler.ts
│   │   ├── handlers/
│   │   │   ├── text.handler.ts
│   │   │   ├── media.handler.ts
│   │   │   └── admin.handler.ts
│   │   └── services/
│   │       ├── context.service.ts
│   │       ├── timing.service.ts
│   │       └── response.service.ts
│   │
│   ├── workers/
│   │   ├── message-queue.worker.ts
│   │   ├── analytics.worker.ts
│   │   └── cleanup.worker.ts
│   │
│   └── main.ts
│
├── Dockerfile
├── package.json
└── tsconfig.json
```

**Principais Dependencies:**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.4",
    "bull": "^4.12.2",
    "ioredis": "^5.3.2",
    "@zapninja/shared": "workspace:*",
    "@zapninja/database": "workspace:*",
    "@zapninja/ai-services": "workspace:*",
    "@zapninja/whatsapp-core": "workspace:*"
  }
}
```

### 2. Web Dashboard (`apps/web-dashboard`)

**Responsabilidades:**
- Interface administrativa
- Monitoramento em tempo real
- Gestão de sessões e usuários
- Analytics e relatórios

**Estrutura Detalhada:**
```
apps/web-dashboard/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx          # Dashboard principal
│   │   │   ├── sessions/
│   │   │   │   ├── page.tsx      # Lista sessões
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx  # Detalhes sessão
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx # Editar sessão
│   │   │   ├── conversations/
│   │   │   ├── analytics/
│   │   │   └── settings/
│   │   ├── api/                  # API Routes (Next.js)
│   │   ├── globals.css
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── metrics-cards.tsx
│   │   │   ├── session-status.tsx
│   │   │   └── real-time-chart.tsx
│   │   ├── forms/
│   │   │   ├── session-form.tsx
│   │   │   └── prompt-editor.tsx
│   │   └── layout/
│   │       ├── sidebar.tsx
│   │       └── header.tsx
│   │
│   ├── hooks/
│   │   ├── use-websocket.ts
│   │   ├── use-sessions.ts
│   │   └── use-real-time.ts
│   │
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── websocket.ts
│   │   └── utils.ts
│   │
│   └── styles/
│
├── public/
├── next.config.ts
├── package.json
└── tsconfig.json
```

**Principais Dependencies:**
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.2.0",
    "socket.io-client": "^4.7.4",
    "@tanstack/react-query": "^5.8.4",
    "recharts": "^2.8.0",
    "@zapninja/shared": "workspace:*",
    "@zapninja/ui-components": "workspace:*"
  }
}
```

### 3. Shared Package (`packages/shared`)

**Responsabilidades:**
- TypeScript types compartilhados
- Constantes globais
- Utilitários comuns
- Validações

**Estrutura:**
```
packages/shared/
├── src/
│   ├── types/
│   │   ├── api.types.ts         # API request/response types
│   │   ├── database.types.ts    # Database entities
│   │   ├── whatsapp.types.ts    # WhatsApp related types
│   │   ├── ai.types.ts          # IA service types
│   │   └── index.ts
│   │
│   ├── constants/
│   │   ├── app.constants.ts     # App constants
│   │   ├── api.constants.ts     # API endpoints
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── date.utils.ts        # Date utilities
│   │   ├── string.utils.ts      # String utilities
│   │   ├── validation.utils.ts  # Validation helpers
│   │   └── index.ts
│   │
│   └── validators/
│       ├── session.validators.ts
│       ├── user.validators.ts
│       └── index.ts
│
├── package.json
└── tsconfig.json
```

### 4. Database Package (`packages/database`)

**Responsabilidades:**
- Cliente Supabase configurado
- Queries tipadas
- Migrations
- Schemas de validação

**Estrutura:**
```
packages/database/
├── src/
│   ├── client.ts               # Supabase client
│   ├── types.ts                # Generated types
│   │
│   ├── queries/
│   │   ├── sessions.queries.ts # Session queries
│   │   ├── users.queries.ts    # User queries
│   │   ├── messages.queries.ts # Message queries
│   │   └── index.ts
│   │
│   ├── schemas/
│   │   ├── sessions.schema.ts  # Zod schemas
│   │   ├── users.schema.ts
│   │   └── index.ts
│   │
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_add_display_name.sql
│       └── ...
│
├── scripts/
│   ├── generate-types.ts
│   └── run-migrations.ts
│
├── supabase/
│   ├── config.toml
│   └── migrations/
│
├── package.json
└── tsconfig.json
```

### 5. AI Services Package (`packages/ai-services`)

**Responsabilidades:**
- Integração OpenAI
- Integração Google Gemini  
- Abstrações para outros provedores
- Utilitários IA

**Estrutura:**
```
packages/ai-services/
├── src/
│   ├── providers/
│   │   ├── openai/
│   │   │   ├── client.ts
│   │   │   ├── assistants.ts
│   │   │   ├── chat.ts
│   │   │   └── types.ts
│   │   ├── gemini/
│   │   │   ├── client.ts
│   │   │   ├── chat.ts
│   │   │   └── types.ts
│   │   └── base/
│   │       ├── provider.interface.ts
│   │       └── types.ts
│   │
│   ├── services/
│   │   ├── conversation.service.ts
│   │   ├── context.service.ts
│   │   └── fallback.service.ts
│   │
│   ├── utils/
│   │   ├── prompt.utils.ts
│   │   ├── token.utils.ts
│   │   └── response.utils.ts
│   │
│   └── index.ts
│
├── package.json
└── tsconfig.json
```

### 6. WhatsApp Core Package (`packages/whatsapp-core`)

**Responsabilidades:**
- Wrapper para WPP Connect
- Handlers de mensagens
- Middleware WhatsApp
- Tipos WhatsApp

**Estrutura:**
```
packages/whatsapp-core/
├── src/
│   ├── client/
│   │   ├── wpp-client.ts       # WPP Connect wrapper
│   │   ├── session-manager.ts  # Gerenciador sessões
│   │   └── connection-handler.ts
│   │
│   ├── handlers/
│   │   ├── message.handler.ts  # Base message handler
│   │   ├── media.handler.ts    # Media messages
│   │   ├── group.handler.ts    # Group messages
│   │   └── status.handler.ts   # Status updates
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts  # Admin verification
│   │   ├── rate-limit.middleware.ts
│   │   └── filter.middleware.ts
│   │
│   ├── types/
│   │   ├── message.types.ts
│   │   ├── session.types.ts
│   │   └── index.ts
│   │
│   └── utils/
│       ├── formatting.utils.ts
│       ├── media.utils.ts
│       └── index.ts
│
├── package.json
└── tsconfig.json
```

### 7. UI Components Package (`packages/ui-components`)

**Responsabilidades:**
- Design system
- Componentes reutilizáveis
- Temas e estilos
- Storybook para documentação

**Estrutura:**
```
packages/ui-components/
├── src/
│   ├── components/
│   │   ├── atoms/              # Componentes básicos
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.stories.tsx
│   │   │   │   └── Button.module.css
│   │   │   ├── Input/
│   │   │   └── ...
│   │   ├── molecules/          # Componentes compostos
│   │   │   ├── SearchBox/
│   │   │   ├── MetricCard/
│   │   │   └── ...
│   │   └── organisms/          # Componentes complexos
│   │       ├── DataTable/
│   │       ├── SessionCard/
│   │       └── ...
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   ├── variables.css
│   │   └── themes/
│   │       ├── light.css
│   │       └── dark.css
│   │
│   ├── icons/
│   │   ├── WhatsAppIcon.tsx
│   │   ├── BotIcon.tsx
│   │   └── ...
│   │
│   └── hooks/
│       ├── useTheme.ts
│       ├── useMediaQuery.ts
│       └── ...
│
├── .storybook/
├── package.json
└── tsconfig.json
```

---

## 🛠️ Build System e Tooling

### Turborepo Configuration (`turbo.json`)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    },
    "start": {
      "dependsOn": ["build"]
    },
    "type-check": {
      "dependsOn": ["^build"]
    }
  }
}
```

### Root Package.json

```json
{
  "name": "zapninja-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean",
    "backend:dev": "turbo run dev --filter=backend",
    "web:dev": "turbo run dev --filter=web-dashboard",
    "cli:dev": "turbo run dev --filter=admin-cli"
  },
  "devDependencies": {
    "turbo": "^1.11.2",
    "@zapninja/eslint-config": "workspace:*",
    "@zapninja/typescript-config": "workspace:*",
    "prettier": "^3.1.0"
  }
}
```

### TypeScript Configuration

**Root `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@zapninja/shared": ["./packages/shared/src"],
      "@zapninja/database": ["./packages/database/src"],
      "@zapninja/ai-services": ["./packages/ai-services/src"],
      "@zapninja/whatsapp-core": ["./packages/whatsapp-core/src"],
      "@zapninja/ui-components": ["./packages/ui-components/src"]
    }
  }
}
```

---

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Type check
      run: npm run type-check
    
    - name: Lint
      run: npm run lint
    
    - name: Test
      run: npm run test
    
    - name: Build
      run: npm run build

  deploy-backend:
    needs: build-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Build and Deploy Backend
      env:
        RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
      run: |
        npm run build --filter=backend
        railway deploy --service=zapninja-backend
  
  deploy-frontend:
    needs: build-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Build and Deploy Frontend
      env:
        VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      run: |
        npm run build --filter=web-dashboard
        vercel --prod
```

---

## 📦 Migration Strategy

### Fase 1: Setup Monorepo (1 semana)

**Tarefas:**
1. Criar estrutura de pastas do monorepo
2. Configurar Turborepo
3. Migrar packages compartilhados
4. Setup de build system

**Comandos:**
```bash
# 1. Criar estrutura
mkdir -p zapninja-monorepo/{apps,packages,tools}
cd zapninja-monorepo

# 2. Inicializar root
npm init -y
npm install turbo -D

# 3. Configurar workspaces
echo '"workspaces": ["apps/*", "packages/*"]' >> package.json
```

### Fase 2: Migração Backend (1 semana)

**Tarefas:**
1. Extrair e reorganizar código do backend
2. Separar API REST do core do bot
3. Implementar workers para background jobs
4. Configurar CI/CD

**Estrutura de Migração:**
```bash
# Mover código atual para apps/backend
mv src/ apps/backend/src/
mv package.json apps/backend/

# Reorganizar estrutura
mkdir -p apps/backend/src/{api,bot,workers}
```

### Fase 3: Migração Frontend (1 semana)

**Tarefas:**
1. Migrar dashboard Next.js existente
2. Implementar design system
3. Configurar comunicação com backend
4. Setup WebSockets para real-time

### Fase 4: Packages Compartilhados (1 semana)

**Tarefas:**
1. Extrair types compartilhados
2. Criar package database
3. Extrair serviços IA
4. Criar package WhatsApp core

### Fase 5: Testing e Deploy (1 semana)

**Tarefas:**
1. Configurar testes para todos os packages
2. Setup CI/CD completo
3. Deploy em produção
4. Monitoramento e ajustes

---

## 🔧 Comandos de Desenvolvimento

### Comandos Principais

```bash
# Desenvolvimento de todos os apps
npm run dev

# Desenvolvimento específico
npm run backend:dev        # Só backend
npm run web:dev           # Só frontend
npm run cli:dev           # Só CLI

# Build
npm run build             # Build completo
npm run build --filter=backend # Build específico

# Testes
npm run test              # Todos os testes
npm run test --filter=shared # Testes específicos

# Linting
npm run lint              # Lint completo
npm run lint --filter=web-dashboard # Lint específico

# Type checking
npm run type-check        # Type check completo
```

### Scripts Úteis

```bash
# Adicionar dependência global
npm install lodash --workspace-root

# Adicionar dependência a app específico
npm install express --workspace=apps/backend

# Adicionar dependência a package
npm install zod --workspace=packages/shared

# Link local packages
npm install @zapninja/shared --workspace=apps/backend
```

---

## 📈 Vantagens da Nova Arquitetura

### 1. Desenvolvimento

- **🔄 Hot Reload**: Mudanças em packages refletem automaticamente
- **⚡ Build Otimizado**: Turborepo com cache inteligente
- **🧪 Testes Isolados**: Cada package pode ter sua estratégia de testes
- **📝 Types Compartilhados**: Consistência entre frontend/backend

### 2. Deploy e Operação

- **🚀 Deploy Independente**: Backend e frontend podem ser deployados separadamente
- **📊 Monitoramento Granular**: Métricas específicas por serviço
- **🔧 Escalabilidade**: Cada app pode escalar independentemente
- **🛡️ Isolamento de Falhas**: Problemas em um serviço não afetam outros

### 3. Manutenibilidade

- **📦 Código Reutilizável**: Packages compartilhados reduzem duplicação
- **🎯 Responsabilidades Claras**: Cada package tem propósito específico
- **👥 Trabalho em Equipe**: Times podem trabalhar em paralelo
- **📚 Documentação**: Cada package pode ter documentação específica

---

## 🎯 Próximos Passos

### Imediatos (1 mês)

1. **Setup Inicial**:
   - Criar estrutura monorepo
   - Configurar Turborepo
   - Migrar código existente

2. **Separação Backend/Frontend**:
   - Extrair API REST
   - Configurar comunicação WebSocket
   - Implementar autenticação

### Médio Prazo (2-3 meses)

3. **Packages Compartilhados**:
   - Criar design system
   - Package de utilidades IA
   - Package WhatsApp core

4. **Melhorias de Developer Experience**:
   - Storybook para componentes
   - Testes automatizados
   - Documentação interativa

### Longo Prazo (6+ meses)

5. **Expansão**:
   - App mobile React Native
   - Múltiplos frontends (admin, user, etc.)
   - Microserviços adicionais

6. **Enterprise Features**:
   - Multi-tenancy
   - Advanced security
   - Load balancing

---

*Proposta de arquitetura monorepo para ZAPNINJA*  
*Versão: 1.0 | Data: 2025-01-05*