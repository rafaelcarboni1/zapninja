import dotenv from 'dotenv';
dotenv.config();

export const env = {
  orchestratorPort: Number(process.env.ORCHESTRATOR_PORT || 4000),
  whatsappProvider: (process.env.WHATSAPP_PROVIDER || 'wppconnect').toLowerCase(),
  evolution: {
    baseUrl: process.env.EVOLUTION_API_URL || '',
    apiKey: process.env.EVOLUTION_API_KEY || ''
  },
  railway: {
    databaseUrl: process.env.DATABASE_URL || '',
    redisUrl: process.env.REDIS_URL || ''
  }
};

export function assertEnv(condition: any, message: string): void {
  if (!condition) {
    throw new Error(`[ENV] ${message}`);
  }
}


