import { Logger } from '@aws-lambda-powertools/logger';
import type { LogLevel } from '@aws-lambda-powertools/logger/types';

export const createLogger = (serviceName: string) => {
  return new Logger({
    serviceName,
    logLevel: (process.env.LOG_LEVEL as LogLevel) || 'INFO',
  });
};
