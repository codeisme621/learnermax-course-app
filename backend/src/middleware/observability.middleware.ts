import { Request, Response, NextFunction } from 'express';
import { createMetrics, MetricUnit } from '../lib/metrics.js';
import { createLogger } from '../lib/logger.js';

const metrics = createMetrics('LearnerMax/Backend', 'ExpressApi');
const logger = createLogger('ObservabilityMiddleware');

export function observabilityMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = process.hrtime.bigint();
  const originalEnd = res.end;

  res.end = function (...args: Parameters<typeof originalEnd>) {
    const latencyMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
    const statusCode = res.statusCode;
    const route = req.route?.path || req.path;
    const method = req.method;

    // Emit latency metric
    metrics.addMetric('ApiLatency', MetricUnit.Milliseconds, latencyMs);

    // Emit error metrics
    if (statusCode >= 400 && statusCode < 500) {
      metrics.addMetric('Http4xxCount', MetricUnit.Count, 1);
      logger.warn('4xx response', { route, method, statusCode, latencyMs });
    } else if (statusCode >= 500) {
      metrics.addMetric('Http5xxCount', MetricUnit.Count, 1);
      logger.error('5xx response', { route, method, statusCode, latencyMs });
    }

    metrics.publishStoredMetrics();
    return originalEnd.apply(res, args);
  } as typeof originalEnd;

  next();
}
