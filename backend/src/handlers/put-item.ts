// Create clients and set shared const values outside of the handler.

// Create a DocumentClient that represents the query to add an item
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

// Get the DynamoDB table name from environment variables
const tableName = process.env.SAMPLE_TABLE;

interface APIGatewayEvent {
  httpMethod: string;
  path: string;
  pathParameters?: Record<string, string>;
  body?: string;
}

interface APIGatewayResponse {
  statusCode: number;
  body: string;
}

interface ItemBody {
  id: string;
  name: string;
}

/**
 * A simple example includes a HTTP post method to add one item to a DynamoDB table.
 */
export const putItemHandler = async (event: APIGatewayEvent): Promise<APIGatewayResponse> => {
  if (event.httpMethod !== 'POST') {
    throw new Error(`postMethod only accepts POST method, you tried: ${event.httpMethod} method.`);
  }
  // All log statements are written to CloudWatch
  console.info('received:', event);

  if (!event.body) {
    throw new Error('Missing request body');
  }

  // Get id and name from the body of the request
  const body: ItemBody = JSON.parse(event.body);
  const { id, name } = body;

  // Creates a new item, or replaces an old item with a new item
  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#put-property
  const params = {
    TableName: tableName,
    Item: { id, name }
  };

  try {
    const data = await ddbDocClient.send(new PutCommand(params));
    console.log('Success - item added or updated', data);

    const response = {
      statusCode: 200,
      body: JSON.stringify(body)
    };

    // All log statements are written to CloudWatch
    console.info(`response from: ${event.path} statusCode: ${response.statusCode} body: ${response.body}`);
    return response;
  } catch (err) {
    console.error('Error', err);
    throw err;
  }
};
