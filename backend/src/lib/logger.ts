import { Logger } from '@aws-lambda-powertools/logger';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export const createLogger = (serviceName: string): Logger => {
  return new Logger({
    serviceName,
    logLevel: (process.env.LOG_LEVEL as LogLevel) || 'INFO',
  });
};
