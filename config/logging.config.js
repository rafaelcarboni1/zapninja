/**
 * Configuração de Logs Estruturados para WhatsApp Multi-Session
 * Sistema de logging avançado com suporte a diferentes níveis e formatos
 */

const path = require('path');
const fs = require('fs');

// Garantir que o diretório de logs existe
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Configuração de níveis de log
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  HTTP: 3,
  VERBOSE: 4,
  DEBUG: 5,
  SILLY: 6
};

/**
 * Configuração de cores para console
 */
const LOG_COLORS = {
  ERROR: '\x1b[31m',   // Vermelho
  WARN: '\x1b[33m',    // Amarelo
  INFO: '\x1b[36m',    // Ciano
  HTTP: '\x1b[35m',    // Magenta
  VERBOSE: '\x1b[37m', // Branco
  DEBUG: '\x1b[32m',   // Verde
  SILLY: '\x1b[90m',   // Cinza
  RESET: '\x1b[0m'     // Reset
};

/**
 * Formatter para logs estruturados em JSON
 */
function createJSONFormatter(serviceName) {
  return (info) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: info.level.toUpperCase(),
      service: serviceName,
      message: info.message,
      ...(info.meta && { meta: info.meta }),
      ...(info.error && { error: {
        name: info.error.name,
        message: info.error.message,
        stack: info.error.stack
      }}),
      ...(info.sessionId && { sessionId: info.sessionId }),
      ...(info.userId && { userId: info.userId }),
      ...(info.requestId && { requestId: info.requestId })
    };
    
    return JSON.stringify(logEntry);
  };
}

/**
 * Formatter para console com cores
 */
function createConsoleFormatter(serviceName) {
  return (info) => {
    const color = LOG_COLORS[info.level.toUpperCase()] || LOG_COLORS.INFO;
    const timestamp = new Date().toISOString();
    const level = info.level.toUpperCase().padEnd(7);
    const service = serviceName.padEnd(12);
    
    let message = `${color}[${timestamp}] ${level} [${service}]${LOG_COLORS.RESET} ${info.message}`;
    
    if (info.meta) {
      message += ` ${JSON.stringify(info.meta)}`;
    }
    
    if (info.error) {
      message += `\n${LOG_COLORS.ERROR}Error: ${info.error.message}${LOG_COLORS.RESET}`;
      if (info.error.stack) {
        message += `\n${info.error.stack}`;
      }
    }
    
    return message;
  };
}

/**
 * Configuração base para diferentes serviços
 */
function createLogConfig(serviceName, options = {}) {
  const {
    level = process.env.LOG_LEVEL || 'info',
    enableConsole = process.env.NODE_ENV !== 'production',
    enableFile = true,
    enableJSON = true
  } = options;

  const config = {
    level,
    format: {
      json: createJSONFormatter(serviceName),
      console: createConsoleFormatter(serviceName)
    },
    transports: []
  };

  // Console transport (desenvolvimento)
  if (enableConsole) {
    config.transports.push({
      type: 'console',
      level,
      format: config.format.console
    });
  }

  // File transports
  if (enableFile) {
    // Log combinado
    config.transports.push({
      type: 'file',
      filename: path.join(logsDir, `${serviceName}-combined.log`),
      level,
      format: enableJSON ? config.format.json : config.format.console,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    });

    // Log de erros
    config.transports.push({
      type: 'file',
      filename: path.join(logsDir, `${serviceName}-error.log`),
      level: 'error',
      format: enableJSON ? config.format.json : config.format.console,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    });

    // Log de performance (HTTP requests)
    config.transports.push({
      type: 'file',
      filename: path.join(logsDir, `${serviceName}-performance.log`),
      level: 'http',
      format: config.format.json,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3
    });
  }

  return config;
}

/**
 * Configurações específicas por serviço
 */
const SERVICE_CONFIGS = {
  master: createLogConfig('master', {
    level: 'info',
    enableConsole: true,
    enableJSON: true
  }),
  
  orchestrator: createLogConfig('orchestrator', {
    level: 'info',
    enableConsole: false, // Evitar spam no console em cluster
    enableJSON: true
  }),
  
  session: createLogConfig('session', {
    level: 'info',
    enableConsole: false,
    enableJSON: true
  }),
  
  whatsapp: createLogConfig('whatsapp', {
    level: 'warn', // Apenas warnings e erros do WhatsApp
    enableConsole: false,
    enableJSON: true
  }),
  
  ai: createLogConfig('ai', {
    level: 'info',
    enableConsole: false,
    enableJSON: true
  }),
  
  database: createLogConfig('database', {
    level: 'warn',
    enableConsole: false,
    enableJSON: true
  })
};

/**
 * Middleware para adicionar contexto aos logs
 */
function createLogContext(sessionId, userId, requestId) {
  return {
    sessionId,
    userId,
    requestId: requestId || generateRequestId()
  };
}

/**
 * Gerar ID único para requisições
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Configuração de monitoramento de performance
 */
const PERFORMANCE_CONFIG = {
  // Métricas a serem coletadas
  metrics: {
    responseTime: true,
    memoryUsage: true,
    cpuUsage: true,
    activeConnections: true,
    messageCount: true,
    errorRate: true
  },
  
  // Intervalos de coleta
  intervals: {
    metrics: 30000,      // 30 segundos
    healthCheck: 60000,  // 1 minuto
    cleanup: 300000      // 5 minutos
  },
  
  // Thresholds para alertas
  thresholds: {
    memoryUsage: 0.85,   // 85% da memória
    cpuUsage: 0.80,      // 80% do CPU
    responseTime: 5000,  // 5 segundos
    errorRate: 0.05      // 5% de erro
  }
};

module.exports = {
  LOG_LEVELS,
  LOG_COLORS,
  SERVICE_CONFIGS,
  PERFORMANCE_CONFIG,
  createLogConfig,
  createLogContext,
  createJSONFormatter,
  createConsoleFormatter,
  generateRequestId
};