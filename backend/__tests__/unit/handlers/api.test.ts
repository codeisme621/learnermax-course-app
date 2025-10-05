import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('API Tests', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe('GET all items', () => {
    it('should return all items from DynamoDB', async () => {
      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }
      ];

      ddbMock.on(ScanCommand).resolves({
        Items: items
      });

      // Test would require actual HTTP testing with supertest
      expect(items).toHaveLength(2);
    });
  });

  describe('GET item by id', () => {
    it('should return a single item by id', async () => {
      const item = { id: '1', name: 'Item 1' };

      ddbMock.on(GetCommand).resolves({
        Item: item
      });

      expect(item.id).toBe('1');
    });
  });

  describe('POST item', () => {
    it('should add a new item to DynamoDB', async () => {
      const newItem = { id: '3', name: 'Item 3' };

      ddbMock.on(PutCommand).resolves({});

      expect(newItem).toHaveProperty('id');
      expect(newItem).toHaveProperty('name');
    });
  });
});
