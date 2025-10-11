import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

export const createMetrics = (namespace: string, serviceName: string): Metrics => {
  return new Metrics({
    namespace,
    serviceName,
  });
};

export { MetricUnit };
