import { config } from 'dotenv';
import { resolve } from 'path';
import { validateTestEnvironment } from './helpers/env-guard.js';

/**
 * Integration Test Setup
 * 1. Loads .env.integration file
 * 2. Validates environment safety before running tests
 */

console.log('\n📦 Loading integration test environment variables...\n');

// Load .env.integration file
const envPath = resolve(process.cwd(), '.env.integration');
const result = config({ path: envPath });

if (result.error) {
  console.error('❌ Failed to load .env.integration file');
  console.error(`   Expected path: ${envPath}`);
  console.error(`   Error: ${result.error.message}`);
  throw new Error('.env.integration file not found. Please create it from .env.integration.example');
}

console.log(`✓ Loaded environment variables from: ${envPath}\n`);
console.log('🔍 Validating integration test environment...\n');

// CRITICAL: Validate environment before running any tests
validateTestEnvironment();

console.log('');
