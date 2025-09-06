import inquirer from 'inquirer';
import chalk from 'chalk';
import figlet from 'figlet';
import { databaseService } from '../services/database.service';
import { supabase } from '../config/supabase';
import { portManager } from './port-manager';
import { sessionController } from './session-controller';
import { configurationEditor } from './configuration-editor';
import { logger } from '../util/logger';

interface DashboardData {
  sessions: any[];
  users: any[];
  activeConnections: number;
  totalMessages: number;
  systemHealth: any;
}

export class TerminalDashboard {
  private dashboardData: DashboardData | null = null;
  private refreshInterval: NodeJS.Timer | null = null;

  constructor() {
    this.setupGracefulShutdown();
  }

  /**
   * Inicia o dashboard principal
   */
  async start(): Promise<void> {
    try {
      await this.displayHeader();
      await this.loadDashboardData();
      await this.showMainMenu();
    } catch (error) {
      logger.error('Erro ao iniciar dashboard:', error);
      console.log(chalk.red('❌ Erro ao iniciar dashboard. Verifique a conexão com o banco de dados.'));
      process.exit(1);
    }
  }

  /**
   * Exibe o cabeçalho do sistema
   */
  private async displayHeader(): Promise<void> {
    console.clear();
    
    // Logo ASCII
    const logo = figlet.textSync('ZAPNINJA', {
      font: 'Big',
      horizontalLayout: 'fitted'
    });
    
    console.log(chalk.cyan(logo));
    console.log(chalk.gray('━'.repeat(80)));
    console.log(chalk.yellow('🤖 Sistema Inteligente de WhatsApp Bot'));
    console.log(chalk.gray('   Desenvolvido por Rafael Carboni'));
    console.log(chalk.gray('━'.repeat(80)));
    console.log();
  }

  /**
   * Carrega dados do dashboard do banco de dados
   */
  private async loadDashboardData(): Promise<void> {
    const loadingSpinner = this.startLoading('Carregando dados do sistema...');
    
    try {
      // Carregar sessões
      const { data: sessions } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      // Carregar usuários
      const { data: users } = await supabase
        .from('whatsapp_users')
        .select('*')
        .order('created_at', { ascending: false });

      // Carregar estatísticas gerais
      const { data: messageStats } = await supabase
        .from('messages')
        .select('count')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Verificar sessões ativas
      const activeConnections = await portManager.getActiveSessions();

      this.dashboardData = {
        sessions: sessions || [],
        users: users || [],
        activeConnections: activeConnections.length,
        totalMessages: messageStats?.length || 0,
        systemHealth: {
          database: true,
          timestamp: new Date()
        }
      };

      this.stopLoading(loadingSpinner);
      
    } catch (error) {
      this.stopLoading(loadingSpinner);
      logger.error('Erro ao carregar dados do dashboard:', error);
      throw error;
    }
  }

  /**
   * Exibe o menu principal
   */
  private async showMainMenu(): Promise<void> {
    await this.displayDashboardSummary();
    
    const choices = [
      { name: '🚀 Iniciar Nova Sessão', value: 'start_session' },
      { name: '📊 Gerenciar Sessões Existentes', value: 'manage_sessions' },
      { name: '👥 Visualizar Usuários', value: 'view_users' },
      { name: '⚙️  Configurações', value: 'settings' },
      { name: '📈 Monitoramento', value: 'monitoring' },
      { name: '🔄 Atualizar Dados', value: 'refresh' },
      new inquirer.Separator(),
      { name: '❌ Sair', value: 'exit' }
    ];

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'Selecione uma opção:',
      choices,
      pageSize: 10
    }]);

    await this.handleMenuAction(action);
  }

  /**
   * Exibe resumo do dashboard
   */
  private async displayDashboardSummary(): Promise<void> {
    if (!this.dashboardData) return;

    console.log(chalk.blue('📊 RESUMO DO SISTEMA'));
    console.log(chalk.gray('─'.repeat(50)));
    
    // Status das Sessões
    const activeSessions = this.dashboardData.sessions.filter(s => s.is_active).length;
    const totalSessions = this.dashboardData.sessions.length;
    
    console.log(`${chalk.green('✅')} Sessões Ativas: ${chalk.bold.green(activeSessions)}/${totalSessions}`);
    console.log(`${chalk.blue('👥')} Total de Usuários: ${chalk.bold.blue(this.dashboardData.users.length)}`);
    console.log(`${chalk.yellow('💬')} Mensagens (24h): ${chalk.bold.yellow(this.dashboardData.totalMessages)}`);
    console.log(`${chalk.cyan('🔌')} Conexões Ativas: ${chalk.bold.cyan(this.dashboardData.activeConnections)}`);
    
    // Portas em uso
    const activePorts = await portManager.getUsedPorts();
    if (activePorts.length > 0) {
      console.log(`${chalk.magenta('🌐')} Portas em Uso: ${chalk.bold.magenta(activePorts.join(', '))}`);
    }
    
    console.log(chalk.gray('─'.repeat(50)));
    console.log();
  }

  /**
   * Manipula ações do menu principal
   */
  private async handleMenuAction(action: string): Promise<void> {
    switch (action) {
      case 'start_session':
        await this.startNewSession();
        break;
        
      case 'manage_sessions':
        await this.manageSessions();
        break;
        
      case 'view_users':
        await this.viewUsers();
        break;
        
      case 'settings':
        await this.showSettings();
        break;
        
      case 'monitoring':
        await this.showMonitoring();
        break;
        
      case 'refresh':
        await this.loadDashboardData();
        await this.showMainMenu();
        break;
        
      case 'exit':
        console.log(chalk.yellow('👋 Até logo!'));
        process.exit(0);
        break;
        
      default:
        await this.showMainMenu();
    }
  }

  /**
   * Inicia uma nova sessão
   */
  private async startNewSession(): Promise<void> {
    console.clear();
    await this.displayHeader();
    
    console.log(chalk.blue('🚀 INICIAR NOVA SESSÃO'));
    console.log(chalk.gray('─'.repeat(50)));
    
    // Listar sessões disponíveis
    const availableSessions = this.dashboardData?.sessions || [];
    
    if (availableSessions.length === 0) {
      console.log(chalk.yellow('⚠️  Nenhuma sessão encontrada. Criando sessão padrão...'));
      await this.createDefaultSession();
      return;
    }

    const sessionChoices = availableSessions.map(session => ({
      name: `${session.is_active ? '🟢' : '🔴'} ${session.session_name} ${session.phone_number ? `(${session.phone_number})` : ''}`,
      value: session.session_name,
      short: session.session_name
    }));

    sessionChoices.push(
      new inquirer.Separator(),
      { name: '➕ Criar Nova Sessão', value: '__new__', short: 'Nova' },
      { name: '🔙 Voltar ao Menu', value: '__back__', short: 'Voltar' }
    );

    const { selectedSession } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedSession',
      message: 'Selecione a sessão para iniciar:',
      choices: sessionChoices,
      pageSize: 15
    }]);

    if (selectedSession === '__back__') {
      await this.showMainMenu();
      return;
    }

    if (selectedSession === '__new__') {
      await this.createNewSession();
      return;
    }

    await this.launchSession(selectedSession);
  }

  /**
   * Cria uma nova sessão
   */
  private async createNewSession(): Promise<void> {
    console.log(chalk.green('➕ CRIAR NOVA SESSÃO'));
    console.log(chalk.gray('─'.repeat(30)));

    const questions = [
      {
        type: 'input',
        name: 'sessionName',
        message: 'Nome da sessão:',
        validate: (input: string) => {
          if (!input.trim()) return 'Nome da sessão é obrigatório';
          if (input.length < 3) return 'Nome deve ter pelo menos 3 caracteres';
          if (!/^[a-zA-Z0-9_-]+$/.test(input)) return 'Use apenas letras, números, _ e -';
          return true;
        }
      },
      {
        type: 'input',
        name: 'phoneNumber',
        message: 'Número do WhatsApp (opcional):',
        validate: (input: string) => {
          if (!input.trim()) return true; // Opcional
          if (!/^\d{10,15}$/.test(input.replace(/\D/g, ''))) return 'Número inválido';
          return true;
        }
      },
      {
        type: 'list',
        name: 'aiModel',
        message: 'Modelo de IA:',
        choices: [
          { name: '🤖 OpenAI GPT-4', value: 'GPT' },
          { name: '🧠 Google Gemini', value: 'GEMINI' }
        ]
      },
      {
        type: 'confirm',
        name: 'isActive',
        message: 'Ativar sessão imediatamente?',
        default: true
      }
    ];

    const answers = await inquirer.prompt(questions);
    
    // Verificar se sessão já existe
    const existingSession = this.dashboardData?.sessions.find(s => s.session_name === answers.sessionName);
    if (existingSession) {
      console.log(chalk.red('❌ Sessão com este nome já existe!'));
      await this.waitForKey();
      await this.createNewSession();
      return;
    }

    const loadingSpinner = this.startLoading('Criando nova sessão...');

    try {
      const { data: newSession, error } = await supabase
        .from('whatsapp_sessions')
        .insert([{
          session_name: answers.sessionName,
          phone_number: answers.phoneNumber || null,
          is_active: answers.isActive,
          ai_config: {
            model: answers.aiModel === 'GPT' ? 'gpt-4' : 'gemini-pro',
            temperature: 0.7,
            max_tokens: 2000,
            system_prompt: 'Você é um assistente virtual inteligente e amigável.'
          },
          timing_config: {
            response_time: 2000,
            message_delay: 1000,
            rest_period: 300000,
            working_hours: { start: '08:00', end: '22:00' },
            message_limit_per_hour: 100,
            typing_simulation: true
          }
        }])
        .select()
        .single();

      this.stopLoading(loadingSpinner);

      if (error) throw error;

      console.log(chalk.green('✅ Sessão criada com sucesso!'));
      
      if (answers.isActive) {
        const { launchNow } = await inquirer.prompt([{
          type: 'confirm',
          name: 'launchNow',
          message: 'Deseja iniciar a sessão agora?',
          default: true
        }]);

        if (launchNow) {
          await this.launchSession(answers.sessionName);
          return;
        }
      }

      await this.waitForKey();
      await this.loadDashboardData();
      await this.showMainMenu();

    } catch (error) {
      this.stopLoading(loadingSpinner);
      console.log(chalk.red(`❌ Erro ao criar sessão: ${error}`));
      await this.waitForKey();
      await this.createNewSession();
    }
  }

  /**
   * Lança uma sessão específica
   */
  private async launchSession(sessionName: string): Promise<void> {
    console.log(chalk.blue(`🚀 INICIANDO SESSÃO: ${sessionName.toUpperCase()}`));
    console.log(chalk.gray('─'.repeat(50)));

    // Verificar se sessão já está rodando
    const runningSessions = await portManager.getActiveSessions();
    const isRunning = runningSessions.find(s => s.sessionName === sessionName);

    if (isRunning) {
      console.log(chalk.yellow(`⚠️  Sessão '${sessionName}' já está rodando na porta ${isRunning.port}`));
      
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'O que deseja fazer?',
        choices: [
          { name: '👁️  Ver Status da Sessão', value: 'status' },
          { name: '🔄 Reiniciar Sessão', value: 'restart' },
          { name: '🛑 Parar Sessão', value: 'stop' },
          { name: '🔙 Voltar', value: 'back' }
        ]
      }]);

      switch (action) {
        case 'status':
          await sessionController.showSessionStatus(sessionName, isRunning.port);
          break;
        case 'restart':
          await sessionController.restartSession(sessionName);
          break;
        case 'stop':
          await sessionController.stopSession(sessionName);
          break;
      }
      
      await this.waitForKey();
      await this.showMainMenu();
      return;
    }

    // Verificar configurações antes de iniciar
    const sessionData = this.dashboardData?.sessions.find(s => s.session_name === sessionName);
    if (!sessionData) {
      console.log(chalk.red('❌ Sessão não encontrada!'));
      await this.waitForKey();
      await this.showMainMenu();
      return;
    }

    console.log('📋 Configurações da Sessão:');
    console.log(`   Nome: ${chalk.bold(sessionData.session_name)}`);
    console.log(`   Telefone: ${sessionData.phone_number || 'Não definido'}`);
    console.log(`   IA: ${sessionData.ai_config?.model || 'Não definido'}`);
    console.log(`   Status: ${sessionData.is_active ? chalk.green('Ativo') : chalk.red('Inativo')}`);
    console.log();

    const { shouldConfigure } = await inquirer.prompt([{
      type: 'confirm',
      name: 'shouldConfigure',
      message: 'Deseja revisar/editar configurações antes de iniciar?',
      default: false
    }]);

    if (shouldConfigure) {
      await configurationEditor.editSession(sessionName);
      await this.loadDashboardData(); // Recarregar após edição
    }

    // Obter porta disponível
    const assignedPort = await portManager.getAvailablePort();
    
    console.log(chalk.blue(`🌐 Porta atribuída: ${assignedPort}`));
    
    const { confirmLaunch } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmLaunch',
      message: 'Iniciar sessão?',
      default: true
    }]);

    if (!confirmLaunch) {
      await this.showMainMenu();
      return;
    }

    // Registrar sessão no gerenciador de portas
    await portManager.registerSession(sessionName, assignedPort);
    
    // Lançar sessão
    const launched = await sessionController.launchSession(sessionName, assignedPort);
    
    if (launched) {
      console.log(chalk.green('✅ Sessão iniciada com sucesso!'));
      console.log(chalk.blue(`🌐 Monitoramento: http://localhost:${assignedPort}/health`));
      console.log(chalk.yellow('💡 Use Ctrl+C para parar a sessão'));
      
      const { viewLogs } = await inquirer.prompt([{
        type: 'confirm',
        name: 'viewLogs',
        message: 'Deseja acompanhar os logs em tempo real?',
        default: false
      }]);

      if (viewLogs) {
        await sessionController.followLogs(sessionName);
      }
    } else {
      console.log(chalk.red('❌ Falha ao iniciar sessão'));
      await portManager.releaseSession(sessionName);
    }

    await this.waitForKey();
    await this.showMainMenu();
  }

  /**
   * Gerencia sessões existentes
   */
  private async manageSessions(): Promise<void> {
    console.clear();
    await this.displayHeader();
    
    console.log(chalk.blue('📊 GERENCIAR SESSÕES'));
    console.log(chalk.gray('─'.repeat(50)));

    const sessions = this.dashboardData?.sessions || [];
    const runningSessions = await portManager.getActiveSessions();

    if (sessions.length === 0) {
      console.log(chalk.yellow('⚠️  Nenhuma sessão encontrada.'));
      await this.waitForKey();
      await this.showMainMenu();
      return;
    }

    // Exibir tabela de sessões
    console.log(chalk.bold('Sessões Disponíveis:'));
    console.log();

    sessions.forEach((session, index) => {
      const isRunning = runningSessions.find(r => r.sessionName === session.session_name);
      const status = isRunning ? chalk.green('🟢 RODANDO') : session.is_active ? chalk.yellow('🟡 ATIVA') : chalk.red('🔴 INATIVA');
      const port = isRunning ? ` (porta ${isRunning.port})` : '';
      
      console.log(`${index + 1}. ${chalk.bold(session.session_name)} ${port}`);
      console.log(`   Status: ${status}`);
      console.log(`   Telefone: ${session.phone_number || 'Não definido'}`);
      console.log(`   IA: ${session.ai_config?.model || 'Não definido'}`);
      console.log(`   Criada: ${new Date(session.created_at).toLocaleDateString('pt-BR')}`);
      console.log();
    });

    const sessionChoices = sessions.map((session, index) => ({
      name: `${session.session_name} (${session.is_active ? 'Ativa' : 'Inativa'})`,
      value: session.session_name
    }));

    sessionChoices.push(
      new inquirer.Separator(),
      { name: '🔙 Voltar ao Menu', value: '__back__' }
    );

    const { selectedSession } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedSession',
      message: 'Selecione uma sessão para gerenciar:',
      choices: sessionChoices,
      pageSize: 15
    }]);

    if (selectedSession === '__back__') {
      await this.showMainMenu();
      return;
    }

    await this.manageSpecificSession(selectedSession);
  }

  /**
   * Gerencia uma sessão específica
   */
  private async manageSpecificSession(sessionName: string): Promise<void> {
    const session = this.dashboardData?.sessions.find(s => s.session_name === sessionName);
    const runningSessions = await portManager.getActiveSessions();
    const isRunning = runningSessions.find(r => r.sessionName === sessionName);

    console.log(chalk.blue(`📋 GERENCIAR SESSÃO: ${sessionName.toUpperCase()}`));
    console.log(chalk.gray('─'.repeat(50)));

    const choices = [
      { name: '👁️  Ver Detalhes', value: 'details' },
      { name: '⚙️  Editar Configurações', value: 'edit' },
    ];

    if (isRunning) {
      choices.push(
        { name: '📊 Ver Status', value: 'status' },
        { name: '📝 Ver Logs', value: 'logs' },
        { name: '🔄 Reiniciar', value: 'restart' },
        { name: '🛑 Parar', value: 'stop' }
      );
    } else {
      choices.push({ name: '🚀 Iniciar', value: 'start' });
    }

    choices.push(
      new inquirer.Separator(),
      { name: session?.is_active ? '❌ Desativar' : '✅ Ativar', value: 'toggle' },
      { name: '🗑️  Excluir', value: 'delete' },
      { name: '🔙 Voltar', value: 'back' }
    );

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'O que deseja fazer?',
      choices
    }]);

    switch (action) {
      case 'details':
        await this.showSessionDetails(sessionName);
        break;
      case 'edit':
        await configurationEditor.editSession(sessionName);
        await this.loadDashboardData();
        break;
      case 'status':
        if (isRunning) await sessionController.showSessionStatus(sessionName, isRunning.port);
        break;
      case 'logs':
        if (isRunning) await sessionController.followLogs(sessionName);
        break;
      case 'start':
        await this.launchSession(sessionName);
        return;
      case 'restart':
        await sessionController.restartSession(sessionName);
        break;
      case 'stop':
        await sessionController.stopSession(sessionName);
        break;
      case 'toggle':
        await this.toggleSession(sessionName);
        break;
      case 'delete':
        await this.deleteSession(sessionName);
        break;
      case 'back':
        await this.manageSessions();
        return;
    }

    await this.waitForKey();
    await this.manageSpecificSession(sessionName);
  }

  /**
   * Exibe detalhes da sessão
   */
  private async showSessionDetails(sessionName: string): Promise<void> {
    const session = this.dashboardData?.sessions.find(s => s.session_name === sessionName);
    if (!session) return;

    console.log(chalk.blue('📋 DETALHES DA SESSÃO'));
    console.log(chalk.gray('─'.repeat(30)));
    
    console.log(`${chalk.bold('Nome:')} ${session.session_name}`);
    console.log(`${chalk.bold('Telefone:')} ${session.phone_number || 'Não definido'}`);
    console.log(`${chalk.bold('Status:')} ${session.is_active ? chalk.green('Ativo') : chalk.red('Inativo')}`);
    console.log(`${chalk.bold('Criada em:')} ${new Date(session.created_at).toLocaleString('pt-BR')}`);
    console.log(`${chalk.bold('Atualizada em:')} ${new Date(session.updated_at).toLocaleString('pt-BR')}`);
    
    if (session.ai_config) {
      console.log(`${chalk.bold('IA Modelo:')} ${session.ai_config.model || 'Não definido'}`);
      console.log(`${chalk.bold('Temperatura:')} ${session.ai_config.temperature || 0.7}`);
      console.log(`${chalk.bold('Max Tokens:')} ${session.ai_config.max_tokens || 2000}`);
    }
    
    if (session.timing_config) {
      console.log(`${chalk.bold('Tempo de Resposta:')} ${session.timing_config.response_time || 2000}ms`);
      console.log(`${chalk.bold('Limite/Hora:')} ${session.timing_config.message_limit_per_hour || 100} mensagens`);
    }

    console.log(`${chalk.bold('Max Mensagens:')} ${session.max_messages || 100}`);
    
    if (session.custom_prompt) {
      console.log(`${chalk.bold('Prompt Personalizado:')} ${session.custom_prompt.substring(0, 100)}...`);
    }
  }

  /**
   * Alterna status da sessão
   */
  private async toggleSession(sessionName: string): Promise<void> {
    const session = this.dashboardData?.sessions.find(s => s.session_name === sessionName);
    if (!session) return;

    const newStatus = !session.is_active;
    const action = newStatus ? 'ativar' : 'desativar';

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: `Tem certeza que deseja ${action} a sessão '${sessionName}'?`,
      default: false
    }]);

    if (!confirm) return;

    const loadingSpinner = this.startLoading(`${action.charAt(0).toUpperCase() + action.slice(1)}ando sessão...`);

    try {
      const { error } = await supabase
        .from('whatsapp_sessions')
        .update({ is_active: newStatus })
        .eq('session_name', sessionName);

      this.stopLoading(loadingSpinner);

      if (error) throw error;

      console.log(chalk.green(`✅ Sessão ${newStatus ? 'ativada' : 'desativada'} com sucesso!`));
      await this.loadDashboardData();

    } catch (error) {
      this.stopLoading(loadingSpinner);
      console.log(chalk.red(`❌ Erro ao ${action} sessão: ${error}`));
    }
  }

  /**
   * Exclui uma sessão
   */
  private async deleteSession(sessionName: string): Promise<void> {
    console.log(chalk.red('🗑️  EXCLUIR SESSÃO'));
    console.log(chalk.gray('─'.repeat(20)));
    console.log(chalk.yellow('⚠️  ATENÇÃO: Esta ação não pode ser desfeita!'));
    console.log(chalk.yellow('   Todos os dados relacionados serão removidos.'));
    console.log();

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: `Tem certeza que deseja excluir a sessão '${sessionName}'?`,
      default: false
    }]);

    if (!confirm) return;

    const { doubleConfirm } = await inquirer.prompt([{
      type: 'input',
      name: 'doubleConfirm',
      message: `Digite '${sessionName}' para confirmar:`,
      validate: (input: string) => input === sessionName || 'Nome não confere'
    }]);

    const loadingSpinner = this.startLoading('Excluindo sessão...');

    try {
      // Primeiro verificar se há sessão rodando
      const runningSessions = await portManager.getActiveSessions();
      const isRunning = runningSessions.find(r => r.sessionName === sessionName);
      
      if (isRunning) {
        await sessionController.stopSession(sessionName);
      }

      const { error } = await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('session_name', sessionName);

      this.stopLoading(loadingSpinner);

      if (error) throw error;

      console.log(chalk.green('✅ Sessão excluída com sucesso!'));
      await this.loadDashboardData();

    } catch (error) {
      this.stopLoading(loadingSpinner);
      console.log(chalk.red(`❌ Erro ao excluir sessão: ${error}`));
    }
  }

  /**
   * Visualiza usuários
   */
  private async viewUsers(): Promise<void> {
    console.clear();
    await this.displayHeader();
    
    console.log(chalk.blue('👥 USUÁRIOS CADASTRADOS'));
    console.log(chalk.gray('─'.repeat(50)));

    const users = this.dashboardData?.users || [];

    if (users.length === 0) {
      console.log(chalk.yellow('⚠️  Nenhum usuário encontrado.'));
      await this.waitForKey();
      await this.showMainMenu();
      return;
    }

    // Buscar estatísticas de mensagens por usuário
    const userStats = new Map();
    
    for (const user of users) {
      const { data: messageCount } = await supabase
        .from('messages')
        .select('count')
        .eq('conversation_id', user.id);
        
      userStats.set(user.id, messageCount?.length || 0);
    }

    console.log(`Total de usuários: ${chalk.bold.blue(users.length)}`);
    console.log();

    users.slice(0, 20).forEach((user, index) => {
      const messageCount = userStats.get(user.id) || 0;
      console.log(`${index + 1}. ${chalk.bold(user.display_name || user.name || 'Sem nome')}`);
      console.log(`   📞 ${user.phone_number}`);
      console.log(`   💬 ${messageCount} mensagens`);
      console.log(`   📅 Cadastrado: ${new Date(user.created_at).toLocaleDateString('pt-BR')}`);
      console.log();
    });

    if (users.length > 20) {
      console.log(chalk.gray(`... e mais ${users.length - 20} usuários`));
    }

    await this.waitForKey();
    await this.showMainMenu();
  }

  /**
   * Exibe configurações
   */
  private async showSettings(): Promise<void> {
    console.clear();
    await this.displayHeader();
    
    console.log(chalk.blue('⚙️  CONFIGURAÇÕES DO SISTEMA'));
    console.log(chalk.gray('─'.repeat(50)));

    const choices = [
      { name: '🌐 Configurações de Porta', value: 'port_config' },
      { name: '🤖 Configurações Globais de IA', value: 'ai_config' },
      { name: '⏱️  Configurações de Timing', value: 'timing_config' },
      { name: '🗄️  Configurações do Banco', value: 'database_config' },
      { name: '📝 Logs e Monitoramento', value: 'logging_config' },
      new inquirer.Separator(),
      { name: '🔙 Voltar ao Menu', value: 'back' }
    ];

    const { setting } = await inquirer.prompt([{
      type: 'list',
      name: 'setting',
      message: 'Selecione uma configuração:',
      choices
    }]);

    switch (setting) {
      case 'port_config':
        await this.showPortConfiguration();
        break;
      case 'ai_config':
        await configurationEditor.editGlobalAI();
        break;
      case 'timing_config':
        await configurationEditor.editGlobalTiming();
        break;
      case 'database_config':
        await this.showDatabaseConfig();
        break;
      case 'logging_config':
        await this.showLoggingConfig();
        break;
      case 'back':
        await this.showMainMenu();
        return;
    }

    await this.waitForKey();
    await this.showSettings();
  }

  /**
   * Configuração de portas
   */
  private async showPortConfiguration(): Promise<void> {
    console.log(chalk.blue('🌐 CONFIGURAÇÃO DE PORTAS'));
    console.log(chalk.gray('─'.repeat(30)));

    const activeSessions = await portManager.getActiveSessions();
    const usedPorts = await portManager.getUsedPorts();
    const basePort = portManager.getBasePort();

    console.log(`Porta Base: ${chalk.bold.blue(basePort)}`);
    console.log(`Portas em Uso: ${usedPorts.length > 0 ? chalk.bold.yellow(usedPorts.join(', ')) : 'Nenhuma'}`);
    console.log();

    if (activeSessions.length > 0) {
      console.log(chalk.bold('Sessões Ativas:'));
      activeSessions.forEach(session => {
        console.log(`  • ${session.sessionName} → Porta ${session.port}`);
      });
      console.log();
    }

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'O que deseja fazer?',
      choices: [
        { name: '🔄 Alterar Porta Base', value: 'change_base' },
        { name: '🧹 Limpar Portas Ociosas', value: 'cleanup' },
        { name: '📊 Ver Detalhes', value: 'details' },
        { name: '🔙 Voltar', value: 'back' }
      ]
    }]);

    switch (action) {
      case 'change_base':
        const { newBasePort } = await inquirer.prompt([{
          type: 'number',
          name: 'newBasePort',
          message: 'Nova porta base:',
          default: basePort,
          validate: (port: number) => {
            if (port < 3000 || port > 65535) return 'Porta deve estar entre 3000 e 65535';
            return true;
          }
        }]);
        
        await portManager.setBasePort(newBasePort);
        console.log(chalk.green(`✅ Porta base alterada para ${newBasePort}`));
        break;

      case 'cleanup':
        await portManager.cleanupIdlePorts();
        console.log(chalk.green('✅ Limpeza de portas concluída'));
        break;

      case 'details':
        console.log(chalk.blue('📊 DETALHES DO GERENCIADOR DE PORTAS'));
        console.log(`   Porta mínima: 3000`);
        console.log(`   Porta máxima: 65535`);
        console.log(`   Incremento automático: +1`);
        console.log(`   Verificação de disponibilidade: TCP`);
        break;
    }
  }

  /**
   * Configurações do banco de dados
   */
  private async showDatabaseConfig(): Promise<void> {
    console.log(chalk.blue('🗄️  CONFIGURAÇÕES DO BANCO DE DADOS'));
    console.log(chalk.gray('─'.repeat(40)));

    try {
      const { data: sessionsCount } = await supabase.from('whatsapp_sessions').select('count');
      const { data: usersCount } = await supabase.from('whatsapp_users').select('count');
      const { data: messagesCount } = await supabase.from('messages').select('count');
      const { data: conversationsCount } = await supabase.from('conversations').select('count');

      console.log(`📊 Estatísticas:`);
      console.log(`   Sessões: ${sessionsCount?.length || 0}`);
      console.log(`   Usuários: ${usersCount?.length || 0}`);
      console.log(`   Conversas: ${conversationsCount?.length || 0}`);
      console.log(`   Mensagens: ${messagesCount?.length || 0}`);
      console.log();

      console.log(`🌐 Conexão: ${chalk.green('✅ Ativa')}`);
      console.log(`🔑 Autenticação: ${chalk.green('✅ Configurada')}`);
      
    } catch (error) {
      console.log(chalk.red('❌ Erro ao conectar com o banco de dados'));
      console.log(`Erro: ${error}`);
    }
  }

  /**
   * Configurações de logging
   */
  private async showLoggingConfig(): Promise<void> {
    console.log(chalk.blue('📝 CONFIGURAÇÕES DE LOGS'));
    console.log(chalk.gray('─'.repeat(30)));

    console.log(`Nível atual: ${chalk.bold.blue('INFO')}`);
    console.log(`Arquivo de log: ${chalk.bold.blue('./logs/bot-{data}.log')}`);
    console.log(`Rotação: ${chalk.bold.blue('Diária')}`);
    console.log(`Estruturado: ${chalk.green('✅ Habilitado')}`);
  }

  /**
   * Exibe monitoramento
   */
  private async showMonitoring(): Promise<void> {
    console.clear();
    await this.displayHeader();
    
    console.log(chalk.blue('📈 MONITORAMENTO DO SISTEMA'));
    console.log(chalk.gray('─'.repeat(50)));

    // Métricas em tempo real
    const activeSessions = await portManager.getActiveSessions();
    
    console.log(`🔌 Sessões Ativas: ${chalk.bold.green(activeSessions.length)}`);
    
    if (activeSessions.length > 0) {
      console.log();
      activeSessions.forEach(session => {
        console.log(`  • ${chalk.bold(session.sessionName)} (porta ${session.port})`);
        console.log(`    💚 Status: Online`);
        console.log(`    🌐 Health: http://localhost:${session.port}/health`);
      });
    }

    console.log();
    console.log(chalk.yellow('💡 Para monitoramento avançado, acesse os endpoints HTTP das sessões ativas.'));

    await this.waitForKey();
    await this.showMainMenu();
  }

  /**
   * Cria sessão padrão
   */
  private async createDefaultSession(): Promise<void> {
    const defaultSession = {
      session_name: 'sessionName',
      is_active: true,
      ai_config: {
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 2000,
        system_prompt: 'Você é um assistente virtual inteligente e amigável.'
      },
      timing_config: {
        response_time: 2000,
        message_delay: 1000,
        rest_period: 300000,
        working_hours: { start: '08:00', end: '22:00' },
        message_limit_per_hour: 100,
        typing_simulation: true
      }
    };

    try {
      await supabase.from('whatsapp_sessions').insert([defaultSession]);
      console.log(chalk.green('✅ Sessão padrão criada com sucesso!'));
      await this.loadDashboardData();
      await this.startNewSession();
    } catch (error) {
      console.log(chalk.red(`❌ Erro ao criar sessão padrão: ${error}`));
    }
  }

  /**
   * Utilitários de loading
   */
  private startLoading(message: string): NodeJS.Timer {
    const chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    
    return setInterval(() => {
      process.stdout.write(`\r${chalk.blue(chars[i])} ${message}`);
      i = (i + 1) % chars.length;
    }, 100);
  }

  private stopLoading(interval: NodeJS.Timer): void {
    clearInterval(interval);
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
  }

  /**
   * Aguarda pressionar uma tecla
   */
  private async waitForKey(): Promise<void> {
    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: 'Pressione Enter para continuar...'
    }]);
  }

  /**
   * Configura saída limpa
   */
  private setupGracefulShutdown(): void {
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n👋 Encerrando dashboard...'));
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
      }
      process.exit(0);
    });
  }
}

export const terminalDashboard = new TerminalDashboard();