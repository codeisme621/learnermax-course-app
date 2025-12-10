#!/bin/bash
# Enable ADOT auto-instrumentation
export NODE_OPTIONS="--require @aws/aws-distro-opentelemetry-node-autoinstrumentation/register"
export OTEL_SERVICE_NAME=ExpressApiFunction
exec node dist/src/app.js
