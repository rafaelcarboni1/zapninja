import { logger } from './logger';

export enum FilterMode {
  DISABLED = 'DISABLED',
  BLACKLIST = 'BLACKLIST',
  WHITELIST = 'WHITELIST'
}

class NumberFilter {
  private mode: FilterMode;
  private blacklist: Set<string>;
  private whitelist: Set<string>;

  constructor() {
    this.mode = this.getFilterModeFromEnv();
    this.blacklist = this.parseNumberList(process.env.BLACKLIST_NUMBERS || '');
    this.whitelist = this.parseNumberList(process.env.WHITELIST_NUMBERS || '');
    
    logger.info(`Sistema de filtro inicializado`, {
      mode: this.mode,
      blacklistCount: this.blacklist.size,
      whitelistCount: this.whitelist.size
    });
  }

  private getFilterModeFromEnv(): FilterMode {
    const mode = process.env.FILTER_MODE?.toUpperCase();
    switch (mode) {
      case 'BLACKLIST': return FilterMode.BLACKLIST;
      case 'WHITELIST': return FilterMode.WHITELIST;
      case 'DISABLED':
      default: return FilterMode.DISABLED;
    }
  }

  private parseNumberList(numberString: string): Set<string> {
    if (!numberString.trim()) return new Set();
    
    return new Set(
      numberString
        .split(',')
        .map(num => this.normalizeNumber(num.trim()))
        .filter(num => num.length > 0)
    );
  }

  private normalizeNumber(number: string): string {
    // Remove todos os caracteres não numéricos
    const cleaned = number.replace(/\D/g, '');
    
    // Se começar com 55 (código do Brasil), mantém
    if (cleaned.startsWith('55')) {
      return cleaned;
    }
    
    // Se começar com 11, 21, etc. (códigos de área), adiciona 55
    if (cleaned.length >= 10 && cleaned.length <= 11) {
      return '55' + cleaned;
    }
    
    return cleaned;
  }

  public shouldProcessMessage(fromNumber: string): boolean {
    if (this.mode === FilterMode.DISABLED) {
      return true;
    }

    const normalizedNumber = this.normalizeNumber(fromNumber);
    
    switch (this.mode) {
      case FilterMode.BLACKLIST:
        const isBlacklisted = this.blacklist.has(normalizedNumber);
        if (isBlacklisted) {
          logger.warn(`Mensagem bloqueada - número na blacklist`, { number: normalizedNumber });
        }
        return !isBlacklisted;
        
      case FilterMode.WHITELIST:
        const isWhitelisted = this.whitelist.has(normalizedNumber);
        if (!isWhitelisted) {
          logger.warn(`Mensagem bloqueada - número não está na whitelist`, { number: normalizedNumber });
        }
        return isWhitelisted;
        
      default:
        return true;
    }
  }

  public addToBlacklist(number: string): boolean {
    const normalizedNumber = this.normalizeNumber(number);
    if (this.blacklist.has(normalizedNumber)) {
      return false; // Já existe
    }
    
    this.blacklist.add(normalizedNumber);
    logger.info(`Número adicionado à blacklist`, { number: normalizedNumber });
    return true;
  }

  public removeFromBlacklist(number: string): boolean {
    const normalizedNumber = this.normalizeNumber(number);
    const removed = this.blacklist.delete(normalizedNumber);
    
    if (removed) {
      logger.info(`Número removido da blacklist`, { number: normalizedNumber });
    }
    
    return removed;
  }

  public addToWhitelist(number: string): boolean {
    const normalizedNumber = this.normalizeNumber(number);
    if (this.whitelist.has(normalizedNumber)) {
      return false; // Já existe
    }
    
    this.whitelist.add(normalizedNumber);
    logger.info(`Número adicionado à whitelist`, { number: normalizedNumber });
    return true;
  }

  public removeFromWhitelist(number: string): boolean {
    const normalizedNumber = this.normalizeNumber(number);
    const removed = this.whitelist.delete(normalizedNumber);
    
    if (removed) {
      logger.info(`Número removido da whitelist`, { number: normalizedNumber });
    }
    
    return removed;
  }

  public getBlacklistNumbers(): string[] {
    return Array.from(this.blacklist);
  }

  public getWhitelistNumbers(): string[] {
    return Array.from(this.whitelist);
  }

  public getFilterMode(): FilterMode {
    return this.mode;
  }

  public setFilterMode(mode: FilterMode): void {
    this.mode = mode;
    logger.info(`Modo de filtro alterado`, { newMode: mode });
  }

  public getFilterStatus(): object {
    return {
      mode: this.mode,
      blacklistCount: this.blacklist.size,
      whitelistCount: this.whitelist.size,
      blacklistNumbers: this.getBlacklistNumbers(),
      whitelistNumbers: this.getWhitelistNumbers()
    };
  }
}

export const numberFilter = new NumberFilter();