// const winston = require('winston');
const { createLogger, format, transports } = require('winston');

const {
  combine, timestamp, label, printf,
} = format;

const myFormat = printf(({
  level, message, label, timestamp,
}) => `${timestamp} ${label} ${level}: ${message}`);

const logger = createLogger({
  level: 'info',
  // format: winston.format.json(),
  format: combine(
    label({ label: `[Trefla]` }),
    timestamp(),
    myFormat,
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    new transports.Console(),
    // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'combined.log' }),
  ],
})

logger.info('[Logger] get started!', { service: 'INIT' });

module.exports = logger;
