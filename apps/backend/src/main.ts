#!/usr/bin/env node

import { MainLauncher } from './dashboard/main-launcher';
import './orchestrator/server';
import { env } from './config/env';

/**
 * Ponto de entrada principal do ZAPNINJA
 * Este arquivo determina se deve mostrar o dashboard ou iniciar diretamente
 */

async function main() {
  try {
    // Em modo Evolution, não iniciar o launcher interativo
    if (env.whatsappProvider === 'evolution') {
      console.log('⚙️ Evolution mode: iniciando apenas o orquestrador (sem dashboard/launcher).');
      return;
    }
    // Orchestrator já inicia e expõe /health; iniciar launcher principal (WPPConnect)
    await MainLauncher.start();
  } catch (error) {
    console.error('Erro fatal:', error);
    process.exit(1);
  }
}

// Executar apenas se for o arquivo principal
// Em ES modules, usamos import.meta.url para verificar se é o arquivo principal
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  main();
}

export { MainLauncher };