# learnermax-course-app
A fully open source Course application that is modern and hackable

## Monorepo Structure

This project is organized as a monorepo with three main directories:

### 📱 Frontend (`/frontend`)
- **Technology**: Next.js with TypeScript, Tailwind CSS, and ESLint
- **Deployment**: Vercel
- **Description**: A modern React-based frontend application built with Next.js App Router

#### Getting Started
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to see the application.

### ⚙️ Backend (`/backend`)
- **Technology**: AWS SAM (Serverless Application Model)
- **Architecture**: API Gateway + Lambda + DynamoDB
- **Lambda Runtime**: Node.js 20.x with Express.js
- **Web Adapter**: AWS Lambda Web Adapter for Express.js integration
- **Description**: A serverless backend API using Express.js running on AWS Lambda

#### Getting Started
```bash
cd backend/hello-world
npm install
cd ..
sam build
sam local start-api
```

The API will be available at `http://localhost:3000`

#### Deployment
```bash
sam deploy --guided
```

### 🧪 E2E Tests (`/e2e`)
- **Technology**: Playwright
- **Description**: End-to-end testing suite for the entire application

#### Getting Started
```bash
cd e2e
npm install
npx playwright install chromium
npm test
```

#### Run Tests with UI
```bash
npm run test:ui
```

## Project Setup

Each directory is independently managed with its own `package.json` and dependencies. To set up the entire project:

```bash
# Frontend
cd frontend && npm install

# Backend
cd ../backend/hello-world && npm install

# E2E Tests
cd ../../e2e && npm install && npx playwright install
```

## Development Workflow

1. Start the frontend development server:
   ```bash
   cd frontend && npm run dev
   ```

2. Start the backend API locally:
   ```bash
   cd backend && sam local start-api
   ```

3. Run end-to-end tests:
   ```bash
   cd e2e && npm test
   ```

## Architecture

- **Frontend**: Next.js application deployed to Vercel
- **Backend**: Serverless Express.js API on AWS Lambda with API Gateway
- **Database**: DynamoDB for data persistence
- **Testing**: Playwright for E2E tests

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get a specific course
- `POST /api/courses` - Create a new course
- `DELETE /api/courses/:id` - Delete a course
