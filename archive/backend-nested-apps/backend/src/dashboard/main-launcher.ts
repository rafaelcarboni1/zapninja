import dotenv from 'dotenv';
import chalk from 'chalk';
import axios from 'axios';
import { terminalDashboard } from './terminal-dashboard';
import { portManager } from './port-manager';
import { sessionController } from './session-controller';
import { logger } from '../util/logger';

// Carregar variáveis de ambiente
dotenv.config();

/**
 * Launcher principal do sistema ZAPNINJA
 */
export class MainLauncher {
  
  /**
   * Inicia o sistema baseado nos argumentos da linha de comando
   */
  static async start(): Promise<void> {
    try {
      const args = this.parseCommandLineArgs();

      // Verificar se é pedido de ajuda primeiro
      if (process.argv.includes('--help') || process.argv.includes('-h')) {
        this.showHelp();
        process.exit(0);
      }

      // Se argumentos específicos foram fornecidos, iniciar diretamente
      if (args.sessionName && args.directStart) {
        await this.startDirectSession({
          sessionName: args.sessionName,
          port: args.port,
          aiModel: args.aiModel
        });
        return;
      }

      // Caso contrário, mostrar dashboard
      await this.startDashboard();
      
    } catch (error) {
      console.error(chalk.red('❌ Erro ao iniciar o sistema:'), error);
      logger.error('Erro crítico no launcher:', error);
      process.exit(1);
    }
  }

  /**
   * Parse dos argumentos da linha de comando
   */
  private static parseCommandLineArgs(): {
    sessionName?: string;
    port?: number;
    aiModel?: 'GPT' | 'GEMINI';
    directStart: boolean;
    showDashboard: boolean;
  } {
    const args = process.argv.slice(2);
    const result: any = {
      directStart: false,
      showDashboard: false
    };
    
    for (const arg of args) {
      if (arg.startsWith('--session=')) {
        result.sessionName = arg.split('=')[1];
        result.directStart = true;
      } else if (arg.startsWith('--port=')) {
        result.port = parseInt(arg.split('=')[1]);
      } else if (arg.startsWith('--ai=')) {
        const aiModel = arg.split('=')[1] as 'GPT' | 'GEMINI';
        if (aiModel === 'GPT' || aiModel === 'GEMINI') {
          result.aiModel = aiModel;
        }
      } else if (arg === '--dashboard') {
        result.showDashboard = true;
      } else if (arg === '--no-dashboard') {
        result.directStart = true;
      }
    }
    
    // Se FORCE_CONNECT está definido, iniciar diretamente
    if (process.env.FORCE_CONNECT === 'true') {
      result.directStart = true;
      result.sessionName = result.sessionName || process.env.SESSION_NAME || 'sessionName';
    }

    return result;
  }

  /**
   * Inicia uma sessão diretamente (modo headless)
   */
  private static async startDirectSession(args: {
    sessionName: string;
    port?: number;
    aiModel?: 'GPT' | 'GEMINI';
  }): Promise<void> {
    const { sessionName, port, aiModel } = args;

    console.log(chalk.blue('🚀 ZAPNINJA - Modo Direto'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`📱 Sessão: ${chalk.bold.cyan(sessionName)}`);
    
    if (aiModel) {
      console.log(`🤖 IA: ${chalk.bold.yellow(aiModel)}`);
    }

    try {
      // Verificar se a sessão já está rodando
      const runningSessions = await portManager.getActiveSessions();
      const existingSession = runningSessions.find(s => s.sessionName === sessionName);

      if (existingSession) {
        console.log(chalk.yellow(`⚠️  Sessão '${sessionName}' já está rodando na porta ${existingSession.port}`));
        console.log(chalk.blue(`📊 Monitor: http://localhost:${existingSession.port}/health`));
        
        // Aguardar o processo existente
        await this.waitForExistingSession(existingSession.port);
        return;
      }

      // Obter porta disponível
      const assignedPort = port || await portManager.getAvailablePort();
      console.log(`🌐 Porta: ${chalk.bold.green(assignedPort)}`);
      console.log();

      // Definir variáveis de ambiente para o processo filho
      if (aiModel) {
        process.env.AI_SELECTED = aiModel;
      }

      // Registrar sessão
      await portManager.registerSession(sessionName, assignedPort);

      // Inicializar sessão (isso vai executar o código atual do WhatsApp)
      await this.initializeWhatsAppSession(sessionName, assignedPort);

    } catch (error) {
      console.error(chalk.red(`❌ Erro ao iniciar sessão direta: ${error}`));
      process.exit(1);
    }
  }

  /**
   * Inicia o dashboard interativo
   */
  private static async startDashboard(): Promise<void> {
    try {
      // Limpar processos órfãos
      await this.performStartupCleanup();

      // Iniciar dashboard
      await terminalDashboard.start();
      
    } catch (error) {
      console.error(chalk.red('❌ Erro no dashboard:'), error);
      process.exit(1);
    }
  }

  /**
   * Limpeza inicial do sistema
   */
  private static async performStartupCleanup(): Promise<void> {
    try {
      // Limpar processos órfãos
      const orphanedProcesses = await sessionController.cleanupOrphanProcesses();
      if (orphanedProcesses > 0) {
        console.log(chalk.yellow(`🧹 Removidos ${orphanedProcesses} processos órfãos`));
      }

      // Limpar portas ociosas
      const idlePorts = await portManager.cleanupIdlePorts();
      if (idlePorts > 0) {
        console.log(chalk.yellow(`🌐 Liberadas ${idlePorts} portas ociosas`));
      }

      // Verificar saúde do sistema
      const healthCheck = await portManager.healthCheck();
      if (healthCheck.status === 'error') {
        console.log(chalk.red('⚠️  Problemas detectados no sistema:'));
        healthCheck.issues.forEach(issue => {
          console.log(chalk.red(`   • ${issue}`));
        });
        console.log();
        console.log(chalk.yellow('💡 Recomendações:'));
        healthCheck.recommendations.forEach(rec => {
          console.log(chalk.yellow(`   • ${rec}`));
        });
        console.log();
      }

    } catch (error) {
      logger.warn('Erro na limpeza inicial:', error);
      // Não bloquear a inicialização por causa da limpeza
    }
  }

  /**
   * Aguarda sessão existente
   */
  private static async waitForExistingSession(port: number): Promise<void> {
    console.log(chalk.blue('👁️  Monitorando sessão existente...'));
    console.log(chalk.gray('   Pressione Ctrl+C para sair'));
    
    // Verificar status periodicamente
    const checkInterval = setInterval(async () => {
      try {
        const response = await axios.get(`http://localhost:${port}/health`, {
          timeout: 5000
        });
        const health = response.data;
        
        // Atualizar status na mesma linha
        process.stdout.write(`\r${chalk.blue('📊')} Mensagens: ${chalk.bold.yellow(health.messagesProcessed || 0)} | Erros: ${chalk.bold.red(health.errors || 0)} | Status: ${health.connected ? chalk.green('Conectado') : chalk.red('Desconectado')}`);
        
      } catch (error) {
        // Sessão provavelmente parou
        console.log(chalk.red('\n❌ Sessão parece ter parado.'));
        clearInterval(checkInterval);
      }
    }, 5000);

    // Aguardar Ctrl+C
    process.on('SIGINT', () => {
      clearInterval(checkInterval);
      console.log(chalk.yellow('\n👋 Parando monitoramento...'));
      process.exit(0);
    });

    // Manter o processo vivo
    await new Promise(() => {}); // Loop infinito
  }

  /**
   * Inicializa a sessão do WhatsApp (código atual)
   */
  private static async initializeWhatsAppSession(sessionName: string, port: number): Promise<void> {
    // Definir variáveis de ambiente
    process.env.SESSION_NAME = sessionName;
    process.env.PORT = port.toString();

    // Importar e executar o código principal do bot
    // Isso mantém a compatibilidade com o código existente
    const originalIndex = await import('../index');
    
    // O código original já está preparado para rodar com essas variáveis
    // Não é necessário chamar nenhuma função adicional
  }

  /**
   * Mostra ajuda da linha de comando
   */
  static showHelp(): void {
    console.log(chalk.blue('🤖 ZAPNINJA - Sistema de WhatsApp Bot'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log();
    console.log(chalk.bold('Uso:'));
    console.log('  npm run dev                    # Inicia dashboard interativo');
    console.log('  npm run dev -- --dashboard     # Força dashboard');
    console.log('  npm run dev -- --session=nome  # Inicia sessão direta');
    console.log('  npm run dev -- --port=3001     # Define porta específica');
    console.log('  npm run dev -- --ai=GPT        # Define modelo de IA');
    console.log();
    console.log(chalk.bold('Exemplos:'));
    console.log('  npm run dev -- --session=vendas --port=3001 --ai=GEMINI');
    console.log('  npm run dev -- --session=suporte');
    console.log();
    console.log(chalk.bold('Variáveis de Ambiente:'));
    console.log('  SESSION_NAME     # Nome da sessão padrão');
    console.log('  PORT             # Porta padrão');
    console.log('  AI_SELECTED      # Modelo de IA padrão (GPT/GEMINI)');
    console.log('  FORCE_CONNECT    # true = pular dashboard');
    console.log();
    console.log(chalk.yellow('💡 Para uso interativo completo, execute sem argumentos.'));
  }
}

// Auto-execução se este for o arquivo principal
// Em ES modules, usamos import.meta.url para verificar se é o arquivo principal
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  // Verificar se é pedido de ajuda
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    MainLauncher.showHelp();
    process.exit(0);
  }

  MainLauncher.start();
}