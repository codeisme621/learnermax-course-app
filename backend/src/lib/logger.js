import { Logger } from '@aws-lambda-powertools/logger';
export const createLogger = (serviceName) => {
    return new Logger({
        serviceName,
        logLevel: process.env.LOG_LEVEL || 'INFO',
    });
};
