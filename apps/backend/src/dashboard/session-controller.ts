import { spawn, ChildProcess } from 'child_process';
import { portManager } from './port-manager';
import { logger } from '../util/logger';
import chalk from 'chalk';
import axios from 'axios';

interface SessionProcess {
  sessionName: string;
  port: number;
  process: ChildProcess;
  pid: number;
  startTime: Date;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
}

/**
 * Controlador de sessões do WhatsApp
 */
export class SessionController {
  private runningProcesses: Map<string, SessionProcess> = new Map();
  private logStreams: Map<string, NodeJS.ReadableStream> = new Map();

  /**
   * Inicia uma sessão específica
   */
  async launchSession(sessionName: string, port: number): Promise<boolean> {
    try {
      // Verificar se a sessão já está rodando
      if (this.runningProcesses.has(sessionName)) {
        console.log(chalk.yellow(`⚠️  Sessão '${sessionName}' já está rodando`));
        return false;
      }

      console.log(chalk.blue(`🚀 Iniciando sessão '${sessionName}' na porta ${port}...`));

      // Configurar argumentos do processo
      const args = [
        'run', 
        'dev', 
        '--', 
        `--session=${sessionName}`, 
        `--port=${port}`
      ];

      // Spawn do processo
      const childProcess = spawn('npm', args, {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
        env: {
          ...process.env,
          SESSION_NAME: sessionName,
          PORT: port.toString(),
          FORCE_CONNECT: 'true'
        }
      });

      if (!childProcess.pid) {
        throw new Error('Falha ao obter PID do processo');
      }

      // Registrar processo
      const sessionProcess: SessionProcess = {
        sessionName,
        port,
        process: childProcess,
        pid: childProcess.pid,
        startTime: new Date(),
        status: 'starting'
      };

      this.runningProcesses.set(sessionName, sessionProcess);

      // Configurar handlers do processo
      this.setupProcessHandlers(sessionProcess);

      // Aguardar inicialização (até 30 segundos)
      const initialized = await this.waitForInitialization(sessionName, port, 30000);

      if (initialized) {
        sessionProcess.status = 'running';
        console.log(chalk.green(`✅ Sessão '${sessionName}' iniciada com sucesso!`));
        console.log(chalk.blue(`📊 Monitor: http://localhost:${port}/health`));
        
        // Registrar no gerenciador de portas
        await portManager.registerSession(sessionName, port, childProcess.pid);
        
        return true;
      } else {
        console.log(chalk.red(`❌ Timeout na inicialização da sessão '${sessionName}'`));
        await this.stopSession(sessionName);
        return false;
      }

    } catch (error) {
      console.log(chalk.red(`❌ Erro ao iniciar sessão '${sessionName}': ${error}`));
      logger.error(`Erro ao iniciar sessão ${sessionName}:`, error);
      return false;
    }
  }

  /**
   * Para uma sessão específica
   */
  async stopSession(sessionName: string): Promise<boolean> {
    try {
      const sessionProcess = this.runningProcesses.get(sessionName);
      
      if (!sessionProcess) {
        console.log(chalk.yellow(`⚠️  Sessão '${sessionName}' não está rodando`));
        return true;
      }

      console.log(chalk.yellow(`🛑 Parando sessão '${sessionName}'...`));
      
      sessionProcess.status = 'stopping';

      // Tentar parada graceful primeiro
      sessionProcess.process.kill('SIGTERM');
      
      // Aguardar até 10 segundos para parada graceful
      const gracefulStop = await this.waitForProcessEnd(sessionProcess, 10000);
      
      if (!gracefulStop) {
        console.log(chalk.yellow(`⚠️  Forçando parada da sessão '${sessionName}'...`));
        sessionProcess.process.kill('SIGKILL');
        
        // Aguardar mais 5 segundos
        await this.waitForProcessEnd(sessionProcess, 5000);
      }

      // Limpar registro
      this.runningProcesses.delete(sessionName);
      await portManager.releaseSession(sessionName);
      
      console.log(chalk.green(`✅ Sessão '${sessionName}' foi parada`));
      return true;

    } catch (error) {
      console.log(chalk.red(`❌ Erro ao parar sessão '${sessionName}': ${error}`));
      logger.error(`Erro ao parar sessão ${sessionName}:`, error);
      return false;
    }
  }

  /**
   * Reinicia uma sessão
   */
  async restartSession(sessionName: string): Promise<boolean> {
    console.log(chalk.blue(`🔄 Reiniciando sessão '${sessionName}'...`));
    
    const sessionProcess = this.runningProcesses.get(sessionName);
    const port = sessionProcess?.port || await portManager.getAvailablePort();
    
    // Parar sessão atual
    const stopped = await this.stopSession(sessionName);
    
    if (!stopped) {
      console.log(chalk.red(`❌ Falha ao parar sessão '${sessionName}' para reinício`));
      return false;
    }

    // Aguardar um pouco antes de reiniciar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Iniciar novamente
    return await this.launchSession(sessionName, port);
  }

  /**
   * Exibe status detalhado de uma sessão
   */
  async showSessionStatus(sessionName: string, port: number): Promise<void> {
    console.log(chalk.blue(`📊 STATUS DA SESSÃO: ${sessionName.toUpperCase()}`));
    console.log(chalk.gray('─'.repeat(50)));

    const sessionProcess = this.runningProcesses.get(sessionName);
    
    if (!sessionProcess) {
      console.log(chalk.red('❌ Sessão não encontrada nos processos ativos'));
      return;
    }

    // Informações básicas
    console.log(`${chalk.bold('Nome:')} ${sessionName}`);
    console.log(`${chalk.bold('Porta:')} ${port}`);
    console.log(`${chalk.bold('PID:')} ${sessionProcess.pid}`);
    console.log(`${chalk.bold('Status:')} ${this.getStatusIcon(sessionProcess.status)} ${sessionProcess.status.toUpperCase()}`);
    console.log(`${chalk.bold('Iniciado em:')} ${sessionProcess.startTime.toLocaleString('pt-BR')}`);
    
    const uptime = Date.now() - sessionProcess.startTime.getTime();
    console.log(`${chalk.bold('Tempo ativo:')} ${this.formatUptime(uptime)}`);

    // Verificar health endpoint
    try {
      console.log(chalk.blue('\n🔍 Verificando saúde da sessão...'));
      
      const response = await axios.get(`http://localhost:${port}/health`, {
        timeout: 5000
      });
      
      const health = response.data;
      
      console.log(`${chalk.bold('Conexão WhatsApp:')} ${health.connected ? chalk.green('✅ Conectado') : chalk.red('❌ Desconectado')}`);
      console.log(`${chalk.bold('Mensagens processadas:')} ${chalk.yellow(health.messagesProcessed || 0)}`);
      console.log(`${chalk.bold('Erros:')} ${health.errors || 0}`);
      console.log(`${chalk.bold('Última atividade:')} ${health.lastActivity ? new Date(health.lastActivity).toLocaleString('pt-BR') : 'N/A'}`);
      
      if (health.uptime) {
        console.log(`${chalk.bold('Uptime do serviço:')} ${this.formatUptime(health.uptime)}`);
      }

    } catch (error) {
      console.log(chalk.red('❌ Não foi possível obter informações de saúde da sessão'));
      console.log(`   Erro: ${error instanceof Error ? error.message : 'Desconhecido'}`);
    }

    // Uso de recursos (se disponível)
    try {
      const processInfo = await this.getProcessInfo(sessionProcess.pid);
      if (processInfo) {
        console.log(chalk.blue('\n💻 Uso de recursos:'));
        console.log(`${chalk.bold('CPU:')} ${processInfo.cpu}%`);
        console.log(`${chalk.bold('Memória:')} ${processInfo.memory} MB`);
      }
    } catch {
      // Ignorar erros de informações de processo
    }
  }

  /**
   * Acompanha logs de uma sessão em tempo real
   */
  async followLogs(sessionName: string): Promise<void> {
    const sessionProcess = this.runningProcesses.get(sessionName);
    
    if (!sessionProcess) {
      console.log(chalk.red(`❌ Sessão '${sessionName}' não encontrada`));
      return;
    }

    console.log(chalk.blue(`📝 LOGS DA SESSÃO: ${sessionName.toUpperCase()}`));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.yellow('Pressione Ctrl+C para parar de acompanhar os logs'));
    console.log(chalk.gray('─'.repeat(50)));

    // Configurar listeners para stdout e stderr
    if (sessionProcess.process.stdout) {
      sessionProcess.process.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            console.log(`${chalk.gray('[OUT]')} ${line}`);
          }
        });
      });
    }

    if (sessionProcess.process.stderr) {
      sessionProcess.process.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            console.log(`${chalk.red('[ERR]')} ${line}`);
          }
        });
      });
    }

    // Aguardar interrupção do usuário
    return new Promise((resolve) => {
      const onExit = () => {
        console.log(chalk.yellow('\n👋 Parando acompanhamento de logs...'));
        process.removeListener('SIGINT', onExit);
        resolve();
      };
      
      process.on('SIGINT', onExit);
    });
  }

  /**
   * Lista todas as sessões em execução
   */
  getRunningProcesses(): SessionProcess[] {
    return Array.from(this.runningProcesses.values());
  }

  /**
   * Obtém processo de uma sessão específica
   */
  getSessionProcess(sessionName: string): SessionProcess | undefined {
    return this.runningProcesses.get(sessionName);
  }

  /**
   * Para todas as sessões
   */
  async stopAllSessions(): Promise<void> {
    console.log(chalk.yellow('🛑 Parando todas as sessões...'));
    
    const sessions = Array.from(this.runningProcesses.keys());
    const stopPromises = sessions.map(sessionName => this.stopSession(sessionName));
    
    await Promise.all(stopPromises);
    
    console.log(chalk.green('✅ Todas as sessões foram paradas'));
  }

  /**
   * Configura handlers do processo
   */
  private setupProcessHandlers(sessionProcess: SessionProcess): void {
    const { sessionName, process: childProcess } = sessionProcess;

    childProcess.on('exit', (code, signal) => {
      logger.info(`Sessão ${sessionName} encerrada`, { code, signal });
      
      if (code === 0) {
        console.log(chalk.green(`✅ Sessão '${sessionName}' encerrada normalmente`));
      } else {
        console.log(chalk.red(`❌ Sessão '${sessionName}' encerrada com código ${code}`));
      }
      
      sessionProcess.status = 'stopped';
      this.runningProcesses.delete(sessionName);
      portManager.releaseSession(sessionName);
    });

    childProcess.on('error', (error) => {
      logger.error(`Erro na sessão ${sessionName}:`, error);
      console.log(chalk.red(`❌ Erro na sessão '${sessionName}': ${error.message}`));
      sessionProcess.status = 'error';
    });

    // Capturar logs para possível análise posterior
    if (childProcess.stdout) {
      childProcess.stdout.on('data', (data) => {
        const logData = data.toString();
        
        // Detectar sucesso na inicialização
        if (logData.includes('Cliente WhatsApp criado com sucesso') || 
            logData.includes('Bot iniciado com sucesso')) {
          sessionProcess.status = 'running';
        }
        
        // Detectar erros críticos
        if (logData.includes('Erro ao criar cliente') || 
            logData.includes('EADDRINUSE')) {
          sessionProcess.status = 'error';
        }
      });
    }
  }

  /**
   * Aguarda inicialização da sessão
   */
  private async waitForInitialization(sessionName: string, port: number, timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Verificar se o endpoint de health responde
        const response = await axios.get(`http://localhost:${port}/health`, {
          timeout: 2000
        });
        
        if (response.status === 200) {
          return true;
        }
      } catch {
        // Endpoint ainda não está disponível, continuar tentando
      }
      
      // Verificar se o processo ainda está rodando
      const sessionProcess = this.runningProcesses.get(sessionName);
      if (!sessionProcess || sessionProcess.status === 'error') {
        return false;
      }
      
      // Aguardar um pouco antes da próxima verificação
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
  }

  /**
   * Aguarda o fim do processo
   */
  private async waitForProcessEnd(sessionProcess: SessionProcess, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, timeoutMs);

      sessionProcess.process.on('exit', () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
  }

  /**
   * Obtém informações do processo
   */
  private async getProcessInfo(pid: number): Promise<{ cpu: number; memory: number } | null> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      // Comando específico para macOS/Linux
      const { stdout } = await execAsync(`ps -p ${pid} -o %cpu,%mem --no-headers 2>/dev/null`);
      
      if (!stdout.trim()) return null;
      
      const [cpu, memory] = stdout.trim().split(/\s+/).map(parseFloat);
      
      return {
        cpu: cpu || 0,
        memory: memory ? Math.round(memory * 10) / 10 : 0 // Converter para MB aproximado
      };
    } catch {
      return null;
    }
  }

  /**
   * Obtém ícone do status
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'starting': return '🟡';
      case 'running': return '🟢';
      case 'stopping': return '🟠';
      case 'stopped': return '⚫';
      case 'error': return '🔴';
      default: return '⚪';
    }
  }

  /**
   * Formata tempo de atividade
   */
  private formatUptime(uptimeMs: number): string {
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Limpa processos órfãos
   */
  async cleanupOrphanProcesses(): Promise<number> {
    let cleaned = 0;
    
    for (const [sessionName, sessionProcess] of this.runningProcesses.entries()) {
      try {
        // Verificar se o processo ainda existe
        process.kill(sessionProcess.pid, 0); // Signal 0 apenas verifica existência
      } catch {
        // Processo não existe mais, remover do registro
        logger.info(`Removendo processo órfão: ${sessionName} (PID ${sessionProcess.pid})`);
        this.runningProcesses.delete(sessionName);
        await portManager.releaseSession(sessionName);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

export const sessionController = new SessionController();