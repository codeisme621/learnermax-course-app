import express from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// DynamoDB setup
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.COURSES_TABLE_NAME || 'courses';

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend API is running' });
});

// Get all courses
app.get('/api/courses', async (req, res) => {
  try {
    const command = new ScanCommand({
      TableName: tableName,
    });
    const response = await docClient.send(command);
    res.json({ courses: response.Items || [] });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get a single course
app.get('/api/courses/:id', async (req, res) => {
  try {
    const command = new GetCommand({
      TableName: tableName,
      Key: { id: req.params.id },
    });
    const response = await docClient.send(command);
    if (response.Item) {
      res.json(response.Item);
    } else {
      res.status(404).json({ error: 'Course not found' });
    }
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Create a course
app.post('/api/courses', async (req, res) => {
  try {
    const course = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    const command = new PutCommand({
      TableName: tableName,
      Item: course,
    });
    await docClient.send(command);
    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Delete a course
app.delete('/api/courses/:id', async (req, res) => {
  try {
    const command = new DeleteCommand({
      TableName: tableName,
      Key: { id: req.params.id },
    });
    await docClient.send(command);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
  