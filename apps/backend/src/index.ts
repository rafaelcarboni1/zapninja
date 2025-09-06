import wppconnect from '@wppconnect-team/wppconnect';
import { env } from './config/env';
import { evolutionClient } from './services/whatsapp/evolution.client';
import dotenv from 'dotenv';
import { initializeNewAIChatSession, mainOpenAI } from './service/openai';
import { splitMessages, sendMessagesWithDelay } from './util';
import { mainGoogle } from './service/google';
import { logger } from './util/logger';
import { numberFilter } from './util/filter';
import { maintenanceManager } from './util/maintenance';
import { configManager } from './util/config';
import { contactPauseManager } from './util/contactPause';
import { timingConfigManager } from './util/timingConfig';
import { sessionManager } from './services/session.manager';
import { contextEngineService } from './services/context-engine.service';
import { databaseService } from './services/database.service';
import { adminCommandsService } from './services/admin-commands.service';
import express from 'express';
import http from 'http';

dotenv.config();
type AIOption = 'GPT' | 'GEMINI';

// Função para processar argumentos da linha de comando
function parseCommandLineArgs(): { sessionName?: string; port?: number; aiModel?: AIOption } {
  const args = process.argv.slice(2);
  const result: { sessionName?: string; port?: number; aiModel?: AIOption } = {};
  
  for (const arg of args) {
    if (arg.startsWith('--session=')) {
      result.sessionName = arg.split('=')[1];
    } else if (arg.startsWith('--port=')) {
      result.port = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--ai=')) {
      const aiModel = arg.split('=')[1] as AIOption;
      if (aiModel === 'GPT' || aiModel === 'GEMINI') {
        result.aiModel = aiModel;
      }
    }
  }
  
  return result;
}

// Processar argumentos da linha de comando
const cmdArgs = parseCommandLineArgs();
const SESSION_NAME = cmdArgs.sessionName || process.env.SESSION_NAME || 'sessionName';
const SESSION_PORT = cmdArgs.port || parseInt(process.env.PORT || '3000');
const AI_MODEL_OVERRIDE = cmdArgs.aiModel;

// Verificar se este processo deve iniciar uma sessão WhatsApp
// Se não há parâmetros específicos de sessão, não deve conectar automaticamente
const SHOULD_CONNECT = cmdArgs.sessionName || process.env.SESSION_NAME || process.env.FORCE_CONNECT === 'true';

// Configuração da IA
const AI_SELECTED: AIOption = (process.env.AI_SELECTED as AIOption) || 'GEMINI';

// Configurações de controle do bot
let BOT_ACTIVE = process.env.BOT_ACTIVE === 'true';

// Iniciar diretamente o WhatsApp sem menu interativo
console.log(`🚀 Iniciando sessão WhatsApp: ${SESSION_NAME}`);
console.log(`📱 Porta da sessão: ${SESSION_PORT}`);
console.log(`🤖 IA selecionada: ${AI_SELECTED}`);
console.log(`⚡ Bot ativo: ${BOT_ACTIVE ? 'Sim' : 'Não'}`);

// Variáveis de estado da sessão
let sessionStatus = {
  name: SESSION_NAME,
  port: SESSION_PORT,
  status: 'initializing',
  connected: false,
  lastActivity: new Date(),
  messagesProcessed: 0,
  errors: 0,
  uptime: Date.now()
};

// Configurar servidor HTTP para monitoramento
const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    ...sessionStatus,
    uptime: Date.now() - sessionStatus.uptime
  });
});

app.get('/status', (req, res) => {
  res.json(sessionStatus);
});

app.post('/shutdown', (req, res) => {
  res.json({ message: 'Shutdown initiated' });
  setTimeout(() => process.exit(0), 1000);
});

const server = http.createServer(app);
server.listen(SESSION_PORT, () => {
  console.log(`📊 [${SESSION_NAME}] Servidor de monitoramento rodando na porta ${SESSION_PORT}`);
});

const messageBufferPerChatId = new Map();
const messageTimeouts = new Map();
const MAX_RETRIES = 3;

const ADMIN_NUMBERS = process.env.ADMIN_NUMBERS?.split(',').map(num => num.trim()) || [];
const PAUSE_COMMAND = process.env.PAUSE_COMMAND || '!pausar';
const RESUME_COMMAND = process.env.RESUME_COMMAND || '!retomar';
const STATUS_COMMAND = process.env.STATUS_COMMAND || '!status';
const PAUSE_CONTACT_COMMAND = process.env.PAUSE_CONTACT_COMMAND || '!pausar_contato';
const RESUME_CONTACT_COMMAND = process.env.RESUME_CONTACT_COMMAND || '!retomar_contato';
const LIST_PAUSED_COMMAND = process.env.LIST_PAUSED_COMMAND || '!listar_pausados';
const HELP_COMMAND = process.env.HELP_COMMAND || '!ajuda';
const TIMING_CONFIG_COMMAND = process.env.TIMING_CONFIG_COMMAND || '!config_tempos';
const PROMPT_SESSION_COMMAND = process.env.PROMPT_SESSION_COMMAND || '!prompt_sessao';
const VIEW_PROMPT_COMMAND = process.env.VIEW_PROMPT_COMMAND || '!ver_prompt';
// Gerenciamento de Prompts
const SYSTEM_PROMPT_COMMAND = process.env.SYSTEM_PROMPT_COMMAND || '!prompt_sistema';

// Monitoramento
const METRICS_COMMAND = process.env.METRICS_COMMAND || '!metricas';
const HISTORY_COMMAND = process.env.HISTORY_COMMAND || '!historico';
const LOGS_COMMAND = process.env.LOGS_COMMAND || '!logs';
const PERFORMANCE_COMMAND = process.env.PERFORMANCE_COMMAND || '!performance';

// Gerenciamento de Sessões
const LIST_SESSIONS_COMMAND = process.env.LIST_SESSIONS_COMMAND || '!listar_sessoes';
const CREATE_SESSION_COMMAND = process.env.CREATE_SESSION_COMMAND || '!criar_sessao';
const ACTIVATE_SESSION_COMMAND = process.env.ACTIVATE_SESSION_COMMAND || '!ativar_sessao';
const DEACTIVATE_SESSION_COMMAND = process.env.DEACTIVATE_SESSION_COMMAND || '!desativar_sessao';
const CONFIG_SESSION_COMMAND = process.env.CONFIG_SESSION_COMMAND || '!config_sessao';
const RESTART_SESSION_COMMAND = process.env.RESTART_SESSION_COMMAND || '!reiniciar';

// Gerenciamento de Usuários
const LIST_USERS_COMMAND = process.env.LIST_USERS_COMMAND || '!listar_usuarios';
const BLOCK_USER_COMMAND = process.env.BLOCK_USER_COMMAND || '!bloquear_usuario';
const UNBLOCK_USER_COMMAND = process.env.UNBLOCK_USER_COMMAND || '!desbloquear_usuario';
const USER_INFO_COMMAND = process.env.USER_INFO_COMMAND || '!info_usuario';
const CLEAR_CONTEXT_COMMAND = process.env.CLEAR_CONTEXT_COMMAND || '!limpar_contexto';

// Configurações de IA
const CONFIG_AI_COMMAND = process.env.CONFIG_AI_COMMAND || '!config_ia';
const AI_MODEL_COMMAND = process.env.AI_MODEL_COMMAND || '!modelo_ia';
const TEMPERATURE_COMMAND = process.env.TEMPERATURE_COMMAND || '!temperatura';

// Timing
const RESPONSE_TIME_COMMAND = process.env.RESPONSE_TIME_COMMAND || '!tempo_resposta';
const MESSAGE_DELAY_COMMAND = process.env.MESSAGE_DELAY_COMMAND || '!delay_mensagem';
const REST_PERIOD_COMMAND = process.env.REST_PERIOD_COMMAND || '!tempo_descanso';
const WORKING_HOURS_COMMAND = process.env.WORKING_HOURS_COMMAND || '!horario_funcionamento';
const MESSAGE_LIMIT_COMMAND = process.env.MESSAGE_LIMIT_COMMAND || '!limite_mensagens';
const TIMING_WIZARD_COMMAND = process.env.TIMING_WIZARD_COMMAND || '!config_timing';

// Manutenção
const BACKUP_COMMAND = process.env.BACKUP_COMMAND || '!backup';
const CLEANUP_COMMAND = process.env.CLEANUP_COMMAND || '!limpeza';
const TEST_CONNECTION_COMMAND = process.env.TEST_CONNECTION_COMMAND || '!teste_conexao';

// Básicos
const STATUS_ADMIN_COMMAND = process.env.STATUS_ADMIN_COMMAND || '!status_admin';
const INFO_ADMIN_COMMAND = process.env.INFO_ADMIN_COMMAND || '!info_admin';
const CONFIG_ADMIN_COMMAND = process.env.CONFIG_ADMIN_COMMAND || '!config_admin';
const CONFIG_COMMAND = process.env.CONFIG_COMMAND || '!config';

// Aliases para compatibilidade com teste
const PROMPT_SISTEMA_COMMAND = SYSTEM_PROMPT_COMMAND;
const PROMPT_SESSAO_COMMAND = PROMPT_SESSION_COMMAND;
const VER_PROMPT_COMMAND = VIEW_PROMPT_COMMAND;
const METRICAS_COMMAND = METRICS_COMMAND;
const HISTORICO_COMMAND = HISTORY_COMMAND;
const LISTAR_SESSOES_COMMAND = LIST_SESSIONS_COMMAND;
const CRIAR_SESSAO_COMMAND = CREATE_SESSION_COMMAND;
const ATIVAR_SESSAO_COMMAND = ACTIVATE_SESSION_COMMAND;
const DESATIVAR_SESSAO_COMMAND = DEACTIVATE_SESSION_COMMAND;
const CONFIG_SESSAO_COMMAND = CONFIG_SESSION_COMMAND;
const REINICIAR_COMMAND = RESTART_SESSION_COMMAND;
const LISTAR_USUARIOS_COMMAND = LIST_USERS_COMMAND;
const BLOQUEAR_USUARIO_COMMAND = BLOCK_USER_COMMAND;
const DESBLOQUEAR_USUARIO_COMMAND = UNBLOCK_USER_COMMAND;
const INFO_USUARIO_COMMAND = USER_INFO_COMMAND;
const LIMPAR_CONTEXTO_COMMAND = CLEAR_CONTEXT_COMMAND;
const CONFIG_IA_COMMAND = CONFIG_AI_COMMAND;
const MODELO_IA_COMMAND = AI_MODEL_COMMAND;
const TEMPERATURA_COMMAND = TEMPERATURE_COMMAND;
const TEMPO_RESPOSTA_COMMAND = RESPONSE_TIME_COMMAND;
const DELAY_MENSAGEM_COMMAND = MESSAGE_DELAY_COMMAND;
const TEMPO_DESCANSO_COMMAND = REST_PERIOD_COMMAND;
const HORARIO_FUNCIONAMENTO_COMMAND = WORKING_HOURS_COMMAND;
const LIMITE_MENSAGENS_COMMAND = MESSAGE_LIMIT_COMMAND;
const CONFIG_TIMING_COMMAND = TIMING_WIZARD_COMMAND;
const LIMPEZA_COMMAND = CLEANUP_COMMAND;
const TESTE_CONEXAO_COMMAND = TEST_CONNECTION_COMMAND;
const INFO_COMMAND = INFO_ADMIN_COMMAND;

// Função para verificar se o número é admin
function isAdmin(phoneNumber: string): boolean {
  return ADMIN_NUMBERS.some(adminNum => phoneNumber.includes(adminNum.replace(/\D/g, '')));
}

// Função para processar comandos de controle
async function processControlCommand(message: any, client: wppconnect.Whatsapp): Promise<boolean> {
  const messageBody = message.body.toLowerCase().trim();
  const senderNumber = message.from;
  
  // Verifica se é um comando de configuração dinâmica
  if (configManager.isConfigCommand(message.body)) {
    const response = await configManager.processConfigCommand(message.body, senderNumber);
    await client.sendText(message.from, response);
    logger.commandExecuted('config', senderNumber, true);
    return true;
  }
  
  if (!isAdmin(senderNumber)) {
    return false;
  }
  
  if (messageBody === PAUSE_COMMAND.toLowerCase()) {
    BOT_ACTIVE = false;
    await client.sendText(message.from, '🤖 Bot pausado! Use ' + RESUME_COMMAND + ' para retomar.');
    logger.commandExecuted('pause', senderNumber, true);
    return true;
  }
  
  if (messageBody === RESUME_COMMAND.toLowerCase()) {
    BOT_ACTIVE = true;
    await client.sendText(message.from, '🤖 Bot retomado! Agora estou respondendo normalmente.');
    logger.commandExecuted('resume', senderNumber, true);
    return true;
  }
  
  if (messageBody === STATUS_COMMAND.toLowerCase()) {
    const status = BOT_ACTIVE ? 'Ativo ✅' : 'Pausado ⏸️';
    const aiMode = AI_SELECTED === 'GPT' ? 'OpenAI GPT' : 'Google Gemini';
    const filterStatus = numberFilter.getFilterStatus();
    const maintenanceStatus = maintenanceManager.getMaintenanceStatus();
    const pauseStatus = contactPauseManager.getPauseStatus();
    
    const statusMessage = `🤖 *Status do Bot*\n\n` +
                         `Estado: ${status}\n` +
                         `IA: ${aiMode}\n` +
                         `Filtro: ${(filterStatus as any).mode}\n` +
                         `Manutenção: ${(maintenanceStatus as any).isInMaintenance ? 'Ativo' : 'Inativo'}\n` +
                         `Contatos pausados: ${pauseStatus.totalPaused}\n` +
                         `Versão: 2.1`;
    
    await client.sendText(message.from, statusMessage);
    logger.commandExecuted('status', senderNumber, true);
    return true;
  }
  
  // Comandos de pausa individual de contatos
  if (messageBody.startsWith(PAUSE_CONTACT_COMMAND.toLowerCase())) {
    const parts = message.body.trim().split(' ');
    if (parts.length < 2) {
      await client.sendText(message.from, `❌ Uso correto: ${PAUSE_CONTACT_COMMAND} <número> [motivo]\n\nExemplo: ${PAUSE_CONTACT_COMMAND} 5511999999999 Solicitação do cliente`);
      return true;
    }
    
    const targetNumber = parts[1];
    const reason = parts.slice(2).join(' ') || 'Pausado pelo administrador';
    
    const success = contactPauseManager.pauseContact(targetNumber, reason);
    
    if (success) {
      await client.sendText(message.from, `⏸️ Contato ${targetNumber} foi pausado.\nMotivo: ${reason}`);
    } else {
      await client.sendText(message.from, `ℹ️ Contato ${targetNumber} já estava pausado.`);
    }
    
    logger.commandExecuted('pause_contact', senderNumber, true);
    return true;
  }
  
  if (messageBody.startsWith(RESUME_CONTACT_COMMAND.toLowerCase())) {
    const parts = message.body.trim().split(' ');
    if (parts.length < 2) {
      await client.sendText(message.from, `❌ Uso correto: ${RESUME_CONTACT_COMMAND} <número>\n\nExemplo: ${RESUME_CONTACT_COMMAND} 5511999999999`);
      return true;
    }
    
    const targetNumber = parts[1];
    const success = contactPauseManager.resumeContact(targetNumber);
    
    if (success) {
      await client.sendText(message.from, `▶️ Contato ${targetNumber} foi retomado.`);
    } else {
      await client.sendText(message.from, `ℹ️ Contato ${targetNumber} não estava pausado.`);
    }
    
    logger.commandExecuted('resume_contact', senderNumber, true);
    return true;
  }
  
  if (messageBody === LIST_PAUSED_COMMAND.toLowerCase()) {
    const pauseStatus = contactPauseManager.getPauseStatus();
    
    if (pauseStatus.totalPaused === 0) {
      await client.sendText(message.from, '✅ Nenhum contato está pausado no momento.');
    } else {
      let listMessage = `⏸️ *Contatos Pausados* (${pauseStatus.totalPaused})\n\n`;
      
      pauseStatus.contacts.forEach((contact, index) => {
        listMessage += `${index + 1}. ${contact.number}\n`;
        if (contact.reason) {
          listMessage += `   Motivo: ${contact.reason}\n`;
        }
        listMessage += `   Pausado há: ${contact.duration}\n\n`;
      });
      
      await client.sendText(message.from, listMessage);
    }
    
    logger.commandExecuted('list_paused', senderNumber, true);
    return true;
  }
  
  // Comando de ajuda
  if (messageBody === HELP_COMMAND.toLowerCase()) {
    const helpMessage = `🤖 *Comandos Disponíveis do Bot*\n\n` +
                       `📋 *Comandos Gerais:*\n` +
                       `${HELP_COMMAND} - Mostra esta lista de comandos\n\n` +
                       `⚙️ *Comandos de Administrador:*\n` +
                       `${PAUSE_COMMAND} - Pausa o bot completamente\n` +
                       `${RESUME_COMMAND} - Retoma o funcionamento do bot\n` +
                       `${STATUS_COMMAND} - Mostra status detalhado do bot\n\n` +
                       `👤 *Controle de Contatos:*\n` +
                       `${PAUSE_CONTACT_COMMAND} <número> [motivo] - Pausa um contato específico\n` +
                       `${RESUME_CONTACT_COMMAND} <número> - Retoma um contato pausado\n` +
                       `${LIST_PAUSED_COMMAND} - Lista todos os contatos pausados\n\n` +
                       `⏱️ *Configuração de Tempos:*\n` +
                       `${TIMING_CONFIG_COMMAND} - Configura tempos de resposta\n` +
                       `${TIMING_CONFIG_COMMAND} status - Mostra configurações atuais\n` +
                       `${TIMING_CONFIG_COMMAND} reset - Restaura configurações padrão\n\n` +
                       `🔧 *Configurações Dinâmicas:*\n` +
                       `!config - Acessa configurações avançadas\n` +
                       `!manutencao - Controla modo de manutenção\n\n` +
                       `🎯 *Gerenciamento de Prompts:*\n` +
                       `${PROMPT_SESSION_COMMAND} <sessao> <prompt> - Define prompt personalizado\n` +
                       `${VIEW_PROMPT_COMMAND} <sessao> - Visualiza prompt da sessão\n\n` +
                       `💡 *Dica:* Apenas administradores podem usar comandos de controle.`;
    
    await client.sendText(message.from, helpMessage);
    logger.commandExecuted('help', senderNumber, true);
    return true;
  }
  
  // Comando de configuração de tempos
  if (messageBody.startsWith(TIMING_CONFIG_COMMAND.toLowerCase())) {
    if (!isAdmin(senderNumber)) {
      await client.sendText(message.from, '❌ Apenas administradores podem configurar tempos de resposta.');
      return true;
    }
    
    const parts = message.body.trim().split(' ');
    const subCommand = parts[1]?.toLowerCase();
    
    if (!subCommand || subCommand === 'status') {
      const configSummary = timingConfigManager.getConfigSummary();
      await client.sendText(message.from, configSummary);
      logger.commandExecuted('timing_config_status', senderNumber, true);
      return true;
    }
    
    if (subCommand === 'reset') {
      // Recarrega configurações do .env
      timingConfigManager.updateConfig({
        minReadingTime: parseInt(process.env.MIN_READING_TIME || '2000'),
        readingTimePerChar: parseInt(process.env.READING_TIME_PER_CHAR || '50'),
        minThinkingTime: parseInt(process.env.MIN_THINKING_TIME || '1000'),
        maxThinkingTime: parseInt(process.env.MAX_THINKING_TIME || '5000'),
        longBreakChance: parseFloat(process.env.LONG_BREAK_CHANCE || '0.05'),
        longBreakMinTime: parseInt(process.env.LONG_BREAK_MIN_TIME || '5000'),
        longBreakMaxTime: parseInt(process.env.LONG_BREAK_MAX_TIME || '15000')
      });
      
      await client.sendText(message.from, '✅ Configurações de tempo restauradas para os valores padrão do .env');
      logger.commandExecuted('timing_config_reset', senderNumber, true);
      return true;
    }
    
    // Configuração específica: !config_tempos leitura 3000
    if (parts.length >= 3) {
      const configType = parts[1].toLowerCase();
      const value = parseInt(parts[2]);
      
      if (isNaN(value) || value < 0) {
        await client.sendText(message.from, '❌ Valor inválido. Use apenas números positivos.');
        return true;
      }
      
      const updateConfig: any = {};
      let configName = '';
      
      switch (configType) {
        case 'leitura':
        case 'leitura_min':
          updateConfig.minReadingTime = value;
          configName = 'tempo mínimo de leitura';
          break;
        case 'char':
        case 'caractere':
          updateConfig.readingTimePerChar = value;
          configName = 'tempo por caractere';
          break;
        case 'reflexao_min':
        case 'thinking_min':
          updateConfig.minThinkingTime = value;
          configName = 'tempo mínimo de reflexão';
          break;
        case 'reflexao_max':
        case 'thinking_max':
          updateConfig.maxThinkingTime = value;
          configName = 'tempo máximo de reflexão';
          break;
        case 'pausa_min':
        case 'break_min':
          updateConfig.longBreakMinTime = value;
          configName = 'tempo mínimo de pausa longa';
          break;
        case 'pausa_max':
        case 'break_max':
          updateConfig.longBreakMaxTime = value;
          configName = 'tempo máximo de pausa longa';
          break;
        default:
          await client.sendText(message.from, 
            `❌ Configuração inválida. Use:\n` +
            `• leitura <ms> - Tempo mínimo de leitura\n` +
            `• char <ms> - Tempo por caractere\n` +
            `• reflexao_min <ms> - Tempo mín. reflexão\n` +
            `• reflexao_max <ms> - Tempo máx. reflexão\n` +
            `• pausa_min <ms> - Tempo mín. pausa longa\n` +
            `• pausa_max <ms> - Tempo máx. pausa longa`);
          return true;
      }
      
      timingConfigManager.updateConfig(updateConfig);
      await client.sendText(message.from, `✅ ${configName} atualizado para ${value}ms`);
      logger.commandExecuted('timing_config_update', senderNumber, true);
      return true;
    }
    
    // Ajuda do comando
    const helpMessage = `⏱️ *Configuração de Tempos de Resposta*\n\n` +
                       `📋 *Comandos disponíveis:*\n` +
                       `${TIMING_CONFIG_COMMAND} status - Mostra configurações atuais\n` +
                       `${TIMING_CONFIG_COMMAND} reset - Restaura valores padrão\n\n` +
                       `🔧 *Configurações específicas:*\n` +
                       `${TIMING_CONFIG_COMMAND} leitura <ms> - Tempo mínimo de leitura\n` +
                       `${TIMING_CONFIG_COMMAND} char <ms> - Tempo por caractere\n` +
                       `${TIMING_CONFIG_COMMAND} reflexao_min <ms> - Tempo mín. reflexão\n` +
                       `${TIMING_CONFIG_COMMAND} reflexao_max <ms> - Tempo máx. reflexão\n` +
                       `${TIMING_CONFIG_COMMAND} pausa_min <ms> - Tempo mín. pausa longa\n` +
                       `${TIMING_CONFIG_COMMAND} pausa_max <ms> - Tempo máx. pausa longa\n\n` +
                       `💡 *Exemplo:* ${TIMING_CONFIG_COMMAND} leitura 3000`;
    
    await client.sendText(message.from, helpMessage);
    logger.commandExecuted('timing_config_help', senderNumber, true);
    return true;
  }
  
  // Comandos de gerenciamento de prompts
  if (messageBody.startsWith(PROMPT_SESSION_COMMAND.toLowerCase())) {
    if (!isAdmin(senderNumber)) {
      await client.sendText(message.from, '❌ Apenas administradores podem gerenciar prompts de sessão.');
      return true;
    }
    
    try {
      const args = message.body.trim().split(' ').slice(1); // Remove o comando
      const result = await adminCommandsService.executeCommand('prompt_sessao', args, 'default', senderNumber);
      await client.sendText(message.from, result.message);
      logger.commandExecuted('prompt_session', senderNumber, result.success);
    } catch (error) {
      await client.sendText(message.from, `❌ Erro ao processar comando: ${error instanceof Error ? error.message : String(error)}`);
      logger.commandExecuted('prompt_session', senderNumber, false);
    }
    return true;
  }
  
  if (messageBody.startsWith(VIEW_PROMPT_COMMAND.toLowerCase())) {
    if (!isAdmin(senderNumber)) {
      await client.sendText(message.from, '❌ Apenas administradores podem visualizar prompts de sessão.');
      return true;
    }
    
    try {
      const args = message.body.trim().split(' ').slice(1); // Remove o comando
      const result = await adminCommandsService.executeCommand('ver_prompt', args, 'default', senderNumber);
      await client.sendText(message.from, result.message);
      logger.commandExecuted('view_prompt', senderNumber, result.success);
    } catch (error) {
      await client.sendText(message.from, `❌ Erro ao processar comando: ${error instanceof Error ? error.message : String(error)}`);
      logger.commandExecuted('view_prompt', senderNumber, false);
    }
    return true;
  }

  // Comando de prompt do sistema
  if (messageBody.startsWith(SYSTEM_PROMPT_COMMAND.toLowerCase())) {
    if (!isAdmin(senderNumber)) {
      await client.sendText(message.from, '❌ Apenas administradores podem gerenciar prompts do sistema.');
      return true;
    }

    try {
      const args = message.body.trim().split(' ').slice(1);
      const result = await adminCommandsService.executeCommand('prompt_sistema', args, 'default', senderNumber);
      await client.sendText(message.from, result.message);
      logger.commandExecuted('system_prompt', senderNumber, result.success);
    } catch (error) {
      await client.sendText(message.from, `❌ Erro ao processar comando: ${error instanceof Error ? error.message : String(error)}`);
      logger.commandExecuted('system_prompt', senderNumber, false);
    }
    return true;
  }

  // Comandos de monitoramento
  if (messageBody === METRICS_COMMAND.toLowerCase()) {
    if (!isAdmin(senderNumber)) {
      await client.sendText(message.from, '❌ Apenas administradores podem acessar métricas.');
      return true;
    }

    try {
      const result = await adminCommandsService.executeCommand('metricas', [], 'default', senderNumber);
      await client.sendText(message.from, result.message);
      logger.commandExecuted('metrics', senderNumber, result.success);
    } catch (error) {
      await client.sendText(message.from, `❌ Erro ao processar comando: ${error instanceof Error ? error.message : String(error)}`);
      logger.commandExecuted('metrics', senderNumber, false);
    }
    return true;
  }

  if (messageBody === HISTORY_COMMAND.toLowerCase()) {
    if (!isAdmin(senderNumber)) {
      await client.sendText(message.from, '❌ Apenas administradores podem acessar histórico.');
      return true;
    }

    try {
      const result = await adminCommandsService.executeCommand('historico', [], 'default', senderNumber);
      await client.sendText(message.from, result.message);
      logger.commandExecuted('history', senderNumber, result.success);
    } catch (error) {
      await client.sendText(message.from, `❌ Erro ao processar comando: ${error instanceof Error ? error.message : String(error)}`);
      logger.commandExecuted('history', senderNumber, false);
    }
    return true;
  }

  if (messageBody === LOGS_COMMAND.toLowerCase()) {
    if (!isAdmin(senderNumber)) {
      await client.sendText(message.from, '❌ Apenas administradores podem acessar logs.');
      return true;
    }

    try {
      const result = await adminCommandsService.executeCommand('logs', [], 'default', senderNumber);
      await client.sendText(message.from, result.message);
      logger.commandExecuted('logs', senderNumber, result.success);
    } catch (error) {
      await client.sendText(message.from, `❌ Erro ao processar comando: ${error instanceof Error ? error.message : String(error)}`);
      logger.commandExecuted('logs', senderNumber, false);
    }
    return true;
  }

  if (messageBody === PERFORMANCE_COMMAND.toLowerCase()) {
    if (!isAdmin(senderNumber)) {
      await client.sendText(message.from, '❌ Apenas administradores podem acessar dados de performance.');
      return true;
    }

    try {
      const result = await adminCommandsService.executeCommand('performance', [], 'default', senderNumber);
      await client.sendText(message.from, result.message);
      logger.commandExecuted('performance', senderNumber, result.success);
    } catch (error) {
      await client.sendText(message.from, `❌ Erro ao processar comando: ${error instanceof Error ? error.message : String(error)}`);
      logger.commandExecuted('performance', senderNumber, false);
    }
    return true;
  }

  // Comandos de gerenciamento de sessões
  if (messageBody === LIST_SESSIONS_COMMAND.toLowerCase()) {
    if (!isAdmin(senderNumber)) {
      await client.sendText(message.from, '❌ Apenas administradores podem listar sessões.');
      return true;
    }

    try {
      const result = await adminCommandsService.executeCommand('listar_sessoes', [], 'default', senderNumber);
      await client.sendText(message.from, result.message);
      logger.commandExecuted('list_sessions', senderNumber, result.success);
    } catch (error) {
      await client.sendText(message.from, `❌ Erro ao processar comando: ${error instanceof Error ? error.message : String(error)}`);
      logger.commandExecuted('list_sessions', senderNumber, false);
    }
    return true;
  }

  // Processar outros comandos administrativos através do adminCommandsService
  const adminCommands = [
    { command: CREATE_SESSION_COMMAND, key: 'criar_sessao', logKey: 'create_session' },
    { command: ACTIVATE_SESSION_COMMAND, key: 'ativar_sessao', logKey: 'activate_session' },
    { command: DEACTIVATE_SESSION_COMMAND, key: 'desativar_sessao', logKey: 'deactivate_session' },
    { command: CONFIG_SESSION_COMMAND, key: 'config_sessao', logKey: 'config_session' },
    { command: RESTART_SESSION_COMMAND, key: 'reiniciar', logKey: 'restart_session' },
    { command: LIST_USERS_COMMAND, key: 'listar_usuarios', logKey: 'list_users' },
    { command: BLOCK_USER_COMMAND, key: 'bloquear_usuario', logKey: 'block_user' },
    { command: UNBLOCK_USER_COMMAND, key: 'desbloquear_usuario', logKey: 'unblock_user' },
    { command: USER_INFO_COMMAND, key: 'info_usuario', logKey: 'user_info' },
    { command: CLEAR_CONTEXT_COMMAND, key: 'limpar_contexto', logKey: 'clear_context' },
    { command: CONFIG_AI_COMMAND, key: 'config_ia', logKey: 'config_ai' },
    { command: AI_MODEL_COMMAND, key: 'modelo_ia', logKey: 'ai_model' },
    { command: TEMPERATURE_COMMAND, key: 'temperatura', logKey: 'temperature' },
    { command: RESPONSE_TIME_COMMAND, key: 'tempo_resposta', logKey: 'response_time' },
    { command: MESSAGE_DELAY_COMMAND, key: 'delay_mensagem', logKey: 'message_delay' },
    { command: REST_PERIOD_COMMAND, key: 'tempo_descanso', logKey: 'rest_period' },
    { command: WORKING_HOURS_COMMAND, key: 'horario_funcionamento', logKey: 'working_hours' },
    { command: MESSAGE_LIMIT_COMMAND, key: 'limite_mensagens', logKey: 'message_limit' },
    { command: TIMING_WIZARD_COMMAND, key: 'config_timing', logKey: 'timing_wizard' },
    { command: BACKUP_COMMAND, key: 'backup', logKey: 'backup' },
    { command: CLEANUP_COMMAND, key: 'limpeza', logKey: 'cleanup' },
    { command: TEST_CONNECTION_COMMAND, key: 'teste_conexao', logKey: 'test_connection' },
    { command: STATUS_ADMIN_COMMAND, key: 'status', logKey: 'status_admin' },
    { command: INFO_ADMIN_COMMAND, key: 'info', logKey: 'info_admin' },
    { command: CONFIG_ADMIN_COMMAND, key: 'config', logKey: 'config_admin' }
  ];

  for (const adminCmd of adminCommands) {
    if (messageBody.startsWith(adminCmd.command.toLowerCase())) {
      if (!isAdmin(senderNumber)) {
        await client.sendText(message.from, '❌ Apenas administradores podem usar este comando.');
        return true;
      }

      try {
        const args = message.body.trim().split(' ').slice(1);
        const result = await adminCommandsService.executeCommand(adminCmd.key, args, 'default', senderNumber);
        await client.sendText(message.from, result.message);
        logger.commandExecuted(adminCmd.logKey, senderNumber, result.success);
      } catch (error) {
        await client.sendText(message.from, `❌ Erro ao processar comando: ${error instanceof Error ? error.message : String(error)}`);
        logger.commandExecuted(adminCmd.logKey, senderNumber, false);
      }
      return true;
    }
  }

  return false;
}

if (AI_SELECTED === 'GEMINI' && !process.env.GEMINI_KEY) {
  throw Error(
    'Você precisa colocar uma key do Gemini no .env! Crie uma gratuitamente em https://aistudio.google.com/app/apikey?hl=pt-br'
  );
}

if (
  AI_SELECTED === 'GPT' &&
  (!process.env.OPENAI_KEY || !process.env.OPENAI_ASSISTANT)
) {
  throw Error(
    'Para utilizar o GPT você precisa colocar no .env a sua key da openai e o id do seu assistante.'
  );
}

if (env.whatsappProvider === 'evolution') {
  console.log('📡 Using Evolution API provider');
  // For Evolution, we don't instantiate a local puppeteer client; just expose health server
  // and rely on evolutionClient for messaging operations.
  logger.info('Evolution provider active; skipping local WPPConnect startup');
  sessionStatus.status = 'running';
  sessionStatus.connected = true;
} else {
  wppconnect
  .create({
    session: SESSION_NAME,
    catchQR: (base64Qrimg, asciiQR, attempts, urlCode) => {
      logger.info(`[${SESSION_NAME}] Tentativa ${attempts} de leitura do QR code`);
      console.log(`[${SESSION_NAME}] Terminal qr code: `, asciiQR);
    },
    statusFind: (statusSession, session) => {
      logger.info(`[${SESSION_NAME}] Status da sessão: ${statusSession}`);
      logger.info(`[${SESSION_NAME}] Nome da sessão: ${session}`);
    },
    headless: 'new' as any,
    devtools: false,
    useChrome: true,
    debug: false,
    logQR: true,
    browserWS: '',
    browserArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
    puppeteerOptions: {},
    disableWelcome: true,
    updatesLog: true,
    autoClose: 60000,
    tokenStore: 'file',
    folderNameToken: `./tokens/${SESSION_NAME}`,
  })
  .then((client) => {
    logger.info(`🚀 [${SESSION_NAME}] Cliente WhatsApp criado com sucesso na porta ${SESSION_PORT}!`);
    console.log(`🚀 [${SESSION_NAME}] Cliente WhatsApp criado com sucesso na porta ${SESSION_PORT}!`);
    return start(client);
  })
  .catch((erro) => {
    logger.error(`❌ [${SESSION_NAME}] Erro ao criar cliente WhatsApp:`, { error: erro });
    console.error(`❌ [${SESSION_NAME}] Erro ao criar cliente WhatsApp:`, erro);
    process.exit(1);
  });
}

async function start(client: wppconnect.Whatsapp): Promise<void> {
  logger.info(`🤖 [${SESSION_NAME}] Bot iniciado com sucesso na porta ${SESSION_PORT}!`);
  console.log(`🤖 [${SESSION_NAME}] Bot iniciado e aguardando mensagens...`);
  logger.connectionStatus('connected');
  
  // Atualizar status da sessão
  sessionStatus.status = 'running';
  sessionStatus.connected = true;
  sessionStatus.lastActivity = new Date();
  
  client.onMessage((message) => {
    (async () => {
      console.log('[DEBUG] Mensagem recebida:', {
        type: message.type,
        isGroupMsg: message.isGroupMsg,
        chatId: message.chatId,
        from: message.from,
        body: message.body
      });
      
      if (
        message.type === 'chat' &&
        !message.isGroupMsg &&
        message.chatId !== 'status@broadcast'
      ) {
        console.log('[DEBUG] Mensagem passou no filtro inicial');
        const chatId = message.chatId;
        const fromNumber = typeof message.from === 'string' ? message.from : (message.from as any)?._serialized || '';
        
        if (!message.body || typeof message.body !== 'string') {
          console.log('[DEBUG] Mensagem rejeitada - body inválido:', message.body);
          return;
        }
        
        console.log('[DEBUG] Processando mensagem de:', fromNumber);
        logger.messageReceived(fromNumber, message.body);
        
        // Primeiro, verifica se é um comando de controle
        console.log('[DEBUG] Verificando comando de controle:', message.body);
        if (await processControlCommand(message, client)) {
          console.log('[DEBUG] Comando de controle detectado, processando...');
          return; // Se foi um comando de controle, não processa mais nada
        }
        
        // Verifica se o bot está em modo de manutenção
        console.log('[DEBUG] Verificando modo de manutenção:', !maintenanceManager.shouldProcessMessage());
        if (!maintenanceManager.shouldProcessMessage()) {
          console.log('[DEBUG] Bot em manutenção, enviando mensagem...');
          const maintenanceResponse = maintenanceManager.getMaintenanceResponse();
          await client.sendText(fromNumber, maintenanceResponse);
          logger.messageSent(fromNumber, maintenanceResponse);
          return;
        }
        
        // Verifica se o bot está ativo
        console.log('[DEBUG] Bot ativo?', BOT_ACTIVE);
        if (!BOT_ACTIVE) {
          console.log('[DEBUG] Bot inativo, ignorando mensagem');
          logger.debug('Bot pausado - ignorando mensagem', { from: fromNumber });
          return;
        }
        
        // Verifica filtros de blacklist/whitelist
        console.log('[DEBUG] Verificando filtro de número para:', fromNumber);
        if (!numberFilter.shouldProcessMessage(fromNumber)) {
          console.log('[DEBUG] Número não permitido pelo filtro');
          return; // Mensagem filtrada
        }
        
        // Normaliza os tipos para string
        const normalizedFromNumber = typeof fromNumber === 'string' ? fromNumber : (fromNumber as any)?._serialized || '';
        const normalizedChatId = typeof chatId === 'string' ? chatId : (chatId as any)?._serialized || '';
        
        // Verifica se o contato está pausado individualmente
        if (contactPauseManager.isContactPaused(normalizedFromNumber)) {
          logger.debug('Contato pausado individualmente - ignorando mensagem', { from: normalizedFromNumber });
          return;
        }
        
        console.log('[DEBUG] Iniciando processamento com IA...');
        
        // Salva a mensagem do usuário no banco de dados
        try {
          // Atualizar atividade da sessão
          sessionStatus.lastActivity = new Date();
          sessionStatus.messagesProcessed++;
          
          await sessionManager.saveMessage(
            normalizedFromNumber,
            'default', // sessionName
            message.body || '',
            'user',
            { timestamp: new Date().toISOString() }
          );
          logger.debug('Mensagem do usuário salva no banco', { from: normalizedFromNumber });
        } catch (error) {
          logger.error('Erro ao salvar mensagem do usuário', { 
            error: error instanceof Error ? error.message : String(error),
            from: normalizedFromNumber 
          });
        }

        // Análise de contexto da mensagem
        let contextAnalysis;
        try {
          contextAnalysis = await contextEngineService.analyzeMessage(
            message.body || '',
            normalizedFromNumber,
            'default'
          );
          logger.debug('Contexto da mensagem analisado', { 
            from: normalizedFromNumber,
            sentiment: contextAnalysis.sentiment,
            intent: contextAnalysis.intent 
          });
        } catch (error) {
          logger.error('Erro ao analisar contexto da mensagem', { 
            error: error instanceof Error ? error.message : String(error),
            from: normalizedFromNumber 
          });
        }
        
        if (AI_SELECTED === 'GPT') {
          await initializeNewAIChatSession(normalizedChatId);
        }

        if (!messageBufferPerChatId.has(normalizedChatId)) {
          messageBufferPerChatId.set(normalizedChatId, [message.body]);
        } else {
          messageBufferPerChatId.set(normalizedChatId, [
            ...messageBufferPerChatId.get(normalizedChatId),
            message.body,
          ]);
        }

        if (messageTimeouts.has(normalizedChatId)) {
          clearTimeout(messageTimeouts.get(normalizedChatId));
        }
        console.log('Aguardando novas mensagens...');
        
        // Calcula delay usando o novo sistema de configuração de tempos
        const messageLength = message.body?.length || 0;
        const delayInfo = timingConfigManager.calculateResponseDelay(messageLength);
        
        console.log(delayInfo.description);
        
        messageTimeouts.set(
          normalizedChatId,
          setTimeout(() => {
            (async () => {
              // Simula tempo de leitura da mensagem
              await new Promise(resolve => setTimeout(resolve, delayInfo.delay));
              
              const currentMessage = !messageBufferPerChatId.has(normalizedChatId)
                ? (message.body || '')
                : [...messageBufferPerChatId.get(normalizedChatId)].join(' \n ');
              let answer = '';
              
              try {
                // Consultar histórico de conversas e gerar prompt personalizado
                let personalizedPrompt = currentMessage;
                let conversationHistory: any[] = [];
                
                try {
                  // Verificar se existe prompt personalizado para a sessão
                  const customPrompt = await databaseService.getSessionPrompt('default');
                  
                  conversationHistory = await sessionManager.getConversationHistory(
                    normalizedFromNumber,
                    'default',
                    10 // últimas 10 mensagens
                  );
                  
                  const userProfile = await contextEngineService.getUserProfile(
                    normalizedFromNumber,
                    'default'
                  );
                  
                  const conversationContext = await contextEngineService.getConversationContext(
                    normalizedFromNumber,
                    'default'
                  );
                  
                  // Usar prompt personalizado se disponível, senão usar o gerado automaticamente
                  if (customPrompt) {
                    personalizedPrompt = `${customPrompt}\n\nMensagem do usuário: ${currentMessage}`;
                    logger.debug('Usando prompt personalizado da sessão', { 
                      from: normalizedFromNumber,
                      customPromptLength: customPrompt.length
                    });
                  } else {
                    personalizedPrompt = await contextEngineService.generatePersonalizedPrompt(
                      normalizedFromNumber,
                      'default',
                      currentMessage
                    );
                  }
                  
                  logger.debug('Prompt personalizado gerado', { 
                    from: normalizedFromNumber,
                    historyLength: conversationHistory.length,
                    userStyle: userProfile.interaction_style,
                    currentTopic: conversationContext.current_topic
                  });
                } catch (contextError) {
                  logger.error('Erro ao gerar contexto personalizado, usando mensagem original', { 
                    error: contextError instanceof Error ? contextError.message : String(contextError),
                    from: normalizedFromNumber 
                  });
                }
                
                for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                  try {
                    const currentAI = AI_MODEL_OVERRIDE || AI_SELECTED;
                if (currentAI === 'GPT') {
                  answer = await mainOpenAI({
                    currentMessage: personalizedPrompt,
                    chatId: normalizedChatId,
                    conversationHistory: conversationHistory,
                  });
                } else {
                  answer = await mainGoogle({
                    currentMessage: personalizedPrompt,
                    chatId: normalizedChatId,
                    conversationHistory: conversationHistory,
                  });
                }
                    break;
                  } catch (error) {
                    if (attempt === MAX_RETRIES) {
                      throw error;
                    }
                  }
                }
                
                logger.aiResponse(AI_SELECTED, 0);
                
                const messages = splitMessages(answer);
                console.log('Enviando mensagens...');
                await sendMessagesWithDelay({
                  messages,
                  client,
                  targetNumber: normalizedFromNumber,
                });
                
                // Salva a resposta da IA no banco de dados
                try {
                  const fullResponse = messages.join(' ');
                  await sessionManager.saveMessage(
                    normalizedFromNumber,
                    'default', // sessionName
                    fullResponse,
                    'assistant',
                    { timestamp: new Date().toISOString(), aiModel: AI_SELECTED }
                  );
                  logger.debug('Resposta da IA salva no banco', { from: normalizedFromNumber });
                  
                  // Atualiza o perfil do usuário após a interação
                  try {
                    await contextEngineService.analyzeMessage(
                      fullResponse,
                      normalizedFromNumber,
                      'default'
                    );
                    logger.debug('Perfil do usuário atualizado após resposta da IA', { from: normalizedFromNumber });
                  } catch (profileError) {
                    logger.error('Erro ao atualizar perfil do usuário', {
                      error: profileError instanceof Error ? profileError.message : String(profileError),
                      from: normalizedFromNumber
                    });
                  }
                } catch (saveError) {
                  logger.error('Erro ao salvar resposta da IA', { 
                    error: saveError instanceof Error ? saveError.message : String(saveError),
                    from: normalizedFromNumber 
                  });
                }
                
                // Log das mensagens enviadas
                messages.forEach(msg => {
                  logger.messageSent(normalizedFromNumber, msg);
                });
                
              } catch (error) {
                // Atualizar contador de erros
                sessionStatus.errors++;
                
                logger.error('Erro ao processar mensagem com IA', { 
                  error: error instanceof Error ? error.message : String(error),
                  from: normalizedFromNumber,
                  message: currentMessage 
                });
                
                const errorMessage = 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes.';
                await client.sendText(fromNumber, errorMessage);
                logger.messageSent(fromNumber, errorMessage);
              }
              
              messageBufferPerChatId.delete(chatId);
              messageTimeouts.delete(chatId);
            })();
          }, 15000)
        );
      }
    })();
  });
}

// Exportar função para testes
export { processControlCommand };
