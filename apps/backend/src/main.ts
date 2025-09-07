#!/usr/bin/env node

import { MainLauncher } from './dashboard/main-launcher';
import { startHealthServer } from './orchestrator/health-server';

/**
 * Ponto de entrada principal do ZAPNINJA
 * Este arquivo determina se deve mostrar o dashboard ou iniciar diretamente
 */

async function main() {
  try {
    // Start lightweight health server for Railway
    startHealthServer();
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