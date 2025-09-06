#!/usr/bin/env node
/**
 * Health Check Automatizado
 * Verifica a saúde do sistema e gera relatórios
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

class HealthChecker {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      checks: [],
      warnings: [],
      errors: [],
      recommendations: []
    };
  }

  /**
   * Executar todos os health checks
   */
  async runAllChecks() {
    console.log('🏥 Iniciando Health Check do Sistema...\n');
    
    await this.checkPM2Processes();
    await this.checkSystemResources();
    await this.checkLogFiles();
    await this.checkDiskSpace();
    await this.checkNetworkPorts();
    await this.checkDependencies();
    
    this.generateReport();
    this.saveReport();
  }

  /**
   * Verificar processos PM2
   */
  async checkPM2Processes() {
    try {
      const pm2List = execSync('/opt/homebrew/bin/pm2 jlist', { encoding: 'utf8' });
      const processes = JSON.parse(pm2List || '[]');
      
      const check = {
        name: 'PM2 Processes',
        status: 'pass',
        details: []
      };

      if (processes.length === 0) {
        check.status = 'fail';
        this.results.errors.push('Nenhum processo PM2 encontrado');
        this.results.recommendations.push('Execute: npm run start');
      } else {
        const offlineProcesses = processes.filter(p => p.pm2_env.status !== 'online');
        const highMemoryProcesses = processes.filter(p => p.monit.memory > 200 * 1024 * 1024); // 200MB
        const highRestartProcesses = processes.filter(p => p.pm2_env.restart_time > 5);

        check.details.push(`Total de processos: ${processes.length}`);
        check.details.push(`Processos online: ${processes.length - offlineProcesses.length}`);
        
        if (offlineProcesses.length > 0) {
          check.status = 'warn';
          this.results.warnings.push(`${offlineProcesses.length} processo(s) offline`);
          offlineProcesses.forEach(p => {
            check.details.push(`❌ ${p.name} (${p.pm2_env.status})`);
          });
        }

        if (highMemoryProcesses.length > 0) {
          check.status = 'warn';
          this.results.warnings.push(`${highMemoryProcesses.length} processo(s) com alto uso de memória`);
          this.results.recommendations.push('Considere ajustar max_memory_restart no ecosystem.config.cjs');
        }

        if (highRestartProcesses.length > 0) {
          check.status = 'warn';
          this.results.warnings.push(`${highRestartProcesses.length} processo(s) com muitos restarts`);
          this.results.recommendations.push('Verifique logs de erro para identificar causa dos restarts');
        }
      }

      this.results.checks.push(check);
    } catch (error) {
      this.results.checks.push({
        name: 'PM2 Processes',
        status: 'fail',
        details: [`Erro: ${error.message}`]
      });
      this.results.errors.push('Falha ao verificar processos PM2');
    }
  }

  /**
   * Verificar recursos do sistema
   */
  async checkSystemResources() {
    const check = {
      name: 'System Resources',
      status: 'pass',
      details: []
    };

    // Memória
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMemPercent = ((totalMem - freeMem) / totalMem) * 100;
    
    check.details.push(`Uso de memória: ${usedMemPercent.toFixed(1)}%`);
    
    if (usedMemPercent > 90) {
      check.status = 'fail';
      this.results.errors.push('Uso crítico de memória (>90%)');
      this.results.recommendations.push('Reinicie processos ou adicione mais RAM');
    } else if (usedMemPercent > 85) {
      check.status = 'warn';
      this.results.warnings.push('Alto uso de memória (>85%)');
    }

    // Load Average
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    const loadPercent = (loadAvg[0] / cpuCount) * 100;
    
    check.details.push(`Load average: ${loadAvg[0].toFixed(2)} (${loadPercent.toFixed(1)}%)`);
    
    if (loadPercent > 100) {
      check.status = 'warn';
      this.results.warnings.push('Load average alto');
      this.results.recommendations.push('Sistema pode estar sobrecarregado');
    }

    // Uptime
    const uptime = os.uptime();
    const uptimeHours = uptime / 3600;
    check.details.push(`Uptime: ${uptimeHours.toFixed(1)} horas`);

    this.results.checks.push(check);
  }

  /**
   * Verificar arquivos de log
   */
  async checkLogFiles() {
    const check = {
      name: 'Log Files',
      status: 'pass',
      details: []
    };

    const logsDir = path.join(process.cwd(), 'logs');
    
    if (!fs.existsSync(logsDir)) {
      check.status = 'warn';
      this.results.warnings.push('Diretório de logs não encontrado');
      this.results.recommendations.push('Crie o diretório logs/ na raiz do projeto');
      check.details.push('❌ Diretório logs/ não existe');
    } else {
      const logFiles = fs.readdirSync(logsDir);
      check.details.push(`Arquivos de log encontrados: ${logFiles.length}`);
      
      // Verificar tamanho dos logs
      let totalLogSize = 0;
      const largeFiles = [];
      
      logFiles.forEach(file => {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        totalLogSize += stats.size;
        
        if (stats.size > 50 * 1024 * 1024) { // 50MB
          largeFiles.push({ file, size: stats.size });
        }
      });
      
      check.details.push(`Tamanho total dos logs: ${(totalLogSize / 1024 / 1024).toFixed(1)} MB`);
      
      if (largeFiles.length > 0) {
        check.status = 'warn';
        this.results.warnings.push(`${largeFiles.length} arquivo(s) de log muito grandes`);
        this.results.recommendations.push('Execute: npm run flush-logs ou configure rotação');
      }
      
      if (totalLogSize > 500 * 1024 * 1024) { // 500MB
        check.status = 'warn';
        this.results.warnings.push('Logs ocupando muito espaço em disco');
      }
    }

    this.results.checks.push(check);
  }

  /**
   * Verificar espaço em disco
   */
  async checkDiskSpace() {
    const check = {
      name: 'Disk Space',
      status: 'pass',
      details: []
    };

    try {
      const df = execSync('df -h .', { encoding: 'utf8' });
      const lines = df.split('\n');
      if (lines.length > 1) {
        const diskInfo = lines[1].split(/\s+/);
        const usedPercent = parseInt(diskInfo[4]);
        
        check.details.push(`Uso do disco: ${usedPercent}%`);
        check.details.push(`Espaço disponível: ${diskInfo[3]}`);
        
        if (usedPercent > 90) {
          check.status = 'fail';
          this.results.errors.push('Espaço em disco crítico (>90%)');
          this.results.recommendations.push('Libere espaço em disco urgentemente');
        } else if (usedPercent > 80) {
          check.status = 'warn';
          this.results.warnings.push('Pouco espaço em disco (>80%)');
          this.results.recommendations.push('Considere limpar logs antigos');
        }
      }
    } catch (error) {
      check.status = 'warn';
      check.details.push('Não foi possível verificar espaço em disco');
    }

    this.results.checks.push(check);
  }

  /**
   * Verificar portas de rede
   */
  async checkNetworkPorts() {
    const check = {
      name: 'Network Ports',
      status: 'pass',
      details: []
    };

    const portsToCheck = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008];
    const busyPorts = [];

    for (const port of portsToCheck) {
      try {
        execSync(`lsof -i :${port}`, { encoding: 'utf8', stdio: 'pipe' });
        busyPorts.push(port);
      } catch (error) {
        // Porta livre
      }
    }

    check.details.push(`Portas em uso: ${busyPorts.join(', ')}`);
    check.details.push(`Portas livres: ${portsToCheck.filter(p => !busyPorts.includes(p)).join(', ')}`);

    if (busyPorts.length < 2) {
      check.status = 'warn';
      this.results.warnings.push('Poucas portas em uso - sistema pode não estar rodando');
    }

    this.results.checks.push(check);
  }

  /**
   * Verificar dependências
   */
  async checkDependencies() {
    const check = {
      name: 'Dependencies',
      status: 'pass',
      details: []
    };

    try {
      // Verificar se node_modules existe
      if (!fs.existsSync('node_modules')) {
        check.status = 'fail';
        this.results.errors.push('node_modules não encontrado');
        this.results.recommendations.push('Execute: npm install');
      } else {
        check.details.push('✅ node_modules encontrado');
      }

      // Verificar se dist existe
      if (!fs.existsSync('dist')) {
        check.status = 'warn';
        this.results.warnings.push('Projeto não compilado');
        this.results.recommendations.push('Execute: npm run build');
      } else {
        check.details.push('✅ Projeto compilado (dist/ existe)');
      }

      // Verificar package.json
      if (fs.existsSync('package.json')) {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        check.details.push(`Projeto: ${pkg.name} v${pkg.version}`);
      }

    } catch (error) {
      check.status = 'warn';
      check.details.push(`Erro ao verificar dependências: ${error.message}`);
    }

    this.results.checks.push(check);
  }

  /**
   * Gerar relatório
   */
  generateReport() {
    // Determinar status geral
    const hasErrors = this.results.errors.length > 0;
    const hasWarnings = this.results.warnings.length > 0;
    
    if (hasErrors) {
      this.results.overall = 'unhealthy';
    } else if (hasWarnings) {
      this.results.overall = 'degraded';
    }

    // Exibir relatório
    console.log('\n' + '='.repeat(80));
    console.log('📋 RELATÓRIO DE HEALTH CHECK');
    console.log('='.repeat(80));
    
    const statusIcon = {
      'healthy': '✅',
      'degraded': '⚠️',
      'unhealthy': '❌'
    };
    
    console.log(`\n${statusIcon[this.results.overall]} Status Geral: ${this.results.overall.toUpperCase()}`);
    console.log(`🕐 Timestamp: ${this.results.timestamp}`);
    
    // Resumo
    console.log('\n📊 RESUMO:');
    console.log(`   Checks executados: ${this.results.checks.length}`);
    console.log(`   Erros: ${this.results.errors.length}`);
    console.log(`   Warnings: ${this.results.warnings.length}`);
    
    // Detalhes dos checks
    console.log('\n🔍 DETALHES DOS CHECKS:');
    this.results.checks.forEach(check => {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
      console.log(`\n${icon} ${check.name}`);
      check.details.forEach(detail => {
        console.log(`   ${detail}`);
      });
    });
    
    // Erros
    if (this.results.errors.length > 0) {
      console.log('\n❌ ERROS CRÍTICOS:');
      this.results.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
    }
    
    // Warnings
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.results.warnings.forEach(warning => {
        console.log(`   • ${warning}`);
      });
    }
    
    // Recomendações
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 RECOMENDAÇÕES:');
      this.results.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
  }

  /**
   * Salvar relatório em arquivo
   */
  saveReport() {
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `health-check-${timestamp}.json`;
    const filepath = path.join(reportsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Relatório salvo em: ${filepath}`);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new HealthChecker();
  checker.runAllChecks().catch(console.error);
}

export default HealthChecker;