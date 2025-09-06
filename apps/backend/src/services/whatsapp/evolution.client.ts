import axios, { AxiosInstance } from 'axios';
import { env, assertEnv } from '../../config/env';
import { logger } from '../../util/logger';

export interface EvolutionMessage {
  number: string; // E.164 without '+'
  text: string;
}

export class EvolutionClient {
  private http: AxiosInstance;

  constructor() {
    assertEnv(env.evolution.baseUrl, 'EVOLUTION_API_URL is required');
    assertEnv(env.evolution.apiKey, 'EVOLUTION_API_KEY is required');

    this.http = axios.create({
      baseURL: env.evolution.baseUrl.replace(/\/$/, ''),
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.evolution.apiKey
      },
      timeout: 15000
    });
  }

  async sendText(message: EvolutionMessage): Promise<boolean> {
    try {
      const { data } = await this.http.post('/message/sendtext', {
        number: message.number,
        text: message.text
      });
      logger.info('Evolution sendText ok', { id: data?.id || data?.messageId || 'n/a' });
      return true;
    } catch (error: any) {
      logger.error('Evolution sendText error', { error: error?.message });
      return false;
    }
  }

  async getQrCode(instance: string): Promise<{ base64: string } | null> {
    try {
      const { data } = await this.http.get(`/instance/qr/${encodeURIComponent(instance)}`);
      return { base64: data?.base64 || '' };
    } catch (error: any) {
      logger.error('Evolution getQrCode error', { error: error?.message });
      return null;
    }
  }

  async status(instance: string): Promise<any> {
    try {
      const { data } = await this.http.get(`/instance/status/${encodeURIComponent(instance)}`);
      return data;
    } catch (error: any) {
      logger.error('Evolution status error', { error: error?.message });
      return null;
    }
  }
}

export const evolutionClient = new EvolutionClient();


