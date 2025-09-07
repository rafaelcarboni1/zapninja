import fs from 'fs/promises';
import path from 'path';
import { logger } from '../util/logger';

/**
 * Gerenciador de dados do dashboard
 */
export class DataManager {
  private dataPath = './data';
  private sessionsFile = path.join(this.dataPath, 'active-sessions.json');
  private configFile = path.join(this.dataPath, 'dashboard-config.json');

  constructor() {
    this.initializeDataStructure();
  }

  /**
   * Inicializa estrutura de dados necessária
   */
  private async initializeDataStructure(): Promise<void> {
    try {
      // Criar diretório data se não existir
      await this.ensureDirectoryExists(this.dataPath);
      
      // Inicializar arquivo de sessões ativas
      await this.initializeFile(this.sessionsFile, []);
      
      // Inicializar arquivo de configuração do dashboard
      const defaultConfig = {
        version: '2.1',
        lastStartup: new Date().toISOString(),
        basePort: 3000,
        maxConcurrentSessions: 10,
        autoCleanup: true,
        dashboardSettings: {
          theme: 'default',
          refreshInterval: 30000,
          showWelcomeMessage: true
        }
      };
      
      await this.initializeFile(this.configFile, defaultConfig);
      
      logger.info('Estrutura de dados do dashboard inicializada');
      
    } catch (error) {
      logger.error('Erro ao inicializar estrutura de dados:', error);
    }
  }

  /**
   * Garante que um diretório existe
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Inicializa um arquivo se não existir
   */
  private async initializeFile(filePath: string, defaultContent: any): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2));
    }
  }

  /**
   * Carrega configuração do dashboard
   */
  async loadDashboardConfig(): Promise<any> {
    try {
      const data = await fs.readFile(this.configFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Erro ao carregar configuração do dashboard:', error);
      return null;
    }
  }

  /**
   * Salva configuração do dashboard
   */
  async saveDashboardConfig(config: any): Promise<void> {
    try {
      config.lastUpdated = new Date().toISOString();
      await fs.writeFile(this.configFile, JSON.stringify(config, null, 2));
    } catch (error) {
      logger.error('Erro ao salvar configuração do dashboard:', error);
    }
  }

  /**
   * Carrega sessões ativas
   */
  async loadActiveSessions(): Promise<any[]> {
    try {
      const data = await fs.readFile(this.sessionsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Erro ao carregar sessões ativas:', error);
      return [];
    }
  }

  /**
   * Salva sessões ativas
   */
  async saveActiveSessions(sessions: any[]): Promise<void> {
    try {
      await fs.writeFile(this.sessionsFile, JSON.stringify(sessions, null, 2));
    } catch (error) {
      logger.error('Erro ao salvar sessões ativas:', error);
    }
  }

  /**
   * Limpa arquivos antigos
   */
  async cleanupOldData(daysOld: number = 7): Promise<void> {
    try {
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      
      // Listar arquivos no diretório de dados
      const files = await fs.readdir(this.dataPath);
      
      for (const file of files) {
        if (file.endsWith('.log') || file.endsWith('.old')) {
          const filePath = path.join(this.dataPath, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            logger.info(`Arquivo antigo removido: ${file}`);
          }
        }
      }
      
    } catch (error) {
      logger.error('Erro na limpeza de dados antigos:', error);
    }
  }

  /**
   * Cria backup dos dados
   */
  async createBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(this.dataPath, 'backups');
      await this.ensureDirectoryExists(backupDir);
      
      const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
      
      const backupData = {
        timestamp: new Date().toISOString(),
        config: await this.loadDashboardConfig(),
        sessions: await this.loadActiveSessions(),
        version: '2.1'
      };
      
      await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
      
      logger.info(`Backup criado: ${backupFile}`);
      return backupFile;
      
    } catch (error) {
      logger.error('Erro ao criar backup:', error);
      throw error;
    }
  }

  /**
   * Restaura dados de um backup
   */
  async restoreBackup(backupFile: string): Promise<void> {
    try {
      const data = await fs.readFile(backupFile, 'utf-8');
      const backup = JSON.parse(data);
      
      if (backup.config) {
        await this.saveDashboardConfig(backup.config);
      }
      
      if (backup.sessions) {
        await this.saveActiveSessions(backup.sessions);
      }
      
      logger.info(`Backup restaurado: ${backupFile}`);
      
    } catch (error) {
      logger.error('Erro ao restaurar backup:', error);
      throw error;
    }
  }

  /**
   * Lista backups disponíveis
   */
  async listBackups(): Promise<string[]> {
    try {
      const backupDir = path.join(this.dataPath, 'backups');
      
      try {
        const files = await fs.readdir(backupDir);
        return files
          .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
          .sort()
          .reverse(); // Mais recentes primeiro
      } catch {
        return []; // Diretório não existe
      }
      
    } catch (error) {
      logger.error('Erro ao listar backups:', error);
      return [];
    }
  }

  /**
   * Obtém estatísticas dos dados
   */
  async getDataStatistics(): Promise<{
    sessionsCount: number;
    lastBackup: string | null;
    dataSize: number;
    oldestFile: string | null;
  }> {
    try {
      const sessions = await this.loadActiveSessions();
      const backups = await this.listBackups();
      
      // Calcular tamanho dos dados
      let totalSize = 0;
      const files = await fs.readdir(this.dataPath);
      
      for (const file of files) {
        const filePath = path.join(this.dataPath, file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            totalSize += stats.size;
          }
        } catch {
          // Ignorar arquivos inacessíveis
        }
      }
      
      return {
        sessionsCount: sessions.length,
        lastBackup: backups.length > 0 ? backups[0] : null,
        dataSize: totalSize,
        oldestFile: files.length > 0 ? files[files.length - 1] : null
      };
      
    } catch (error) {
      logger.error('Erro ao obter estatísticas:', error);
      return {
        sessionsCount: 0,
        lastBackup: null,
        dataSize: 0,
        oldestFile: null
      };
    }
  }
}

export const dataManager = new DataManager();