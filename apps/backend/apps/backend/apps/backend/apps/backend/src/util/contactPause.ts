import { logger } from './logger';

class ContactPauseManager {
  private pausedContacts: Set<string>;
  private pauseReasons: Map<string, string>;
  private pauseTimestamps: Map<string, Date>;

  constructor() {
    this.pausedContacts = new Set();
    this.pauseReasons = new Map();
    this.pauseTimestamps = new Map();
  }

  private normalizeNumber(number: string): string {
    return number.replace(/@c\.us$/, '').replace(/\D/g, '');
  }

  public pauseContact(number: string, reason?: string): boolean {
    const normalizedNumber = this.normalizeNumber(number);
    
    if (this.pausedContacts.has(normalizedNumber)) {
      return false; // Já estava pausado
    }

    this.pausedContacts.add(normalizedNumber);
    this.pauseTimestamps.set(normalizedNumber, new Date());
    
    if (reason) {
      this.pauseReasons.set(normalizedNumber, reason);
    }

    logger.info('Contato pausado individualmente', {
      contact: normalizedNumber,
      reason: reason || 'Sem motivo especificado',
      timestamp: new Date().toISOString()
    });

    return true;
  }

  public resumeContact(number: string): boolean {
    const normalizedNumber = this.normalizeNumber(number);
    
    if (!this.pausedContacts.has(normalizedNumber)) {
      return false; // Não estava pausado
    }

    this.pausedContacts.delete(normalizedNumber);
    this.pauseReasons.delete(normalizedNumber);
    
    const pauseStart = this.pauseTimestamps.get(normalizedNumber);
    this.pauseTimestamps.delete(normalizedNumber);
    
    const pauseDuration = pauseStart 
      ? Math.round((Date.now() - pauseStart.getTime()) / 60000)
      : 0;

    logger.info('Contato retomado', {
      contact: normalizedNumber,
      pauseDuration: `${pauseDuration} minutos`,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  public isContactPaused(number: string): boolean {
    const normalizedNumber = this.normalizeNumber(number);
    return this.pausedContacts.has(normalizedNumber);
  }

  public getPausedContacts(): Array<{
    number: string;
    reason?: string;
    pausedSince: Date;
    duration: string;
  }> {
    const result: Array<{
      number: string;
      reason?: string;
      pausedSince: Date;
      duration: string;
    }> = [];

    for (const number of this.pausedContacts) {
      const pausedSince = this.pauseTimestamps.get(number)!;
      const duration = Math.round((Date.now() - pausedSince.getTime()) / 60000);
      
      result.push({
        number,
        reason: this.pauseReasons.get(number),
        pausedSince,
        duration: `${duration} minutos`
      });
    }

    return result.sort((a, b) => b.pausedSince.getTime() - a.pausedSince.getTime());
  }

  public getPauseStatus(): {
    totalPaused: number;
    contacts: Array<{
      number: string;
      reason?: string;
      duration: string;
    }>;
  } {
    const contacts = this.getPausedContacts().map(contact => ({
      number: contact.number,
      reason: contact.reason,
      duration: contact.duration
    }));

    return {
      totalPaused: this.pausedContacts.size,
      contacts
    };
  }

  public clearAllPauses(): number {
    const count = this.pausedContacts.size;
    
    this.pausedContacts.clear();
    this.pauseReasons.clear();
    this.pauseTimestamps.clear();
    
    logger.info('Todas as pausas individuais foram removidas', { count });
    
    return count;
  }
}

export const contactPauseManager = new ContactPauseManager();