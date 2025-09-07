import dotenv from 'dotenv';
import { SimpleMenu } from './simple-menu';
import { logger } from '../util/logger';

// Carregar variáveis de ambiente
dotenv.config();

async function main() {
  try {
    logger.info('Iniciando menu simples...');
    const menu = new SimpleMenu();
    await menu.start();
  } catch (error) {
    logger.error('Erro fatal no menu simples', { error: error.message });
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

// Iniciar aplicação
main().catch((error) => {
  console.error('❌ Erro não tratado:', error);
  process.exit(1);
});