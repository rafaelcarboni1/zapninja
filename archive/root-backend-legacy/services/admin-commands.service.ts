import { databaseService } from './database.service';
import { sessionManager } from './session.manager';
import type { WhatsAppSession } from '../config/supabase';

/**
 * Interface para resposta de comandos administrativos
 */
interface CommandResponse {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Interface para sugestões de comandos
 */
interface CommandSuggestion {
  command: string;
  description: string;
  example: string;
}

/**
 * Serviço de comandos administrativos
 * Implementa todos os comandos de gerenciamento do sistema de IA
 */
export class AdminCommandsService {
  private commands = new Map<string, Function>();

  constructor() {
    this.initializeCommands();
  }

  /**
   * Inicializa todos os comandos disponíveis
   */
  private initializeCommands(): void {
    // Comandos básicos
    this.commands.set('ajuda', this.showHelp.bind(this));
    this.commands.set('help', this.showHelp.bind(this));
    this.commands.set('status', this.getStatus.bind(this));
    this.commands.set('info', this.getInfo.bind(this));
    this.commands.set('config', this.setConfig.bind(this));
    
    // Gerenciamento de sessões
    this.commands.set('listar_sessoes', this.listSessions.bind(this));
    this.commands.set('criar_sessao', this.createSession.bind(this));
    this.commands.set('ativar_sessao', this.activateSession.bind(this));
    this.commands.set('desativar_sessao', this.deactivateSession.bind(this));
    this.commands.set('config_sessao', this.configureSession.bind(this));
    
    // Gerenciamento de usuários
    this.commands.set('listar_usuarios', this.listUsers.bind(this));
    this.commands.set('bloquear_usuario', this.blockUser.bind(this));
    this.commands.set('desbloquear_usuario', this.unblockUser.bind(this));
    this.commands.set('info_usuario', this.getUserInfo.bind(this));
    this.commands.set('limpar_contexto', this.clearUserContext.bind(this));
    
    // Configurações de IA
    this.commands.set('config_ia', this.configureAI.bind(this));
    this.commands.set('prompt_sistema', this.setSystemPrompt.bind(this));
    this.commands.set('prompt_sessao', this.setSessionPrompt.bind(this));
    this.commands.set('ver_prompt', this.getSessionPrompt.bind(this));
    this.commands.set('modelo_ia', this.setAIModel.bind(this));
    this.commands.set('temperatura', this.setTemperature.bind(this));
    
    // Comandos de timing (novos)
    this.commands.set('tempo_resposta', this.setResponseTime.bind(this));
    this.commands.set('delay_mensagem', this.setMessageDelay.bind(this));
    this.commands.set('tempo_descanso', this.setRestPeriod.bind(this));
    this.commands.set('horario_funcionamento', this.setWorkingHours.bind(this));
    this.commands.set('limite_mensagens', this.setMessageLimit.bind(this));
    this.commands.set('config_timing', this.startTimingWizard.bind(this));
    
    // Monitoramento e métricas
    this.commands.set('metricas', this.getMetrics.bind(this));
    this.commands.set('historico', this.getHistory.bind(this));
    this.commands.set('logs', this.getLogs.bind(this));
    this.commands.set('performance', this.getPerformance.bind(this));
    
    // Manutenção
    this.commands.set('backup', this.createBackup.bind(this));
    this.commands.set('limpeza', this.cleanupData.bind(this));
    this.commands.set('reiniciar', this.restartSession.bind(this));
    this.commands.set('teste_conexao', this.testConnection.bind(this));
    
    console.log(`✅ ${this.commands.size} comandos administrativos carregados`);
  }

  /**
   * Executa um comando administrativo
   */
  async executeCommand(command: string, args: string[], sessionName: string, adminPhone: string): Promise<CommandResponse> {
    try {
      // Buscar session_id pelo session_name
      const session = await sessionManager.getSession(sessionName);
      if (!session) {
        return {
          success: false,
          message: `❌ Sessão '${sessionName}' não encontrada.`
        };
      }
      
      // Registrar execução do comando
      await databaseService.logAdminCommand({
        session_id: session.id,
        command_name: command,
        parameters: args,
        executed_by: adminPhone,
        execution_result: { success: true, message: 'Command executed' }
      });

      // Verificar se comando existe
      const commandFunction = this.commands.get(command.toLowerCase());
      
      if (!commandFunction) {
        return {
          success: false,
          message: `❌ Comando '${command}' não encontrado. Use !ajuda para ver comandos disponíveis.`
        };
      }

      // Executar comando
      const result = await commandFunction(args, sessionName, adminPhone);
      
      return result;
    } catch (error) {
      console.error(`❌ Erro ao executar comando ${command}:`, error);
      return {
        success: false,
        message: `❌ Erro interno ao executar comando: ${error}`
      };
    }
  }

  /**
   * Obtém informações sobre um comando específico
   */
  getCommandInfo(commandName: string): { exists: boolean; description?: string; usage?: string } {
    const commandMap: Record<string, { description: string; usage: string }> = {
      'ajuda': {
        description: 'Exibe a lista de comandos disponíveis',
        usage: '/ajuda [comando]'
      },
      'help': {
        description: 'Shows available commands list',
        usage: '/help [command]'
      },
      'status': {
        description: 'Mostra o status atual da sessão',
        usage: '/status'
      },
      'info': {
        description: 'Exibe informações detalhadas da sessão',
        usage: '/info'
      },
      'config': {
        description: 'Define configurações do sistema',
        usage: '/config <chave> <valor>'
      },
      'listar_sessoes': {
        description: 'Lista todas as sessões disponíveis',
        usage: '/listar_sessoes'
      },
      'criar_sessao': {
        description: 'Cria uma nova sessão',
        usage: '/criar_sessao <nome>'
      },
      'ativar_sessao': {
        description: 'Ativa uma sessão específica',
        usage: '/ativar_sessao <nome>'
      },
      'desativar_sessao': {
        description: 'Desativa uma sessão específica',
        usage: '/desativar_sessao <nome>'
      }
    };

    const info = commandMap[commandName];
    if (info) {
      return {
        exists: true,
        description: info.description,
        usage: info.usage
      };
    }

    return { exists: false };
  }

  /**
   * Gera sugestões de comandos baseadas no input
   */
  getSuggestions(input: string): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];
    const inputLower = input.toLowerCase();

    // Sugestões baseadas em palavras-chave
    const keywordSuggestions = {
      'sessao': [
        { command: '!listar_sessoes', description: 'Lista todas as sessões', example: '!listar_sessoes' },
        { command: '!criar_sessao', description: 'Cria nova sessão', example: '!criar_sessao nome_sessao' },
        { command: '!config_sessao', description: 'Configura sessão', example: '!config_sessao nome_sessao' }
      ],
      'usuario': [
        { command: '!listar_usuarios', description: 'Lista usuários da sessão', example: '!listar_usuarios' },
        { command: '!info_usuario', description: 'Informações do usuário', example: '!info_usuario +5511999999999' },
        { command: '!bloquear_usuario', description: 'Bloqueia usuário', example: '!bloquear_usuario +5511999999999' }
      ],
      'tempo': [
        { command: '!tempo_resposta', description: 'Define tempo de resposta', example: '!tempo_resposta 2000' },
        { command: '!config_timing', description: 'Wizard de configuração de timing', example: '!config_timing' },
        { command: '!horario_funcionamento', description: 'Define horário de funcionamento', example: '!horario_funcionamento 08:00 18:00' }
      ],
      'ia': [
        { command: '!config_ia', description: 'Configura parâmetros da IA', example: '!config_ia' },
        { command: '!modelo_ia', description: 'Define modelo da IA', example: '!modelo_ia gpt-4' },
        { command: '!prompt_sistema', description: 'Define prompt do sistema', example: '!prompt_sistema "Novo prompt"' },
      { command: '!prompt_sessao', description: 'Define prompt personalizado para sessão', example: '!prompt_sessao vendas "Você é um assistente de vendas"' },
      { command: '!ver_prompt', description: 'Visualiza prompt atual da sessão', example: '!ver_prompt vendas' }
      ],
      'metrica': [
        { command: '!metricas', description: 'Exibe métricas do sistema', example: '!metricas' },
        { command: '!performance', description: 'Análise de performance', example: '!performance' },
        { command: '!historico', description: 'Histórico de comandos', example: '!historico' }
      ]
    };

    // Buscar sugestões por palavra-chave
    for (const [keyword, commandList] of Object.entries(keywordSuggestions)) {
      if (inputLower.includes(keyword)) {
        suggestions.push(...commandList);
      }
    }

    // Se não encontrou sugestões específicas, mostrar comandos mais usados
    if (suggestions.length === 0) {
      suggestions.push(
        { command: '!ajuda', description: 'Mostra todos os comandos', example: '!ajuda' },
        { command: '!status', description: 'Status do sistema', example: '!status' },
        { command: '!listar_sessoes', description: 'Lista sessões ativas', example: '!listar_sessoes' },
        { command: '!config_timing', description: 'Configurar timing', example: '!config_timing' }
      );
    }

    return suggestions.slice(0, 5); // Máximo 5 sugestões
  }

  // ==================== COMANDOS BÁSICOS ====================

  private async showHelp(args: string[]): Promise<CommandResponse> {
    const helpText = `
🤖 *COMANDOS ADMINISTRATIVOS DISPONÍVEIS*

*📋 BÁSICOS:*
!ajuda - Mostra esta ajuda
!status - Status do sistema
!info - Informações detalhadas

*🔧 SESSÕES:*
!listar_sessoes - Lista todas as sessões
!criar_sessao [nome] - Cria nova sessão
!ativar_sessao [nome] - Ativa sessão
!desativar_sessao [nome] - Desativa sessão
!config_sessao [nome] - Configura sessão

*👥 USUÁRIOS:*
!listar_usuarios - Lista usuários da sessão
!info_usuario [telefone] - Info do usuário
!bloquear_usuario [telefone] - Bloqueia usuário
!desbloquear_usuario [telefone] - Desbloqueia
!limpar_contexto [telefone] - Limpa contexto

*🤖 IA:*
!config_ia - Configura parâmetros da IA
!prompt_sistema [texto] - Define prompt
!modelo_ia [modelo] - Define modelo
!temperatura [0.0-2.0] - Define temperatura

*⏰ TIMING (NOVO):*
!tempo_resposta [ms] - Tempo de resposta
!delay_mensagem [ms] - Delay entre mensagens
!tempo_descanso [ms] - Período de descanso
!horario_funcionamento [inicio] [fim] - Horário
!limite_mensagens [numero] - Limite por hora
!config_timing - Wizard de configuração

*📊 MONITORAMENTO:*
!metricas - Métricas do sistema
!performance - Análise de performance
!historico - Histórico de comandos
!logs - Logs do sistema

*🔧 MANUTENÇÃO:*
!backup - Criar backup
!limpeza - Limpar dados antigos
!reiniciar - Reiniciar sessão
!teste_conexao - Testar conexão

*Exemplo:* !tempo_resposta 3000
*Dica:* Use !config_timing para configuração guiada`;

    return {
      success: true,
      message: helpText
    };
  }

  private async getStatus(args: string[], sessionName: string): Promise<CommandResponse> {
    try {
      const session = await sessionManager.getSession(sessionName);
      const stats = await sessionManager.getSessionStats(sessionName);
      const connectionOk = await databaseService.testConnection();

      const statusText = `
🔍 *STATUS DO SISTEMA*

*Sessão:* ${sessionName}
*Status:* ${session?.is_active ? '🟢 Ativa' : '🔴 Inativa'}
*Conexão DB:* ${connectionOk ? '🟢 OK' : '🔴 Erro'}

*📊 Estatísticas (24h):*
• Mensagens: ${stats?.last_24h?.messages || 0}
• Usuários ativos: ${stats?.last_24h?.active_users || 0}

*⚙️ Configurações:*
• Modelo IA: ${session?.ai_config?.model || 'N/A'}
• Tempo resposta: ${session?.timing_config?.response_time || 2000}ms
• Horário: ${session?.timing_config?.working_hours?.start || '00:00'} - ${session?.timing_config?.working_hours?.end || '23:59'}`;

      return {
        success: true,
        message: statusText,
        data: { session, stats, connectionOk }
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Erro ao obter status: ${error}`
      };
    }
  }

  private async getInfo(args: string[], sessionName: string): Promise<CommandResponse> {
    try {
      const activeSessions = sessionManager.getActiveSessions();
      const totalCommands = this.commands.size;
      
      const infoText = `
📋 *INFORMAÇÕES DO SISTEMA*

*🔧 Sistema:*
• Versão: 2.0.0
• Comandos disponíveis: ${totalCommands}
• Sessões ativas: ${activeSessions.length}

*📱 Sessão atual:*
• Nome: ${sessionName}
• Status: ${sessionManager.isSessionActive(sessionName) ? '🟢 Ativa' : '🔴 Inativa'}

*🆕 Novidades:*
• ✅ Sistema de timing avançado
• ✅ Comandos de configuração de horário
• ✅ Controle de delay e descanso
• ✅ Wizard de configuração (!config_timing)
• ✅ Métricas aprimoradas
• ✅ Sugestões inteligentes

*💡 Dica:* Use !config_timing para configurar todos os tempos de uma vez!`;

      return {
        success: true,
        message: infoText
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Erro ao obter informações: ${error}`
      };
    }
  }

  // ==================== COMANDOS DE TIMING (NOVOS) ====================

  private async setResponseTime(args: string[], sessionName: string): Promise<CommandResponse> {
    try {
      if (args.length === 0) {
        return {
          success: false,
          message: '❌ Uso: !tempo_resposta [milissegundos]\nExemplo: !tempo_resposta 3000'
        };
      }

      const responseTime = parseInt(args[0]);
      
      if (isNaN(responseTime) || responseTime < 500 || responseTime > 30000) {
        return {
          success: false,
          message: '❌ Tempo deve ser entre 500ms e 30000ms (30 segundos)'
        };
      }

      const session = await sessionManager.getSession(sessionName);
      if (!session) {
        return {
          success: false,
          message: '❌ Sessão não encontrada'
        };
      }

      const updatedTimingConfig = {
        ...session.timing_config,
        response_time: responseTime
      };

      const success = await sessionManager.updateSessionConfig(sessionName, {
        timing_config: updatedTimingConfig
      });

      if (success) {
        return {
          success: true,
          message: `✅ Tempo de resposta definido para ${responseTime}ms\n\n⏱️ A IA agora aguardará ${responseTime/1000}s antes de responder para simular digitação humana.`
        };
      } else {
        return {
          success: false,
          message: '❌ Erro ao atualizar configuração'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ Erro ao definir tempo de resposta: ${error}`
      };
    }
  }

  private async setMessageDelay(args: string[], sessionName: string): Promise<CommandResponse> {
    try {
      if (args.length === 0) {
        return {
          success: false,
          message: '❌ Uso: !delay_mensagem [milissegundos]\nExemplo: !delay_mensagem 1500'
        };
      }

      const messageDelay = parseInt(args[0]);
      
      if (isNaN(messageDelay) || messageDelay < 0 || messageDelay > 10000) {
        return {
          success: false,
          message: '❌ Delay deve ser entre 0ms e 10000ms (10 segundos)'
        };
      }

      const session = await sessionManager.getSession(sessionName);
      if (!session) {
        return {
          success: false,
          message: '❌ Sessão não encontrada'
        };
      }

      const updatedTimingConfig = {
        ...session.timing_config,
        message_delay: messageDelay
      };

      const success = await sessionManager.updateSessionConfig(sessionName, {
        timing_config: updatedTimingConfig
      });

      if (success) {
        return {
          success: true,
          message: `✅ Delay entre mensagens definido para ${messageDelay}ms\n\n⏱️ Haverá uma pausa de ${messageDelay/1000}s entre mensagens consecutivas.`
        };
      } else {
        return {
          success: false,
          message: '❌ Erro ao atualizar configuração'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ Erro ao definir delay: ${error}`
      };
    }
  }

  private async setRestPeriod(args: string[], sessionName: string): Promise<CommandResponse> {
    try {
      if (args.length === 0) {
        return {
          success: false,
          message: '❌ Uso: !tempo_descanso [milissegundos]\nExemplo: !tempo_descanso 5000\n\n💡 0 = sem descanso'
        };
      }

      const restPeriod = parseInt(args[0]);
      
      if (isNaN(restPeriod) || restPeriod < 0 || restPeriod > 60000) {
        return {
          success: false,
          message: '❌ Período deve ser entre 0ms e 60000ms (1 minuto)'
        };
      }

      const session = await sessionManager.getSession(sessionName);
      if (!session) {
        return {
          success: false,
          message: '❌ Sessão não encontrada'
        };
      }

      const updatedTimingConfig = {
        ...session.timing_config,
        rest_period: restPeriod
      };

      const success = await sessionManager.updateSessionConfig(sessionName, {
        timing_config: updatedTimingConfig
      });

      if (success) {
        const message = restPeriod === 0 
          ? '✅ Período de descanso desabilitado\n\n🔄 A IA responderá continuamente sem pausas.'
          : `✅ Período de descanso definido para ${restPeriod}ms\n\n😴 A IA fará pausas de ${restPeriod/1000}s periodicamente para simular comportamento humano.`;
        
        return {
          success: true,
          message
        };
      } else {
        return {
          success: false,
          message: '❌ Erro ao atualizar configuração'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ Erro ao definir período de descanso: ${error}`
      };
    }
  }

  private async setWorkingHours(args: string[], sessionName: string): Promise<CommandResponse> {
    try {
      if (args.length < 2) {
        return {
          success: false,
          message: '❌ Uso: !horario_funcionamento [inicio] [fim]\nExemplo: !horario_funcionamento 08:00 18:00\n\n💡 Use 00:00 23:59 para 24h'
        };
      }

      const startTime = args[0];
      const endTime = args[1];
      
      // Validar formato de hora (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        return {
          success: false,
          message: '❌ Formato inválido. Use HH:MM (ex: 08:00, 18:30)'
        };
      }

      const session = await sessionManager.getSession(sessionName);
      if (!session) {
        return {
          success: false,
          message: '❌ Sessão não encontrada'
        };
      }

      const updatedTimingConfig = {
        ...session.timing_config,
        working_hours: {
          start: startTime,
          end: endTime
        }
      };

      const success = await sessionManager.updateSessionConfig(sessionName, {
        timing_config: updatedTimingConfig
      });

      if (success) {
        const is24h = startTime === '00:00' && endTime === '23:59';
        const message = is24h 
          ? '✅ Horário de funcionamento: 24 horas\n\n🔄 A IA funcionará continuamente.'
          : `✅ Horário de funcionamento: ${startTime} às ${endTime}\n\n⏰ A IA só responderá neste período. Fora do horário, mensagens serão enfileiradas.`;
        
        return {
          success: true,
          message
        };
      } else {
        return {
          success: false,
          message: '❌ Erro ao atualizar configuração'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ Erro ao definir horário: ${error}`
      };
    }
  }

  private async setMessageLimit(args: string[], sessionName: string): Promise<CommandResponse> {
    try {
      if (args.length === 0) {
        return {
          success: false,
          message: '❌ Uso: !limite_mensagens [numero]\nExemplo: !limite_mensagens 50\n\n💡 0 = sem limite'
        };
      }

      const messageLimit = parseInt(args[0]);
      
      if (isNaN(messageLimit) || messageLimit < 0 || messageLimit > 1000) {
        return {
          success: false,
          message: '❌ Limite deve ser entre 0 e 1000 mensagens por hora'
        };
      }

      const session = await sessionManager.getSession(sessionName);
      if (!session) {
        return {
          success: false,
          message: '❌ Sessão não encontrada'
        };
      }

      const updatedTimingConfig = {
        ...session.timing_config,
        message_limit: messageLimit
      };

      const success = await sessionManager.updateSessionConfig(sessionName, {
        timing_config: updatedTimingConfig
      });

      if (success) {
        const message = messageLimit === 0 
          ? '✅ Limite de mensagens removido\n\n🔄 Usuários podem enviar mensagens ilimitadas.'
          : `✅ Limite definido para ${messageLimit} mensagens/hora por usuário\n\n🛡️ Proteção contra spam ativada. Usuários que excederem o limite receberão aviso.`;
        
        return {
          success: true,
          message
        };
      } else {
        return {
          success: false,
          message: '❌ Erro ao atualizar configuração'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ Erro ao definir limite: ${error}`
      };
    }
  }

  private async startTimingWizard(args: string[], sessionName: string): Promise<CommandResponse> {
    try {
      const session = await sessionManager.getSession(sessionName);
      if (!session) {
        return {
          success: false,
          message: '❌ Sessão não encontrada'
        };
      }

      const currentConfig = session.timing_config || {};
      
      const wizardText = `
🧙‍♂️ *WIZARD DE CONFIGURAÇÃO DE TIMING*

*📋 Configurações atuais:*
• Tempo de resposta: ${currentConfig.response_time || 2000}ms
• Delay entre mensagens: ${currentConfig.message_delay || 1000}ms
• Período de descanso: ${currentConfig.rest_period || 0}ms
• Horário: ${currentConfig.working_hours?.start || '00:00'} - ${currentConfig.working_hours?.end || '23:59'}
• Limite de mensagens: ${currentConfig.message_limit || 100}/hora
• Simulação de digitação: ${currentConfig.typing_simulation ? '✅' : '❌'}

*🔧 Comandos para alterar:*

1️⃣ !tempo_resposta [ms] - Tempo antes de responder
   Exemplo: !tempo_resposta 3000

2️⃣ !delay_mensagem [ms] - Pausa entre mensagens
   Exemplo: !delay_mensagem 1500

3️⃣ !tempo_descanso [ms] - Pausas periódicas
   Exemplo: !tempo_descanso 5000

4️⃣ !horario_funcionamento [inicio] [fim]
   Exemplo: !horario_funcionamento 08:00 18:00

5️⃣ !limite_mensagens [numero] - Limite por usuário/hora
   Exemplo: !limite_mensagens 50

*💡 Configurações recomendadas:*

🏢 **Empresarial:**
• Tempo resposta: 2000ms
• Horário: 08:00 18:00
• Limite: 30 mensagens/hora

🤖 **Chatbot rápido:**
• Tempo resposta: 1000ms
• Sem limite de horário
• Limite: 100 mensagens/hora

👤 **Humano realista:**
• Tempo resposta: 4000ms
• Delay: 2000ms
• Descanso: 10000ms

*🎯 Digite o comando desejado ou !status para ver resultado!*`;

      return {
        success: true,
        message: wizardText,
        data: { currentConfig }
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Erro no wizard: ${error}`
      };
    }
  }

  // ==================== OUTROS COMANDOS ====================
  // (Implementar os demais comandos: sessões, usuários, IA, métricas, etc.)
  // Por brevidade, incluindo apenas alguns exemplos principais

  private async listSessions(args: string[]): Promise<CommandResponse> {
    try {
      const sessions = await databaseService.getActiveSessions();
      
      if (sessions.length === 0) {
        return {
          success: true,
          message: '📋 Nenhuma sessão ativa encontrada.'
        };
      }

      let sessionList = '📋 *SESSÕES ATIVAS:*\n\n';
      
      for (const session of sessions) {
        const stats = await sessionManager.getSessionStats(session.session_name);
        sessionList += `🔹 *${session.session_name}*\n`;
        sessionList += `   Status: ${session.is_active ? '🟢 Ativa' : '🔴 Inativa'}\n`;
        sessionList += `   Mensagens 24h: ${stats?.last_24h?.messages || 0}\n`;
        sessionList += `   Usuários ativos: ${stats?.last_24h?.active_users || 0}\n\n`;
      }

      return {
        success: true,
        message: sessionList,
        data: sessions
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Erro ao listar sessões: ${error}`
      };
    }
  }

  private async testConnection(args: string[]): Promise<CommandResponse> {
    try {
      const isConnected = await databaseService.testConnection();
      
      return {
        success: isConnected,
        message: isConnected 
          ? '✅ Conexão com banco de dados OK' 
          : '❌ Falha na conexão com banco de dados'
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Erro ao testar conexão: ${error}`
      };
    }
  }

  // Implementar demais comandos conforme necessário...
  private async createSession(args: string[]): Promise<CommandResponse> {
    // TODO: Implementar criação de sessão
    return { success: false, message: 'Comando em desenvolvimento' };
  }

  private async activateSession(args: string[]): Promise<CommandResponse> {
    // TODO: Implementar ativação de sessão
    return { success: false, message: 'Comando em desenvolvimento' };
  }

  private async deactivateSession(args: string[]): Promise<CommandResponse> {
    // TODO: Implementar desativação de sessão
    return { success: false, message: 'Comando em desenvolvimento' };
  }

  private async configureSession(args: string[]): Promise<CommandResponse> {
    // TODO: Implementar configuração de sessão
    return { success: false, message: 'Comando em desenvolvimento' };
  }

  private async listUsers(args: string[]): Promise<CommandResponse> {
    // TODO: Implementar listagem de usuários
    return { success: false, message: 'Comando em desenvolvimento' };
  }

  private async blockUser(args: string[]): Promise<CommandResponse> {
    // TODO: Implementar bloqueio de usuário
    return { success: false, message: 'Comando em desenvolvimento' };
  }

  private async unblockUser(args: string[]): Promise<CommandResponse> {
    // TODO: Implementar desbloqueio de usuário
    return { success: false, message: 'Comando em desenvolvimento' };
  }

  private async getUserInfo(args: string[]): Promise<CommandResponse> {
    // TODO: Implementar info do usuário
    return { success: false, message: 'Comando em desenvolvimento' };
  }

  private async clearUserContext(args: string[]): Promise<CommandResponse> {
    // TODO: Implementar limpeza de contexto
    return { success: false, message: 'Comando em desenvolvimento' };
  }

  private async configureAI(args: string[]): Promise<CommandResponse> {
    // TODO: Implementar configuração da IA
    return { success: false, message: 'Comando em desenvolvimento' };
  }

  private async setSystemPrompt(args: string[]): Promise<CommandResponse> {
    try {
      if (args.length === 0) {
        return {
          success: false,
          message: '❌ Uso: !prompt_sistema <sessão> <prompt>\n\nExemplo: !prompt_sistema vendas "Você é um assistente de vendas especializado em produtos tecnológicos."\n\nPara ver o prompt atual: !prompt_sistema <sessão>'
        };
      }

      const sessionName = args[0];
      
      // Se só foi fornecido o nome da sessão, mostrar prompt atual
      if (args.length === 1) {
        const currentPrompt = await databaseService.getSessionPrompt(sessionName);
        
        if (currentPrompt === null) {
          return {
            success: false,
            message: `❌ Sessão '${sessionName}' não encontrada ou não possui prompt personalizado.`
          };
        }
        
        return {
          success: true,
          message: `📝 Prompt atual da sessão '${sessionName}':\n\n${currentPrompt || 'Nenhum prompt personalizado definido (usando prompt padrão do sistema).'}`
        };
      }

      // Juntar todos os argumentos restantes como o prompt
      const newPrompt = args.slice(1).join(' ').replace(/^"|"$/g, ''); // Remove aspas do início e fim
      
      if (!newPrompt.trim()) {
      return {
        success: false,
        message: '❌ Prompt não pode estar vazio'
      };
      }

      // Verificar se a sessão existe
      const session = await databaseService.getSessionByName(sessionName);
      if (!session) {
        return {
          success: false,
          message: `❌ Sessão '${sessionName}' não encontrada.`
        };
      }

      // Definir o prompt
      const success = await databaseService.setSessionPrompt(sessionName, newPrompt);
      
      if (success) {
        return {
          success: true,
          message: `✅ Prompt personalizado definido para a sessão '${sessionName}'.\n\n📝 Novo prompt:\n${newPrompt.substring(0, 200)}${newPrompt.length > 200 ? '...' : ''}`
        };
      } else {
        return {
          success: false,
          message: `❌ Erro ao definir prompt para a sessão '${sessionName}'.`
        };
      }
    } catch (error) {
      console.error('❌ Erro ao definir prompt do sistema:', error);
      return {
        success: false,
        message: '❌ Erro interno ao definir prompt do sistema.'
      };
    }
  }

  private async setAIModel(args: string[]): Promise<CommandResponse> {
    // TODO: Implementar definição de modelo
    return { success: false, message: 'Comando em desenvolvimento' };
  }

  private async setTemperature(args: string[]): Promise<CommandResponse> {
    // TODO: Implementar definição de temperatura
    return { success: false, message: 'Comando em desenvolvimento' };
  }

  private async getMetrics(args: string[]): Promise<CommandResponse> {
    // TODO: Implementar métricas
    return { success: false, message: 'Comando em desenvolvimento' };
  }

  private async getHistory(args: string[]): Promise<CommandResponse> {
    // TODO: Implementar histórico
    return { success: false, message: 'Comando em desenvolvimento' };
  }

  private async getLogs(args: string[]): Promise<CommandResponse> {
    // TODO: Implementar logs
    return { success: false, message: 'Comando em desenvolvimento' };
  }

  private async getPerformance(args: string[]): Promise<CommandResponse> {
    // TODO: Implementar performance
    return { success: false, message: 'Comando em desenvolvimento' };
  }

  private async createBackup(args: string[]): Promise<CommandResponse> {
    // TODO: Implementar backup
    return { success: false, message: 'Comando em desenvolvimento' };
  }

  private async cleanupData(args: string[]): Promise<CommandResponse> {
    // TODO: Implementar limpeza
    return { success: false, message: 'Comando em desenvolvimento' };
  }

  private async setConfig(args: string[], sessionName: string): Promise<CommandResponse> {
    try {
      if (args.length < 2) {
        return {
          success: false,
          message: '❌ Uso: !config <chave> <valor>\n\nExemplo: !config max_messages 100\n\nChaves disponíveis:\n- max_messages: Limite de mensagens por usuário\n- response_delay: Delay entre respostas (ms)\n- ai_temperature: Temperatura da IA (0.0-1.0)'
        };
      }

      const [key, value] = args;
      
      // Validar chaves de configuração permitidas
      const allowedKeys = ['max_messages', 'response_delay', 'ai_temperature', 'working_hours', 'auto_response'];
      
      if (!allowedKeys.includes(key)) {
        return {
          success: false,
          message: `❌ Chave de configuração '${key}' não é válida.\n\nChaves permitidas: ${allowedKeys.join(', ')}`
        };
      }

      // Validar valores específicos
      let validatedValue: any = value;
      
      switch (key) {
        case 'max_messages':
          const maxMessages = parseInt(value);
          if (isNaN(maxMessages) || maxMessages < 1 || maxMessages > 1000) {
            return {
              success: false,
              message: '❌ max_messages deve ser um número entre 1 e 1000'
            };
          }
          validatedValue = maxMessages;
          break;
          
        case 'response_delay':
          const delay = parseInt(value);
          if (isNaN(delay) || delay < 0 || delay > 30000) {
            return {
              success: false,
              message: '❌ response_delay deve ser um número entre 0 e 30000 (ms)'
            };
          }
          validatedValue = delay;
          break;
          
        case 'ai_temperature':
          const temp = parseFloat(value);
          if (isNaN(temp) || temp < 0 || temp > 1) {
            return {
              success: false,
              message: '❌ ai_temperature deve ser um número entre 0.0 e 1.0'
            };
          }
          validatedValue = temp;
          break;
          
        case 'auto_response':
          if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
            return {
              success: false,
              message: '❌ auto_response deve ser true/false ou 1/0'
            };
          }
          validatedValue = ['true', '1'].includes(value.toLowerCase());
          break;
      }
      
      // Salvar configuração no sessionManager
       const configUpdate: any = {};
       configUpdate[key] = validatedValue;
       await sessionManager.updateSessionConfig(sessionName, configUpdate);
      
      return {
        success: true,
        message: `✅ Configuração '${key}' definida como '${validatedValue}' para a sessão ${sessionName}`,
        data: { key, value: validatedValue }
      };
    } catch (error) {
      console.error('❌ Erro ao definir configuração:', error);
      return {
        success: false,
        message: '❌ Erro interno ao definir configuração'
      };
    }
  }

  private async restartSession(args: string[]): Promise<CommandResponse> {
    // TODO: Implementar reinicialização
    return { success: false, message: 'Comando em desenvolvimento' };
  }

  private async setSessionPrompt(args: string[]): Promise<CommandResponse> {
    try {
      if (args.length < 2) {
        return {
          success: false,
          message: '❌ Uso: !prompt_sessao <sessão> <prompt>\n\nExemplo: !prompt_sessao vendas "Você é um assistente de vendas especializado."'
        };
      }

      const sessionName = args[0];
      const newPrompt = args.slice(1).join(' ').replace(/^"|"$/g, '');
      
      if (!newPrompt.trim()) {
        return {
          success: false,
          message: '❌ Prompt não pode estar vazio'
        };
      }

      // Verificar se a sessão existe
      const session = await databaseService.getSessionByName(sessionName);
      if (!session) {
        return {
          success: false,
          message: `❌ Sessão '${sessionName}' não encontrada.`
        };
      }

      const success = await databaseService.setSessionPrompt(sessionName, newPrompt);
      
      if (success) {
        return {
          success: true,
          message: `✅ Prompt definido para a sessão '${sessionName}'.\n\n📝 Preview:\n${newPrompt.substring(0, 150)}${newPrompt.length > 150 ? '...' : ''}`
        };
      } else {
        return {
          success: false,
          message: `❌ Erro ao definir prompt para a sessão '${sessionName}'.`
        };
      }
    } catch (error) {
      console.error('❌ Erro ao definir prompt da sessão:', error);
      return {
        success: false,
        message: '❌ Erro interno ao definir prompt da sessão.'
      };
    }
  }

  private async getSessionPrompt(args: string[]): Promise<CommandResponse> {
    try {
      if (args.length === 0) {
        return {
          success: false,
          message: '❌ Uso: !ver_prompt <sessão>\n\nExemplo: !ver_prompt vendas'
        };
      }

      const sessionName = args[0];
      const currentPrompt = await databaseService.getSessionPrompt(sessionName);
      
      if (currentPrompt === null) {
        return {
          success: false,
          message: `❌ Sessão '${sessionName}' não encontrada.`
        };
      }
      
      return {
        success: true,
        message: `📝 Prompt da sessão '${sessionName}':\n\n${currentPrompt || '⚠️ Nenhum prompt personalizado definido.\nUsando prompt padrão do sistema.'}`
      };
    } catch (error) {
      console.error('❌ Erro ao obter prompt da sessão:', error);
      return {
        success: false,
        message: '❌ Erro interno ao obter prompt da sessão.'
      };
    }
  }
}

// Instância singleton do serviço de comandos
export const adminCommandsService = new AdminCommandsService();