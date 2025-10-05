// Import getByIdHandler function from get-by-id.ts
import { getByIdHandler } from '../../../src/handlers/get-by-id';
// Import dynamodb from aws-sdk
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

// This includes all tests for getByIdHandler()
describe('Test getByIdHandler', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.reset();
  });

  it('should return item by id', async () => {
    const item = { id: 'id1', name: 'Test Item' };

    // Return the specified value whenever the spied get function is called
    ddbMock.on(GetCommand).resolves({
      Item: item
    });

    const event = {
      httpMethod: 'GET',
      path: '/id1',
      pathParameters: { id: 'id1' }
    };

    // Invoke getByIdHandler()
    const result = await getByIdHandler(event);

    const expectedResult = {
      statusCode: 200,
      body: JSON.stringify(item)
    };

    // Compare the result with the expected result
    expect(result).toEqual(expectedResult);
  });
});
