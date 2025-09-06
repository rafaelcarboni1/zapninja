import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../util/logger';

const execAsync = promisify(exec);

interface SessionInfo {
  sessionName: string;
  port: number;
  pid?: number;
  status: 'running' | 'stopped' | 'error';
  startTime: Date;
  lastActivity?: Date;
}

interface PortStatus {
  port: number;
  inUse: boolean;
  process?: string;
  pid?: number;
}

/**
 * Gerenciador inteligente de portas para sessões do ZAPNINJA
 */
export class PortManager {
  private basePort = 3000;
  private maxPort = 65535;
  private sessionsFile = './data/active-sessions.json';
  private activeSessions: Map<string, SessionInfo> = new Map();

  constructor() {
    this.ensureDataDirectory();
    this.loadActiveSessions();
  }

  /**
   * Garante que o diretório de dados existe
   */
  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.mkdir('./data', { recursive: true });
    } catch (error) {
      logger.error('Erro ao criar diretório de dados:', error);
    }
  }

  /**
   * Carrega sessões ativas do arquivo
   */
  private async loadActiveSessions(): Promise<void> {
    try {
      const data = await fs.readFile(this.sessionsFile, 'utf-8');
      const sessions = JSON.parse(data);
      
      this.activeSessions.clear();
      for (const session of sessions) {
        this.activeSessions.set(session.sessionName, {
          ...session,
          startTime: new Date(session.startTime),
          lastActivity: session.lastActivity ? new Date(session.lastActivity) : undefined
        });
      }
      
      // Verificar se as sessões ainda estão rodando
      await this.validateActiveSessions();
      
    } catch (error) {
      // Arquivo não existe ou é inválido, inicializar vazio
      this.activeSessions.clear();
      await this.saveActiveSessions();
    }
  }

  /**
   * Salva sessões ativas no arquivo
   */
  private async saveActiveSessions(): Promise<void> {
    try {
      const sessions = Array.from(this.activeSessions.values());
      await fs.writeFile(this.sessionsFile, JSON.stringify(sessions, null, 2));
    } catch (error) {
      logger.error('Erro ao salvar sessões ativas:', error);
    }
  }

  /**
   * Valida se as sessões registradas ainda estão ativas
   */
  private async validateActiveSessions(): Promise<void> {
    const sessionsToRemove: string[] = [];

    for (const [sessionName, sessionInfo] of this.activeSessions.entries()) {
      const isRunning = await this.isPortInUse(sessionInfo.port);
      
      if (!isRunning) {
        logger.info(`Sessão ${sessionName} não está mais rodando na porta ${sessionInfo.port}`);
        sessionsToRemove.push(sessionName);
      } else {
        // Atualizar status e PID se necessário
        const portStatus = await this.getPortStatus(sessionInfo.port);
        if (portStatus?.pid) {
          sessionInfo.pid = portStatus.pid;
          sessionInfo.status = 'running';
        }
      }
    }

    // Remover sessões inativas
    for (const sessionName of sessionsToRemove) {
      this.activeSessions.delete(sessionName);
    }

    if (sessionsToRemove.length > 0) {
      await this.saveActiveSessions();
    }
  }

  /**
   * Verifica se uma porta está em uso
   */
  private async isPortInUse(port: number): Promise<boolean> {
    try {
      // Verificar no macOS/Linux
      const { stdout } = await execAsync(`lsof -i :${port} || netstat -an | grep :${port} || true`);
      return stdout.trim().length > 0;
    } catch (error) {
      // Em caso de erro, assumir que a porta não está em uso
      return false;
    }
  }

  /**
   * Obtém detalhes sobre uma porta específica
   */
  private async getPortStatus(port: number): Promise<PortStatus | null> {
    try {
      const { stdout } = await execAsync(`lsof -i :${port} -t 2>/dev/null || echo ""`);
      const pid = stdout.trim();

      if (!pid) {
        return { port, inUse: false };
      }

      // Obter informações do processo
      try {
        const { stdout: processInfo } = await execAsync(`ps -p ${pid} -o comm= 2>/dev/null || echo "unknown"`);
        return {
          port,
          inUse: true,
          process: processInfo.trim(),
          pid: parseInt(pid)
        };
      } catch {
        return { port, inUse: true, pid: parseInt(pid) };
      }
    } catch (error) {
      return { port, inUse: false };
    }
  }

  /**
   * Encontra uma porta disponível
   */
  async getAvailablePort(startPort?: number): Promise<number> {
    const start = startPort || this.basePort;
    
    for (let port = start; port <= this.maxPort; port++) {
      const inUse = await this.isPortInUse(port);
      
      if (!inUse) {
        logger.info(`Porta disponível encontrada: ${port}`);
        return port;
      }
    }

    throw new Error(`Nenhuma porta disponível entre ${start} e ${this.maxPort}`);
  }

  /**
   * Registra uma nova sessão
   */
  async registerSession(sessionName: string, port: number, pid?: number): Promise<void> {
    const sessionInfo: SessionInfo = {
      sessionName,
      port,
      pid,
      status: 'running',
      startTime: new Date(),
      lastActivity: new Date()
    };

    this.activeSessions.set(sessionName, sessionInfo);
    await this.saveActiveSessions();
    
    logger.info(`Sessão registrada: ${sessionName} na porta ${port}`);
  }

  /**
   * Remove uma sessão do registro
   */
  async releaseSession(sessionName: string): Promise<void> {
    if (this.activeSessions.has(sessionName)) {
      const sessionInfo = this.activeSessions.get(sessionName)!;
      logger.info(`Liberando sessão: ${sessionName} da porta ${sessionInfo.port}`);
      
      this.activeSessions.delete(sessionName);
      await this.saveActiveSessions();
    }
  }

  /**
   * Atualiza a última atividade de uma sessão
   */
  async updateSessionActivity(sessionName: string): Promise<void> {
    const sessionInfo = this.activeSessions.get(sessionName);
    if (sessionInfo) {
      sessionInfo.lastActivity = new Date();
      await this.saveActiveSessions();
    }
  }

  /**
   * Obtém todas as sessões ativas
   */
  async getActiveSessions(): Promise<SessionInfo[]> {
    await this.validateActiveSessions();
    return Array.from(this.activeSessions.values());
  }

  /**
   * Obtém informações de uma sessão específica
   */
  getSessionInfo(sessionName: string): SessionInfo | undefined {
    return this.activeSessions.get(sessionName);
  }

  /**
   * Lista portas em uso pelo sistema
   */
  async getUsedPorts(): Promise<number[]> {
    const activeSessions = await this.getActiveSessions();
    return activeSessions.map(session => session.port).sort((a, b) => a - b);
  }

  /**
   * Obtém a próxima porta disponível baseada nas sessões ativas
   */
  async getNextSequentialPort(): Promise<number> {
    const usedPorts = await this.getUsedPorts();
    
    if (usedPorts.length === 0) {
      return this.basePort;
    }

    // Encontrar gaps nas portas sequenciais
    for (let i = 0; i < usedPorts.length - 1; i++) {
      const currentPort = usedPorts[i];
      const nextPort = usedPorts[i + 1];
      
      if (nextPort - currentPort > 1) {
        // Há um gap, usar a próxima porta
        return currentPort + 1;
      }
    }

    // Não há gaps, usar a próxima após a última
    return Math.max(...usedPorts) + 1;
  }

  /**
   * Verifica conflitos de porta
   */
  async checkPortConflicts(): Promise<Array<{ sessionName: string; port: number; conflict: string }>> {
    const conflicts: Array<{ sessionName: string; port: number; conflict: string }> = [];
    
    for (const [sessionName, sessionInfo] of this.activeSessions.entries()) {
      const portStatus = await this.getPortStatus(sessionInfo.port);
      
      if (portStatus?.inUse && portStatus.pid !== sessionInfo.pid) {
        conflicts.push({
          sessionName,
          port: sessionInfo.port,
          conflict: `Porta ocupada por outro processo (PID: ${portStatus.pid})`
        });
      }
    }

    return conflicts;
  }

  /**
   * Mata um processo por porta (usar com cuidado!)
   */
  async killProcessOnPort(port: number, force = false): Promise<boolean> {
    try {
      const portStatus = await this.getPortStatus(port);
      
      if (!portStatus?.inUse || !portStatus.pid) {
        return true; // Porta já livre
      }

      const signal = force ? 'SIGKILL' : 'SIGTERM';
      await execAsync(`kill -${signal} ${portStatus.pid}`);
      
      // Aguardar um pouco e verificar se o processo foi encerrado
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const stillRunning = await this.isPortInUse(port);
      
      if (stillRunning && !force) {
        // Tentar força bruta se o término gracioso falhou
        return await this.killProcessOnPort(port, true);
      }

      logger.info(`Processo na porta ${port} foi encerrado`);
      return !stillRunning;
      
    } catch (error) {
      logger.error(`Erro ao tentar matar processo na porta ${port}:`, error);
      return false;
    }
  }

  /**
   * Limpa portas ociosas (sessões que não estão mais rodando)
   */
  async cleanupIdlePorts(): Promise<number> {
    await this.validateActiveSessions();
    const beforeCount = this.activeSessions.size;
    const afterCount = this.activeSessions.size;
    
    return beforeCount - afterCount;
  }

  /**
   * Força a limpeza de todas as sessões registradas
   */
  async forceCleanup(): Promise<void> {
    this.activeSessions.clear();
    await this.saveActiveSessions();
    logger.info('Todas as sessões foram removidas do registro');
  }

  /**
   * Obtém estatísticas das portas
   */
  async getPortStatistics(): Promise<{
    totalRegistered: number;
    totalActive: number;
    basePort: number;
    highestPort: number;
    averageUptime: number;
    oldestSession: string | null;
  }> {
    const activeSessions = await this.getActiveSessions();
    
    if (activeSessions.length === 0) {
      return {
        totalRegistered: 0,
        totalActive: 0,
        basePort: this.basePort,
        highestPort: this.basePort,
        averageUptime: 0,
        oldestSession: null
      };
    }

    const ports = activeSessions.map(s => s.port);
    const now = new Date();
    const uptimes = activeSessions.map(s => now.getTime() - s.startTime.getTime());
    const oldestSession = activeSessions.reduce((oldest, current) => 
      current.startTime < oldest.startTime ? current : oldest
    );

    return {
      totalRegistered: this.activeSessions.size,
      totalActive: activeSessions.length,
      basePort: this.basePort,
      highestPort: Math.max(...ports),
      averageUptime: uptimes.reduce((a, b) => a + b, 0) / uptimes.length,
      oldestSession: oldestSession.sessionName
    };
  }

  /**
   * Verifica a saúde do sistema de portas
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Verificar conflitos
    const conflicts = await this.checkPortConflicts();
    if (conflicts.length > 0) {
      issues.push(`${conflicts.length} conflitos de porta detectados`);
      recommendations.push('Execute limpeza de portas ociosas');
    }

    // Verificar se há muitas portas em uso
    const usedPorts = await this.getUsedPorts();
    if (usedPorts.length > 50) {
      issues.push('Muitas portas em uso simultaneamente');
      recommendations.push('Considere consolidar sessões ou aumentar limite de portas');
    }

    // Verificar se estamos próximos do limite
    const highestPort = Math.max(...usedPorts, this.basePort);
    if (highestPort > this.maxPort - 1000) {
      issues.push('Aproximando do limite máximo de portas');
      recommendations.push('Considere reiniciar o sistema ou liberar portas');
    }

    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    if (issues.length > 0) {
      status = conflicts.length > 0 ? 'error' : 'warning';
    }

    return { status, issues, recommendations };
  }

  /**
   * Obtém porta base configurada
   */
  getBasePort(): number {
    return this.basePort;
  }

  /**
   * Define nova porta base
   */
  async setBasePort(newBasePort: number): Promise<void> {
    if (newBasePort < 1024 || newBasePort > 65535) {
      throw new Error('Porta base deve estar entre 1024 e 65535');
    }
    
    this.basePort = newBasePort;
    logger.info(`Porta base alterada para ${newBasePort}`);
  }

  /**
   * Exporta configuração atual para backup
   */
  async exportConfiguration(): Promise<string> {
    const config = {
      basePort: this.basePort,
      maxPort: this.maxPort,
      activeSessions: Array.from(this.activeSessions.values()),
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(config, null, 2);
  }

  /**
   * Importa configuração de backup
   */
  async importConfiguration(configJson: string): Promise<void> {
    try {
      const config = JSON.parse(configJson);
      
      this.basePort = config.basePort || this.basePort;
      this.maxPort = config.maxPort || this.maxPort;
      
      // Validar e restaurar sessões
      this.activeSessions.clear();
      if (config.activeSessions) {
        for (const session of config.activeSessions) {
          const isStillRunning = await this.isPortInUse(session.port);
          if (isStillRunning) {
            this.activeSessions.set(session.sessionName, {
              ...session,
              startTime: new Date(session.startTime),
              lastActivity: session.lastActivity ? new Date(session.lastActivity) : undefined
            });
          }
        }
      }
      
      await this.saveActiveSessions();
      logger.info('Configuração importada com sucesso');
      
    } catch (error) {
      throw new Error(`Erro ao importar configuração: ${error}`);
    }
  }
}

export const portManager = new PortManager();