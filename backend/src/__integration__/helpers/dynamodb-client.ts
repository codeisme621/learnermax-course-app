import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * Create DynamoDB client for integration tests
 * Uses AWS profile from environment (default credential chain)
 * Points to preview environment table
 */
export function createIntegrationTestClient(): DynamoDBDocumentClient {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    // Uses default credential chain:
    // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
    // 2. AWS_PROFILE from environment
    // 3. EC2 instance metadata (if running on EC2)
    // 4. Default credentials file (~/.aws/credentials)
  });

  return DynamoDBDocumentClient.from(client);
}
