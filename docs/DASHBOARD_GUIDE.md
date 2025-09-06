# ZAPNINJA Dashboard - Guia Completo

## 🚀 Visão Geral

O Dashboard Terminal do ZAPNINJA é um sistema de gerenciamento interativo que permite controlar múltiplas sessões de WhatsApp de forma intuitiva e organizada. Com gerenciamento inteligente de portas, editor de configurações avançado e monitoramento em tempo real.

## 📋 Funcionalidades Principais

### 🎯 Sistema de Seleção de Sessões
- **Lista Dinâmica**: Visualiza todas as sessões disponíveis no banco
- **Status em Tempo Real**: Indica quais sessões estão ativas/inativas/rodando
- **Informações Detalhadas**: Mostra telefone, IA configurada, data de criação
- **Filtragem Inteligente**: Separa sessões por status para navegação fácil

### 🌐 Gerenciamento Inteligente de Portas
- **Detecção Automática**: Identifica portas em uso automaticamente
- **Atribuição Sequencial**: Aloca portas de forma sequencial (3000, 3001, 3002...)
- **Prevenção de Conflitos**: Evita conflitos verificando disponibilidade
- **Limpeza Automática**: Remove portas de sessões inativas
- **Monitoramento de Saúde**: Verifica saúde do sistema de portas

### ⚙️ Editor de Configurações Avançado
- **Wizard Inteligente**: Assistente para configuração baseada no uso
- **Templates Prontos**: Presets para diferentes cenários (negócios, vendas, suporte)
- **Edição Manual**: Controle fino de todos os parâmetros
- **Preview em Tempo Real**: Visualiza alterações antes de aplicar

## 🏁 Como Iniciar

### Modo Dashboard (Recomendado)
```bash
# Inicia o dashboard interativo
npm run dev

# Força o dashboard mesmo com variáveis definidas
npm run dev:dashboard
```

### Modo Direto (Headless)
```bash
# Inicia sessão específica diretamente
npm run dev -- --session=minhaSessionName

# Com porta específica
npm run dev -- --session=vendas --port=3001

# Com modelo de IA específico
npm run dev -- --session=suporte --ai=GPT
```

### Modo Legacy (Compatibilidade)
```bash
# Executa o código original sem dashboard
npm run dev:legacy
```

## 🎨 Interface do Dashboard

### Tela Principal
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ______ ____  _____ _____ _____ _____ _____
|_____||____]|_____|_____|_____|_____|_____|
|     ||    \|     |     |     |     |     |
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Sistema Inteligente de WhatsApp Bot
   Desenvolvido por Rafael Carboni
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 RESUMO DO SISTEMA
──────────────────────────────────────────────────────
✅ Sessões Ativas: 3/5
👥 Total de Usuários: 127
💬 Mensagens (24h): 89
🔌 Conexões Ativas: 2
🌐 Portas em Uso: 3000, 3001
──────────────────────────────────────────────────────
```

### Menu Principal
- **🚀 Iniciar Nova Sessão**: Criar ou iniciar sessões
- **📊 Gerenciar Sessões Existentes**: Controle de sessões ativas
- **👥 Visualizar Usuários**: Lista de usuários cadastrados
- **⚙️ Configurações**: Configurações do sistema
- **📈 Monitoramento**: Métricas e logs em tempo real
- **🔄 Atualizar Dados**: Recarrega informações do banco

## 🚀 Gerenciamento de Sessões

### Iniciar Nova Sessão

1. **Seleção de Sessão**:
   ```
   🟢 sessionName (5511999999999)
   🔴 sessionVendas 
   🟢 sessionSuporte (5511888888888)
   ──────────────────────────────
   ➕ Criar Nova Sessão
   🔙 Voltar ao Menu
   ```

2. **Verificação de Configurações**:
   - Visualiza configurações atuais
   - Opção de editar antes de iniciar
   - Confirma porta atribuída

3. **Inicialização**:
   - Atribui porta automaticamente
   - Registra no gerenciador
   - Monitora inicialização
   - Exibe status em tempo real

### Criar Nova Sessão

```
➕ CRIAR NOVA SESSÃO
──────────────────────
Nome da sessão: [minhaNovaSessionName]
Número do WhatsApp (opcional): [5511999999999]
Modelo de IA: [🤖 OpenAI GPT-4]
Ativar sessão imediatamente? [Sim]
```

### Gerenciar Sessões Existentes

Para cada sessão você pode:
- **👁️ Ver Detalhes**: Informações completas
- **⚙️ Editar Configurações**: Acesso ao editor
- **📊 Ver Status**: Status da sessão rodando
- **📝 Ver Logs**: Logs em tempo real
- **🔄 Reiniciar**: Reinicia a sessão
- **🛑 Parar**: Para a sessão
- **✅/❌ Ativar/Desativar**: Muda status no banco
- **🗑️ Excluir**: Remove permanentemente

## ⚙️ Editor de Configurações

### Configurações de IA

```
🤖 CONFIGURAÇÕES DE IA
──────────────────────────────
Configurações atuais:
  Modelo: gpt-4
  Temperatura: 0.7
  Max Tokens: 2000
  Prompt do Sistema: Você é um assistente...

Modelo de IA:
🤖 GPT-4 (Mais inteligente, mais caro)
⚡ GPT-3.5-turbo (Mais rápido, mais barato)  
🧠 Google Gemini Pro
🆓 Google Gemini Flash (Gratuito)
```

### Configurações de Timing

#### Wizard Inteligente
```
🧙‍♂️ ASSISTENTE DE TIMING
──────────────────────────────
Qual é o principal uso do seu bot?
🏢 Atendimento empresarial (formal)
🛍️ Vendas/E-commerce (ágil)
🎓 Educacional/Suporte (detalhado)
👥 Pessoal/Amigos (casual)
🤖 Assistente técnico (preciso)

Como deve ser o estilo de resposta?
⚡ Muito rápido (parece bot)
🏃‍♂️ Rápido (eficiente)
🚶‍♂️ Humano (natural)
🐌 Reflexivo (pensativo)
```

#### Presets Rápidos
- **🚀 Ultra Rápido**: 500ms resposta, sem simulação
- **⚡ Negócios Ágil**: 1s resposta, horário comercial
- **👤 Humano Natural**: 3s resposta, simulação completa
- **🤔 Reflexivo Lento**: 5s resposta, pausas longas
- **🌙 Modo Noturno**: 8s resposta, funcionamento noturno

#### Edição Manual
```
🔧 EDIÇÃO MANUAL DE TIMING
────────────────────────────
Tempo base de resposta (ms): [3000]
Delay entre mensagens (ms): [1500]  
Período de descanso (ms): [300000]
Hora de início (HH:MM): [08:00]
Hora de fim (HH:MM): [22:00]
Limite de mensagens por hora: [100]
Ativar simulação de digitação? [Sim]
```

### Prompts Personalizados

#### Templates Disponíveis
- **🏢 Atendimento Empresarial**: Formal, profissional
- **🛍️ Assistente de Vendas**: Consultivo, persuasivo
- **🛠️ Suporte Técnico**: Detalhado, didático
- **👤 Assistente Pessoal**: Casual, amigável
- **🎓 Tutor Educacional**: Pedagógico, explicativo

#### Editor de Prompt
- Editor de texto completo
- Validação de tamanho
- Preview antes de aplicar
- Opção de remover (volta ao padrão)

## 🌐 Sistema de Portas

### Características
- **Porta Base**: 3000 (configurável)
- **Incremento Automático**: +1 para cada sessão
- **Detecção de Conflitos**: Verifica disponibilidade
- **Limpeza Automática**: Remove portas ociosas

### Configuração
```
🌐 CONFIGURAÇÃO DE PORTAS
──────────────────────────────
Porta Base: 3000
Portas em Uso: 3000, 3001, 3002
Sessões Ativas:
  • sessionName → Porta 3000
  • vendas → Porta 3001
  • suporte → Porta 3002

🔄 Alterar Porta Base
🧹 Limpar Portas Ociosas  
📊 Ver Detalhes
```

### Health Check
O sistema verifica:
- Conflitos de porta
- Número excessivo de portas em uso
- Proximidade do limite máximo
- Processos órfãos

## 📊 Monitoramento

### Métricas em Tempo Real
```
📈 MONITORAMENTO DO SISTEMA
──────────────────────────────────────────────────
🔌 Sessões Ativas: 3

• sessionName (porta 3000)
  💚 Status: Online
  🌐 Health: http://localhost:3000/health

• vendas (porta 3001)  
  💚 Status: Online
  🌐 Health: http://localhost:3001/health
```

### Endpoints de Saúde
Cada sessão ativa expõe:
- `http://localhost:[porta]/health`: Status da sessão
- `http://localhost:[porta]/status`: Informações detalhadas

## 👥 Visualização de Usuários

```
👥 USUÁRIOS CADASTRADOS
──────────────────────────────────────────────────
Total de usuários: 127

1. João Silva
   📞 5511999999999
   💬 45 mensagens
   📅 Cadastrado: 15/01/2024

2. Maria Santos  
   📞 5511888888888
   💬 32 mensagens
   📅 Cadastrado: 12/01/2024
```

## 🔧 Configurações do Sistema

### Categorias Disponíveis
- **🌐 Configurações de Porta**: Gerenciamento de portas
- **🤖 Configurações Globais de IA**: Padrões para novas sessões
- **⏱️ Configurações de Timing**: Padrões de timing
- **🗄️ Configurações do Banco**: Informações do Supabase
- **📝 Logs e Monitoramento**: Configurações de logging

## 🚨 Resolução de Problemas

### Problemas Comuns

#### Dashboard não inicia
```bash
# Verificar dependências
npm install

# Verificar conexão com banco
npm run dev -- --help

# Verificar logs
tail -f logs/bot-$(date +%Y-%m-%d).log
```

#### Conflito de portas
```
⚠️ Problemas detectados no sistema:
  • 2 conflitos de porta detectados

💡 Recomendações:
  • Execute limpeza de portas ociosas
```

Soluções:
1. **Limpeza Automática**: Configurações → Configurações de Porta → Limpar Portas Ociosas
2. **Alterar Porta Base**: Muda para faixa diferente
3. **Reiniciar Sistema**: Para todas as sessões e reinicia

#### Sessão não conecta
1. **Verificar QR Code**: Logs da sessão mostrarão QR
2. **Verificar Configurações**: IA keys, prompts, etc.
3. **Verificar Rede**: Conectividade com WhatsApp Web

#### Erro de banco de dados
```
❌ Erro ao conectar com o banco de dados
```

Verificar:
1. **Variáveis de ambiente**: SUPABASE_URL, SUPABASE_ANON_KEY
2. **Conectividade**: Acesso à internet
3. **Configurações Supabase**: RLS, tabelas criadas

## 📚 Comandos Úteis

### Desenvolvimento
```bash
# Dashboard interativo
npm run dev

# Dashboard forçado
npm run dev:dashboard

# Sessão específica
npm run dev -- --session=teste --port=3005

# Modo legacy
npm run dev:legacy

# Ajuda
npm run help
```

### Produção
```bash
# Build
npm run build

# Iniciar em produção
npm run start

# Iniciar com dashboard
npm run start:dashboard
```

### Argumentos CLI
```bash
# Sessão específica
--session=nome

# Porta específica  
--port=3001

# Modelo IA específico
--ai=GPT ou --ai=GEMINI

# Forçar dashboard
--dashboard

# Pular dashboard
--no-dashboard

# Ajuda
--help ou -h
```

## 🔐 Segurança

### Recomendações
1. **Variáveis de Ambiente**: Nunca versione keys no Git
2. **Acesso Admin**: Configure ADMIN_NUMBERS corretamente
3. **Firewall**: Limite acesso às portas de monitoramento
4. **Backups**: Configure backups regulares do banco

### Variáveis Sensíveis
```env
OPENAI_KEY=sk-...
GEMINI_KEY=AIza...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_NUMBERS=5511999999999,5511888888888
```

## 🎯 Melhores Práticas

### Organização de Sessões
- **Nomes Descritivos**: `vendas`, `suporte`, `marketing`
- **Configurações Específicas**: Ajuste timing para cada uso
- **Monitoramento Regular**: Verifique saúde das sessões
- **Limpeza Periódica**: Remova sessões não utilizadas

### Performance
- **Limite Sessões**: Não exceda 10 sessões simultâneas
- **Monitoramento**: Use endpoints de saúde
- **Recursos**: Monitore CPU e memória
- **Logs**: Configure rotação de logs

### Configurações
- **Backup Regulares**: Configure backups automáticos
- **Versionamento**: Documente mudanças importantes
- **Testes**: Teste configurações em sessões de desenvolvimento

---

*Documentação do Dashboard ZAPNINJA v2.1*
*Última atualização: Janeiro 2024*