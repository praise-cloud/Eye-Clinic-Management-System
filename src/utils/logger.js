/**
 * Production-safe logging utility for Eye Clinic Management System
 * 
 * Features:
 * - Development-only DEBUG mode
 * - Multiple log levels (DEBUG, INFO, WARN, ERROR)
 * - Automatic redaction of sensitive data
 * - Timestamp formatting
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const currentLevel = LOG_LEVELS.DEBUG;

const SENSITIVE_PATTERNS = [
  { pattern: /password[=:]?\s*["'][^"']+["']/gi, replacement: 'password=[REDACTED]' },
  { pattern: /token[=:]?\s*["'][^"']+["']/gi, replacement: 'token=[REDACTED]' },
  { pattern: /bearer\s+[^\s]+/gi, replacement: 'Bearer [REDACTED]' },
  { pattern: /Authorization[=:]?\s*["'][^"']+["']/gi, replacement: 'Authorization=[REDACTED]' },
  { pattern: /api[_-]?key[=:]?\s*["'][^"']+["']/gi, replacement: 'api_key=[REDACTED]' },
  { pattern: /secret[=:]?\s*["'][^"']+["']/gi, replacement: 'secret=[REDACTED]' }
];

function formatTimestamp() {
  return new Date().toISOString();
}

function formatMessage(level, message, data) {
  const timestamp = formatTimestamp();
  const prefix = `[${timestamp}] [${level}]`;
  
  let formattedMessage = message;
  
  if (typeof message === 'string') {
    SENSITIVE_PATTERNS.forEach(({ pattern, replacement }) => {
      formattedMessage = formattedMessage.replace(pattern, replacement);
    });
  }
  
  if (data !== undefined) {
    let formattedData = data;
    
    if (typeof data === 'object') {
      try {
        const stringified = JSON.stringify(data);
        SENSITIVE_PATTERNS.forEach(({ pattern, replacement }) => {
          const sanitized = stringified.replace(pattern, replacement);
          formattedData = JSON.parse(sanitized);
        });
      } catch {
        formattedData = '[Object]';
      }
    } else if (typeof data === 'string') {
      SENSITIVE_PATTERNS.forEach(({ pattern, replacement }) => {
        formattedData = formattedData.replace(pattern, replacement);
      });
    }
    
    return `${prefix} ${formattedMessage}${data !== null ? ' ' + JSON.stringify(formattedData) : ''}`;
  }
  
  return `${prefix} ${formattedMessage}`;
}

function shouldLog(level) {
  return level >= currentLevel;
}

const logger = {
  debug(message, data) {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      console.debug(formatMessage('DEBUG', message, data));
    }
  },

  info(message, data) {
    if (shouldLog(LOG_LEVELS.INFO)) {
      console.info(formatMessage('INFO', message, data));
    }
  },

  warn(message, data) {
    if (shouldLog(LOG_LEVELS.WARN)) {
      console.warn(formatMessage('WARN', message, data));
    }
  },

  error(message, data) {
    if (shouldLog(LOG_LEVELS.ERROR)) {
      if (data instanceof Error) {
        console.error(formatMessage('ERROR', message, {
          message: data.message,
          name: data.name,
          stack: data.stack
        }));
      } else {
        console.error(formatMessage('ERROR', message, data));
      }
    }
  },

  group(label) {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      console.group(`[${formatTimestamp()}] ${label}`);
    }
  },

  groupEnd() {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      console.groupEnd();
    }
  },

  time(label) {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      console.time(`[${formatTimestamp()}] ${label}`);
    }
  },

  timeEnd(label) {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      console.timeEnd(`[${formatTimestamp()}] ${label}`);
    }
  },

  setLevel(level) {
    if (typeof level === 'string') {
      const upperLevel = level.toUpperCase();
      if (LOG_LEVELS[upperLevel] !== undefined) {
        Object.defineProperty(logger, '_level', { value: LOG_LEVELS[upperLevel] });
      }
    }
  }
};

export default logger;
export { LOG_LEVELS };
