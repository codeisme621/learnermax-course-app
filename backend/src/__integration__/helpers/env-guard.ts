/**
 * Environment Safety Guard
 * Ensures integration tests ONLY run against preview/test environments
 * Prevents accidental production table access
 */
export function validateTestEnvironment(): void {
  const tableName = process.env.EDUCATION_TABLE_NAME;

  if (!tableName) {
    throw new Error(
      'EDUCATION_TABLE_NAME environment variable is not set for integration tests'
    );
  }

  // CRITICAL: Block production table access
  const isTestEnvironment =
    tableName.toLowerCase().includes('preview') ||
    tableName.toLowerCase().includes('test') ||
    tableName.toLowerCase().includes('dev');

  if (!isTestEnvironment) {
    throw new Error(
      `❌ SAFETY CHECK FAILED: Integration tests must use preview/test/dev table.\n` +
        `Current table: ${tableName}\n` +
        `Please set EDUCATION_TABLE_NAME to a preview or test table name.`
    );
  }

  console.log(`✓ Integration test environment validated`);
  console.log(`  Table: ${tableName}`);
  console.log(`  Region: ${process.env.AWS_REGION || 'us-east-1 (default)'}`);
  console.log(`  Profile: ${process.env.AWS_PROFILE || 'default'}`);
}
