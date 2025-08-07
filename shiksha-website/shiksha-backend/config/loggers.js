const winston = require('winston');
require('dotenv').config();

const logLevel = process.env.LOG_LEVEL || 'warn';

const customFormat = winston.format.printf(({ level, message, timestamp, stack }) => {
  const stackLines = stack ? stack.split('\n') : [];
  const fileLineInfo = stackLines[1] ? stackLines[1].trim() : '';
  return `${timestamp} [${level}] ${fileLineInfo}: ${message}`;
});

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      ),
    }),
  ],
});

module.exports = logger;
