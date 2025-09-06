import { logger } from './logger';
import { numberFilter, FilterMode } from './filter';
import { maintenanceManager } from './maintenance';

interface ConfigCommand {
  key: string;
  value: string;
  fromNumber: string;
}

class DynamicConfigManager {
  private configCommand: string;
  private listCommand: string;
  private helpCommand: string;
  private adminNumbers: Set<string>;

  constructor() {
    this.configCommand = process.env.CONFIG_COMMAND || '!config';
    this.listCommand = process.env.LIST_COMMAND || '!lista';
    this.helpCommand = process.env.HELP_COMMAND || '!ajuda';
    this.adminNumbers = this.parseAdminNumbers();
  }

  private parseAdminNumbers(): Set<string> {
    const numbers = process.env.ADMIN_NUMBERS || '';
    return new Set(
      numbers.split(',').map(num => num.trim()).filter(num => num.length > 0)
    );
  }

  private isAdmin(number: string): boolean {
    // Normaliza o número removendo @c.us e outros caracteres não numéricos
    const normalizedNumber = number.replace(/@c\.us$/, '').replace(/\D/g, '');
    
    // Verifica se algum número admin está contido no número normalizado
    for (const adminNum of this.adminNumbers) {
      const normalizedAdmin = adminNum.replace(/\D/g, '');
      if (normalizedNumber.includes(normalizedAdmin)) {
        return true;
      }
    }
    
    return false;
  }

  public isConfigCommand(message: string): boolean {
    return message.startsWith(this.configCommand) || 
           message.startsWith(this.listCommand) || 
           message.startsWith(this.helpCommand);
  }

  public async processConfigCommand(message: string, fromNumber: string): Promise<string> {
    if (!this.isAdmin(fromNumber)) {
      logger.warn('Tentativa de acesso não autorizado às configurações', { fromNumber });
      return '❌ Acesso negado. Apenas administradores podem alterar configurações.';
    }

    const trimmedMessage = message.trim();

    // Comando de ajuda
    if (trimmedMessage === this.helpCommand) {
      return this.getHelpMessage();
    }

    // Comando de listagem
    if (trimmedMessage === this.listCommand) {
      return this.getConfigList();
    }

    // Comando de configuração
    if (trimmedMessage.startsWith(this.configCommand)) {
      const configPart = trimmedMessage.substring(this.configCommand.length).trim();
      
      if (!configPart) {
        return this.getConfigUsage();
      }

      return this.handleConfigChange(configPart, fromNumber);
    }

    return '❌ Comando não reconhecido. Use !ajuda para ver os comandos disponíveis.';
  }

  private handleConfigChange(configString: string, fromNumber: string): string {
    const parts = configString.split(' ');
    
    if (parts.length < 2) {
      return this.getConfigUsage();
    }

    const key = parts[0].toLowerCase();
    const value = parts.slice(1).join(' ');

    logger.info('Alteração de configuração solicitada', { key, value, fromNumber });

    switch (key) {
      case 'filtro':
        return this.handleFilterModeChange(value);
      
      case 'blacklist':
        return this.handleBlacklistChange(value);
      
      case 'whitelist':
        return this.handleWhitelistChange(value);
      
      case 'manutencao':
        return this.handleMaintenanceChange(value);
      
      case 'mensagem-manutencao':
        return this.handleMaintenanceMessageChange(value);
      
      case 'log-level':
        return this.handleLogLevelChange(value);
      
      default:
        return `❌ Configuração '${key}' não encontrada. Use !ajuda para ver as opções disponíveis.`;
    }
  }

  private handleFilterModeChange(value: string): string {
    const mode = value.toUpperCase();
    
    if (!Object.values(FilterMode).includes(mode as FilterMode)) {
      return '❌ Modo inválido. Use: DISABLED, BLACKLIST ou WHITELIST';
    }

    numberFilter.setFilterMode(mode as FilterMode);
    return `✅ Modo de filtro alterado para: ${mode}`;
  }

  private handleBlacklistChange(value: string): string {
    const parts = value.split(' ');
    const action = parts[0].toLowerCase();
    const number = parts[1];

    if (!number) {
      return '❌ Número não informado. Use: !config blacklist add/remove NÚMERO';
    }

    switch (action) {
      case 'add':
      case 'adicionar':
        const added = numberFilter.addToBlacklist(number);
        return added 
          ? `✅ Número ${number} adicionado à blacklist`
          : `⚠️ Número ${number} já estava na blacklist`;
      
      case 'remove':
      case 'remover':
        const removed = numberFilter.removeFromBlacklist(number);
        return removed 
          ? `✅ Número ${number} removido da blacklist`
          : `⚠️ Número ${number} não estava na blacklist`;
      
      default:
        return '❌ Ação inválida. Use: add ou remove';
    }
  }

  private handleWhitelistChange(value: string): string {
    const parts = value.split(' ');
    const action = parts[0].toLowerCase();
    const number = parts[1];

    if (!number) {
      return '❌ Número não informado. Use: !config whitelist add/remove NÚMERO';
    }

    switch (action) {
      case 'add':
      case 'adicionar':
        const added = numberFilter.addToWhitelist(number);
        return added 
          ? `✅ Número ${number} adicionado à whitelist`
          : `⚠️ Número ${number} já estava na whitelist`;
      
      case 'remove':
      case 'remover':
        const removed = numberFilter.removeFromWhitelist(number);
        return removed 
          ? `✅ Número ${number} removido da whitelist`
          : `⚠️ Número ${number} não estava na whitelist`;
      
      default:
        return '❌ Ação inválida. Use: add ou remove';
    }
  }

  private handleMaintenanceChange(value: string): string {
    const action = value.toLowerCase();
    
    switch (action) {
      case 'on':
      case 'ativar':
      case 'true':
        maintenanceManager.enableMaintenance();
        return '✅ Modo de manutenção ativado';
      
      case 'off':
      case 'desativar':
      case 'false':
        maintenanceManager.disableMaintenance();
        return '✅ Modo de manutenção desativado';
      
      default:
        return '❌ Valor inválido. Use: on/off, ativar/desativar ou true/false';
    }
  }

  private handleMaintenanceMessageChange(value: string): string {
    if (!value || value.length < 5) {
      return '❌ Mensagem muito curta. Mínimo 5 caracteres.';
    }

    maintenanceManager.setMaintenanceMessage(value);
    return `✅ Mensagem de manutenção atualizada: ${value}`;
  }

  private handleLogLevelChange(value: string): string {
    const level = value.toUpperCase();
    const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    
    if (!validLevels.includes(level)) {
      return `❌ Nível inválido. Use: ${validLevels.join(', ')}`;
    }

    // Nota: Esta mudança só afetará novos logs, não o logger atual
    process.env.LOG_LEVEL = level;
    return `✅ Nível de log alterado para: ${level} (reinicie o bot para aplicar)`;
  }

  private getHelpMessage(): string {
    return `🤖 *Comandos Disponíveis*

` +
           `📋 *Listagem e Ajuda:*
` +
           `${this.listCommand} - Lista todas as configurações
` +
           `${this.helpCommand} - Mostra esta ajuda

` +
           `⚙️ *Configurações:*
` +
           `${this.configCommand} filtro DISABLED/BLACKLIST/WHITELIST
` +
           `${this.configCommand} blacklist add/remove NÚMERO
` +
           `${this.configCommand} whitelist add/remove NÚMERO
` +
           `${this.configCommand} manutencao on/off
` +
           `${this.configCommand} mensagem-manutencao TEXTO
` +
           `${this.configCommand} log-level DEBUG/INFO/WARN/ERROR

` +
           `📝 *Exemplos:*
` +
           `${this.configCommand} filtro BLACKLIST
` +
           `${this.configCommand} blacklist add 5511999999999
` +
           `${this.configCommand} manutencao on`;
  }

  private getConfigUsage(): string {
    return `❌ Uso incorreto. Formato: ${this.configCommand} CHAVE VALOR\n\n` +
           `Use ${this.helpCommand} para ver todos os comandos disponíveis.`;
  }

  private getConfigList(): string {
    const filterStatus = numberFilter.getFilterStatus();
    const maintenanceStatus = maintenanceManager.getMaintenanceStatus();
    
    return `📊 *Configurações Atuais*\n\n` +
           `🔒 *Sistema de Filtro:*\n` +
           `Modo: ${filterStatus.mode}\n` +
           `Blacklist: ${filterStatus.blacklistCount} números\n` +
           `Whitelist: ${filterStatus.whitelistCount} números\n\n` +
           `🔧 *Manutenção:*\n` +
           `Status: ${maintenanceStatus.isInMaintenance ? 'Ativo' : 'Inativo'}\n` +
           `Mensagem: ${maintenanceStatus.message}\n` +
           `${maintenanceStatus.duration ? `Duração: ${maintenanceStatus.duration}\n` : ''}\n` +
           `📝 *Logs:*\n` +
           `Nível: ${process.env.LOG_LEVEL || 'INFO'}\n` +
           `Salvar em arquivo: ${process.env.SAVE_LOGS_TO_FILE === 'true' ? 'Sim' : 'Não'}`;
  }
}

export const configManager = new DynamicConfigManager();