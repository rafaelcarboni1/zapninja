# ZAPNINJA - Início Rápido

## 🚀 Instalação e Configuração

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env` e configure:

```env
# Configurações Básicas
SESSION_NAME=minhaSessao
BOT_ACTIVE=true

# IA (escolha uma)
AI_SELECTED=GEMINI
GEMINI_KEY=sua_key_do_gemini

# OU
AI_SELECTED=GPT
OPENAI_KEY=sua_key_openai
OPENAI_ASSISTANT=seu_assistant_id

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key

# Admin
ADMIN_NUMBERS=5511999999999,5511888888888
```

### 3. Configurar Banco de Dados
Execute o script SQL no Supabase:
```sql
-- Conteúdo do arquivo database/schema.sql
```

## 🎯 Modos de Uso

### Dashboard Interativo (Recomendado)
```bash
npm run dev
```
Abre o dashboard terminal onde você pode:
- Selecionar sessões existentes
- Criar novas sessões
- Configurar timing e IA
- Monitorar sessões ativas

### Sessão Direta
```bash
# Usar sessão específica
npm run dev -- --session=vendas

# Com porta específica
npm run dev -- --session=vendas --port=3001

# Com IA específica
npm run dev -- --session=vendas --ai=GPT
```

### Modo Legacy (Compatibilidade)
```bash
npm run dev:legacy
```

## 📱 Primeiro Uso

### 1. Iniciar Dashboard
```bash
npm run dev
```

### 2. Criar Primeira Sessão
```
🚀 Iniciar Nova Sessão
➕ Criar Nova Sessão

Nome da sessão: meuBot
Número do WhatsApp: 5511999999999
Modelo de IA: Google Gemini
Ativar imediatamente: Sim
```

### 3. Configurar WhatsApp
- QR Code será exibido no terminal
- Escaneie com seu WhatsApp
- Aguarde conexão

### 4. Testar Bot
Envie uma mensagem para o número configurado e o bot responderá!

## ⚙️ Configurações Essenciais

### Timing Humano
```
Configurações → Timing → Wizard Inteligente
Uso: Atendimento empresarial
Estilo: Humano natural
Volume: Médio
```

### Prompt Personalizado
```
Configurações → Prompt Personalizado → Templates
Selecione: Atendimento Empresarial
```

## 📊 Monitoramento

### Health Check
```bash
curl http://localhost:3000/health
```

### Logs em Tempo Real
No dashboard: Gerenciar Sessões → Ver Logs

### Métricas
Dashboard → Monitoramento

## 🔧 Comandos Administrativos

Via WhatsApp (números admin):

### Controle Básico
- `!status` - Status do bot
- `!pausar` - Pausar bot
- `!retomar` - Retomar bot

### Usuários
- `!pausar_contato 5511999999999` - Pausar contato específico
- `!retomar_contato 5511999999999` - Retomar contato
- `!listar_pausados` - Ver contatos pausados

### Configurações
- `!config_tempos status` - Ver configurações de timing
- `!prompt_sessao minhaSessao "Novo prompt"` - Alterar prompt

## 🚨 Troubleshooting

### Bot não responde
1. Verificar se está ativo: `!status`
2. Verificar logs no dashboard
3. Verificar conexão WhatsApp

### Erro de porta
```
⚠️ EADDRINUSE: address already in use :::3000
```
Solução: Dashboard detecta automaticamente e usa próxima porta

### Erro de banco
```
❌ Transport is closed
```
1. Verificar SUPABASE_URL
2. Verificar SUPABASE_ANON_KEY
3. Verificar conectividade

### QR Code não aparece
1. Verificar logs da sessão
2. Limpar tokens: `rm -rf tokens/`
3. Reiniciar sessão

## 📁 Estrutura de Arquivos

```
ZAPNINJA/
├── src/
│   ├── main.ts              # Novo ponto de entrada
│   ├── index.ts             # Código original (legacy)
│   ├── dashboard/           # Sistema de dashboard
│   │   ├── terminal-dashboard.ts
│   │   ├── port-manager.ts
│   │   ├── session-controller.ts
│   │   └── configuration-editor.ts
│   ├── services/            # Serviços do sistema
│   └── config/              # Configurações
├── data/                    # Dados do dashboard
├── logs/                    # Logs do sistema  
├── tokens/                  # Tokens WhatsApp
└── docs/                    # Documentação
```

## 🎯 Cenários de Uso

### E-commerce
```bash
# Criar sessão para vendas
npm run dev
→ Criar Nova Sessão
   Nome: vendas
   Template: Assistente de Vendas
   Timing: Rápido
```

### Suporte
```bash
# Sessão para suporte técnico
npm run dev
→ Criar Nova Sessão
   Nome: suporte
   Template: Suporte Técnico
   Timing: Reflexivo
```

### Marketing
```bash
# Sessão para marketing
npm run dev
→ Criar Nova Sessão
   Nome: marketing
   Template: Atendimento Empresarial
   Timing: Negócios Ágil
```

## 📈 Próximos Passos

### Otimização
1. **Monitorar Performance**: Usar endpoints de health
2. **Ajustar Timing**: Baseado no feedback dos usuários
3. **Personalizar Prompts**: Para cada caso de uso
4. **Configurar Backups**: Dados e configurações

### Escalabilidade
1. **Múltiplas Sessões**: Para diferentes departamentos
2. **Load Balancing**: Distribuir carga
3. **Monitoramento Avançado**: Alertas e métricas
4. **Integração APIs**: Conectar com outros sistemas

### Segurança
1. **Revisar Admins**: Manter lista atualizada
2. **Monitorar Logs**: Detectar atividades suspeitas
3. **Backup Regular**: Configurar automação
4. **Firewall**: Proteger portas de monitoramento

---

🎉 **Parabéns!** Seu ZAPNINJA está configurado e pronto para uso!

Para suporte e dúvidas, consulte a documentação completa em `docs/`.