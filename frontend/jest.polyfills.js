/**
 * Jest polyfills for MSW v2 + Next.js + Jest + jsdom
 *
 * MSW v2 requires certain globals that aren't available in jsdom environment.
 * These HAVE to be require()'s and in this order.
 *
 * Sources:
 * - https://mswjs.io/docs/migrations/1.x-to-2.x/#requestresponsetextencoder-is-not-defined-jest
 * - https://github.com/mswjs/msw/discussions/1934
 */

const { TextDecoder, TextEncoder } = require('node:util');
const { clearImmediate } = require('node:timers');
const { ReadableStream, TransformStream, WritableStream } = require('node:stream/web');
const { performance, PerformanceObserver } = require('node:perf_hooks');
const { Blob, File } = require('node:buffer');
const { MessageChannel, MessagePort } = require('node:worker_threads');

// MSW v2 requires BroadcastChannel for cleanup (jsdom doesn't provide this)
// Use a simple no-op implementation instead of worker_threads for Jest stability
if (!globalThis.BroadcastChannel) {
  class BroadcastChannel {
    constructor() {}
    postMessage() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  }

  Object.defineProperty(globalThis, 'BroadcastChannel', {
    value: BroadcastChannel,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

// Define all globals BEFORE requiring undici (undici checks for MessagePort)
// Use writable: true and configurable: true for properties that jest.useFakeTimers needs to override
Object.defineProperties(globalThis, {
  TextDecoder: { value: TextDecoder },
  TextEncoder: { value: TextEncoder },
  ReadableStream: { value: ReadableStream },
  TransformStream: { value: TransformStream },
  WritableStream: { value: WritableStream },
  clearImmediate: { value: clearImmediate },
  performance: { value: performance, writable: true, configurable: true },
  PerformanceObserver: { value: PerformanceObserver },
  Blob: { value: Blob },
  File: { value: File },
  MessageChannel: { value: MessageChannel },
  MessagePort: { value: MessagePort },
});

// NOW require undici after MessagePort is defined
const { fetch, Headers, FormData, Request, Response } = require('undici');

Object.defineProperties(globalThis, {
  fetch: { value: fetch, writable: true, configurable: true },
  Headers: { value: Headers, configurable: true },
  FormData: { value: FormData, configurable: true },
  Request: { value: Request, configurable: true },
  Response: { value: Response, configurable: true },
});

// SWR checks document.visibilityState - must be defined before SWR imports
if (typeof document !== 'undefined') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => 'visible',
  });
}
