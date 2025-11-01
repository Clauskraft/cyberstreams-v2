import pino from 'pino';

/**
 * Centralized logger configuration
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  // Removed pino-pretty transport - install separately with: npm install -D pino-pretty
  // transport: isDevelopment ? {
  //   target: 'pino-pretty',
  //   options: {
  //     colorize: true,
  //     translateTime: 'HH:MM:ss',
  //     ignore: 'pid,hostname',
  //     singleLine: false
  //   }
  // } : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent']
      }
    }),
    res: (res) => ({
      statusCode: res.statusCode
    }),
    err: pino.stdSerializers.err
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'apiKey',
      'password',
      'token',
      'secret'
    ],
    remove: true
  }
});

export default logger;
