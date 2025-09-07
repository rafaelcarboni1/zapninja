import { logger } from '../util/logger';
import { config } from '../util/config';

class SimpleMenu {
  async start() {
    try {
      console.log('\n🚀 Sistema WhatsApp Multi-Sessão');
      console.log('================================');
      console.log('\n📋 Menu Principal:');
      console.log('1. Criar nova sessão');
      console.log('2. Listar sessões ativas');
      console.log('3. Parar sessão');
      console.log('4. Sair');
      console.log('\n⚠️  Nota: Sistema funcionando em modo simplificado (sem PM2)');
      console.log('\n✅ Menu carregado com sucesso!');
      
      // Simular menu interativo básico
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      console.log('\nPressione qualquer tecla para continuar ou \'q\' para sair...');
      
      process.stdin.on('data', (key) => {
        if (key === 'q' || key === '\u0003') { // 'q' ou Ctrl+C
          console.log('\n👋 Saindo do sistema...');
          process.exit(0);
        } else {
          console.log('\n✅ Sistema funcionando! Pressione \'q\' para sair.');
        }
      });
      
    } catch (error) {
      logger.error('Erro ao iniciar menu simples', { error: error.message });
      console.error('❌ Erro ao iniciar menu:', error.message);
      process.exit(1);
    }
  }
}

export { SimpleMenu };