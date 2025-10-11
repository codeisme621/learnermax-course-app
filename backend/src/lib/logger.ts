import { Logger } from '@aws-lambda-powertools/logger';

export const createLogger = (serviceName: string): Logger => {
  return new Logger({
    serviceName,
    logLevel: (process.env.LOG_LEVEL as any) || 'INFO',
  });
};
