import winston from 'winston';
import path from 'path';
import DailyRotateFile from 'winston-daily-rotate-file';

// Structured JSON logging with rotation
const logDir = path.join(process.cwd(), 'logs');

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
  }),
];

// Add file rotation in production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, '%DATE%-combined.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxDays: 30,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
    }),
    new DailyRotateFile({
      filename: path.join(logDir, '%DATE%-errors.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxDays: 30,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
    }),
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'aurora-pipeline' },
  transports,
});

// Add metadata helpers
export function logInfo(message: string, meta?: Record<string, any>) {
  logger.info(message, { ...meta, level: 'info' });
}

export function logError(message: string, error?: Error, meta?: Record<string, any>) {
  logger.error(message, { 
    ...meta, 
    error: error?.message, 
    stack: error?.stack, 
    level: 'error' 
  });
}

export function logWarn(message: string, meta?: Record<string, any>) {
  logger.warn(message, { ...meta, level: 'warn' });
}

export function logDebug(message: string, meta?: Record<string, any>) {
  logger.debug(message, { ...meta, level: 'debug' });
}
