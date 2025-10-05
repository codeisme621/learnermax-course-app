import express, { Request, Response, Express } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

// Initialize Express app
const app: Express = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

// Get the DynamoDB table name from environment variables
const tableName = process.env.SAMPLE_TABLE;

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

// GET all items
app.get('/', async (req: Request, res: Response) => {
  try {
    console.info('GET / - Fetching all items');

    const params = {
      TableName: tableName
    };

    const data = await ddbDocClient.send(new ScanCommand(params));
    const items = data.Items;

    console.info(`Response: ${items?.length || 0} items found`);
    res.status(200).json(items);
  } catch (err) {
    console.error('Error fetching all items:', err);
    res.status(500).json({ error: 'Could not fetch items' });
  }
});

// GET item by ID
app.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.info(`GET /${id} - Fetching item by id`);

    const params = {
      TableName: tableName,
      Key: { id }
    };

    const data = await ddbDocClient.send(new GetCommand(params));
    const item = data.Item;

    if (!item) {
      console.info(`Item with id ${id} not found`);
      return res.status(404).json({ error: 'Item not found' });
    }

    console.info(`Response: Item found - ${JSON.stringify(item)}`);
    res.status(200).json(item);
  } catch (err) {
    console.error('Error fetching item by id:', err);
    res.status(500).json({ error: 'Could not fetch item' });
  }
});

// POST new item
app.post('/', async (req: Request, res: Response) => {
  try {
    const { id, name } = req.body;
    console.info(`POST / - Adding item: ${JSON.stringify(req.body)}`);

    if (!id || !name) {
      return res.status(400).json({ error: 'Missing required fields: id and name' });
    }

    const params = {
      TableName: tableName,
      Item: { id, name }
    };

    await ddbDocClient.send(new PutCommand(params));
    console.log('Success - item added or updated');

    res.status(200).json({ id, name });
  } catch (err) {
    console.error('Error adding item:', err);
    res.status(500).json({ error: 'Could not add item' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`DynamoDB table: ${tableName}`);
});

export default app;
