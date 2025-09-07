import { logger } from './logger';

class MaintenanceManager {
  private isMaintenanceMode: boolean;
  private maintenanceMessage: string;
  private maintenanceStartTime: Date | null;

  constructor() {
    this.isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
    this.maintenanceMessage = process.env.MAINTENANCE_MESSAGE || '🔧 Bot em manutenção. Tente novamente em alguns minutos.';
    this.maintenanceStartTime = this.isMaintenanceMode ? new Date() : null;
    
    if (this.isMaintenanceMode) {
      logger.warn('Bot iniciado em modo de manutenção');
    }
  }

  public isInMaintenance(): boolean {
    return this.isMaintenanceMode;
  }

  public getMaintenanceMessage(): string {
    return this.maintenanceMessage;
  }

  public enableMaintenance(customMessage?: string): void {
    this.isMaintenanceMode = true;
    this.maintenanceStartTime = new Date();
    
    if (customMessage) {
      this.maintenanceMessage = customMessage;
    }
    
    logger.warn('Modo de manutenção ativado', {
      message: this.maintenanceMessage,
      startTime: this.maintenanceStartTime
    });
  }

  public disableMaintenance(): void {
    const wasInMaintenance = this.isMaintenanceMode;
    this.isMaintenanceMode = false;
    
    if (wasInMaintenance && this.maintenanceStartTime) {
      const duration = Date.now() - this.maintenanceStartTime.getTime();
      const durationMinutes = Math.round(duration / 60000);
      
      logger.info('Modo de manutenção desativado', {
        duration: `${durationMinutes} minutos`,
        startTime: this.maintenanceStartTime,
        endTime: new Date()
      });
    }
    
    this.maintenanceStartTime = null;
  }

  public setMaintenanceMessage(message: string): void {
    this.maintenanceMessage = message;
    logger.info('Mensagem de manutenção atualizada', { newMessage: message });
  }

  public getMaintenanceStatus(): object {
    return {
      isInMaintenance: this.isMaintenanceMode,
      message: this.maintenanceMessage,
      startTime: this.maintenanceStartTime,
      duration: this.maintenanceStartTime 
        ? Math.round((Date.now() - this.maintenanceStartTime.getTime()) / 60000) + ' minutos'
        : null
    };
  }

  public shouldProcessMessage(): boolean {
    if (this.isMaintenanceMode) {
      logger.debug('Mensagem ignorada - bot em modo de manutenção');
      return false;
    }
    return true;
  }

  public getMaintenanceResponse(): string {
    const status = this.getMaintenanceStatus();
    let response = this.maintenanceMessage;
    
    if (status.duration) {
      response += `\n\n⏱️ Em manutenção há: ${status.duration}`;
    }
    
    return response;
  }
}

export const maintenanceManager = new MaintenanceManager();