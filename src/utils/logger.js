const { createLogger, format, transports } = require('winston');
const path = require('path');
const config = require('../config');

const { combine, timestamp, printf, colorize, json } = format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  let metaStr = '';
  if (Object.keys(meta).length > 0) {
    metaStr = ' ' + JSON.stringify(meta, null, 2);
  }
  return `${timestamp} [${level}]: ${message}${metaStr}`;
});

// Create logger instance
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports: [
    // Write all logs with level `error` and below to `error.log`
    new transports.File({ 
      filename: path.join('logs', 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs to `combined.log`
    new transports.File({ 
      filename: path.join('logs', 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  ],
  exitOnError: false
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      consoleFormat
    )
  }));
}

// Create a stream for morgan (HTTP request logging)
logger.stream = {
  write: function(message) {
    logger.info(message.trim());
  },
};

// Handle uncaught exceptions
logger.exceptions.handle(
  new transports.File({ filename: path.join('logs', 'exceptions.log') })
);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', { reason });
});

module.exports = logger;
