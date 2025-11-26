import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
export const createMetrics = (namespace, serviceName) => {
    return new Metrics({
        namespace,
        serviceName,
    });
};
export { MetricUnit };
