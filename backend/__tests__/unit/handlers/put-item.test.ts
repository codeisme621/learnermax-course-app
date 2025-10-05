// Import putItemHandler function from put-item.ts
import { putItemHandler } from '../../../src/handlers/put-item';
// Import dynamodb from aws-sdk
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

// This includes all tests for putItemHandler()
describe('Test putItemHandler', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.reset();
  });

  it('should add item to database', async () => {
    const item = { id: 'id1', name: 'Test Item' };

    // Return the specified value whenever the spied put function is called
    ddbMock.on(PutCommand).resolves({});

    const event = {
      httpMethod: 'POST',
      path: '/',
      body: JSON.stringify(item)
    };

    // Invoke putItemHandler()
    const result = await putItemHandler(event);

    const expectedResult = {
      statusCode: 200,
      body: JSON.stringify(item)
    };

    // Compare the result with the expected result
    expect(result).toEqual(expectedResult);
  });
});
