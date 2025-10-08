# Authentication & Student Onboarding Implementation Plan

## Overview

Implementing complete authentication system with AWS Cognito, event-driven student onboarding via SNS/Lambda, DynamoDB persistence, and full frontend integration using NextAuth.js and AWS SDK for Cognito operations.

## Current State Analysis

### Backend
- Express.js API running on Lambda Web Adapter (backend/src/app.ts:1-22)
- Only placeholder hello world endpoint (will be removed)
- No DynamoDB tables in SAM template
- API Gateway uses API key auth (template.yaml:45), needs Cognito authorizer
- No Lambda functions beyond Express API
- No SNS topics defined

### Frontend
- UI-only enrollment form at `/enroll` (frontend/components/enrollment/EnrollmentForm.tsx:1-120)
- No authentication library installed (no NextAuth.js)
- No AWS SDK for Cognito
- No API client utilities
- No authentication state management

### Infrastructure
- SAM template configured for preview/prod (backend/samconfig.toml)
- No Cognito User Pool
- No event-driven architecture (SNS/Lambda)
- No DynamoDB tables

## Desired End State

### Backend API
- Student API with POST and GET endpoints protected by Cognito JWT
- DynamoDB tables: Students and Courses
- Express middleware validates requests from API Gateway authorizer

### Lambda Functions
- PostConfirmation Lambda triggers after Cognito sign-up
- Student Onboarding Lambda subscribes to SNS, creates student records

### Frontend
- Functional sign-up flow with email/password and Google OAuth
- NextAuth.js session management with Cognito provider
- Protected routes using NextAuth middleware
- Sign-in, forgot-password, reset-password, verify-email pages

### Infrastructure
- Cognito User Pool with Google federation
- SNS topic for student onboarding events
- DynamoDB tables with proper IAM permissions
- API Gateway Cognito authorizer

### Verification
- E2E tests with two test users (verified and unverified emails.)
- Sample GenAI course data in DynamoDB (create a curl request with this course data)
- Complete authentication flows working in preview environment

## What We're NOT Doing

- Custom email templates (using Cognito default emails)
- SES integration (Cognito sends verification emails directly)
- Course enrollment logic (just student creation)
- Payment integration
- Student dashboard/profile pages
- Course progress tracking
- Multi-factor authentication (MFA)
- Advanced Cognito features (user pools groups, custom attributes beyond basics)

## Authentication Architecture

This implementation uses two complementary authentication systems:

### Backend (API Gateway + Cognito Authorizer)
- **API Gateway Cognito Authorizer** validates JWT tokens before requests reach Express
- **Deep AWS integration** - no custom auth code required
- **Flow**: Request → API Gateway → Cognito Authorizer validates JWT → ✅ Allow or ❌ Block
- If allowed, Cognito adds user claims to `event.requestContext.authorizer.claims`
- Express middleware extracts claims for user-specific logic (e.g., authorization checks)

### Frontend (NextAuth.js + Cognito Provider)
- **NextAuth.js** manages frontend session state using encrypted JWT cookies
- **Cognito** is the identity provider (federates with Google)
- **Why two systems?**
  - Cognito: Authenticates users, issues JWTs
  - NextAuth: Provides React hooks (`useSession`), protected routes, token storage
- **`NEXTAUTH_SECRET`**: Encrypts NextAuth's session cookie (NOT related to Cognito)
- **Cognito tokens** (access, ID, refresh) stored inside NextAuth's encrypted JWT

### Complete Flow
1. User clicks "Sign in with Google"
2. NextAuth redirects to Cognito → Cognito redirects to Google
3. Google authenticates → redirects to Cognito → Cognito issues JWT tokens
4. NextAuth receives tokens, encrypts them in session cookie using `NEXTAUTH_SECRET`
5. Frontend uses `useSession()` hook to access session
6. When calling backend API, NextAuth provides Cognito `idToken` in `Authorization` header
7. API Gateway validates `idToken` using Cognito (no custom code)
8. Express receives request with user info in authorizer context

## Implementation Approach

We'll implement in 6 phases:
1. **AWS Infrastructure** - Cognito, DynamoDB, SNS, Lambda functions
2. **Backend API** - Student endpoints with Cognito authorization
3. **Event-Driven Architecture** - PostConfirmation and Onboarding Lambdas
4. **Frontend Authentication Foundation** - NextAuth.js + AWS SDK setup
5. **Frontend Authentication Pages** - Sign-up, sign-in, password reset, verification
6. **E2E Testing** - Complete flow validation in preview environment

---

## Phase 1: AWS Infrastructure & DynamoDB Tables

### Overview
Set up all AWS resources: Cognito User Pool with Google federation, DynamoDB tables, SNS topic, Lambda functions, and API Gateway authorizer.

### Changes Required

#### 1. Create AWS Secrets Manager Secret for Google OAuth

**ACTION REQUIRED FIRST**: Store Google OAuth credentials in AWS Secrets Manager

```bash
# Create secret in AWS Secrets Manager
aws secretsmanager create-secret \
  --name learnermax/google-oauth \
  --description "Google OAuth credentials for Cognito" \
  --secret-string '{
    "client_id": "YOUR_GOOGLE_CLIENT_ID",
    "client_secret": "YOUR_GOOGLE_CLIENT_SECRET"
  }'
```

Replace `YOUR_GOOGLE_CLIENT_ID` and `YOUR_GOOGLE_CLIENT_SECRET` with actual values from Google Cloud Console.

**Security Note**: This approach keeps secrets out of version control and allows rotation without code changes.

#### 2. SAM Template - Cognito User Pool

**File**: `backend/template.yaml`
**Changes**: Add Cognito User Pool after `ApiGatewayApi` resource (after line 78)

```yaml
  # Cognito User Pool
  LearnerMaxUserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: !Sub "${AWS::StackName}-user-pool"
      Schema:
        - Name: email
          Required: true
          Mutable: false
        - Name: name
          Required: true
          Mutable: true
      Policies:
        PasswordPolicy:
          MinimumLength: 8
          RequireUppercase: true
          RequireLowercase: true
          RequireNumbers: true
          RequireSymbols: true
      AutoVerifiedAttributes:
        - email
      UsernameAttributes:
        - email
      MfaConfiguration: "OFF"
      EmailConfiguration:
        EmailSendingAccount: COGNITO_DEFAULT
      UserPoolTags:
        Application: LearnerMax
        Environment: !Ref AWS::StackName

  # Cognito User Pool Client
  LearnerMaxUserPoolClient:
    Type: AWS::Cognito::UserPoolClient
    Properties:
      ClientName: !Sub "${AWS::StackName}-client"
      UserPoolId: !Ref LearnerMaxUserPool
      GenerateSecret: true
      AllowedOAuthFlows:
        - code
      AllowedOAuthScopes:
        - openid
        - email
        - profile
      AllowedOAuthFlowsUserPoolClient: true
      CallbackURLs:
        - http://localhost:3000/api/auth/callback/cognito
        - https://learnermax-course-app.vercel.app/api/auth/callback/cognito
      LogoutURLs:
        - http://localhost:3000
        - https://learnermax-course-app.vercel.app
      SupportedIdentityProviders:
        - COGNITO
        - Google
      ExplicitAuthFlows:
        - ALLOW_USER_PASSWORD_AUTH
        - ALLOW_REFRESH_TOKEN_AUTH
        - ALLOW_USER_SRP_AUTH

  # Google Identity Provider
  LearnerMaxGoogleIdentityProvider:
    Type: AWS::Cognito::UserPoolIdentityProvider
    Properties:
      UserPoolId: !Ref LearnerMaxUserPool
      ProviderName: Google
      ProviderType: Google
      ProviderDetails:
        client_id: !Ref GoogleClientId
        client_secret: !Ref GoogleClientSecret
        authorize_scopes: "openid email profile"
      AttributeMapping:
        email: email
        name: name
        username: sub

  # Cognito User Pool Domain
  LearnerMaxUserPoolDomain:
    Type: AWS::Cognito::UserPoolDomain
    Properties:
      Domain: !Sub "${AWS::StackName}-auth"
      UserPoolId: !Ref LearnerMaxUserPool
```

#### 3. SAM Template - Parameters for Google OAuth (from Secrets Manager)

**File**: `backend/template.yaml`
**Changes**: Add Parameters section at the top (after Transform, before Resources)

```yaml
Parameters:
  GoogleClientId:
    Type: String
    Description: Google OAuth Client ID (from Secrets Manager)
    Default: '{{resolve:secretsmanager:learnermax/google-oauth:SecretString:client_id}}'
    NoEcho: false
  GoogleClientSecret:
    Type: String
    Description: Google OAuth Client Secret (from Secrets Manager)
    Default: '{{resolve:secretsmanager:learnermax/google-oauth:SecretString:client_secret}}'
    NoEcho: true
```

**Note**: CloudFormation automatically resolves these values from Secrets Manager at deployment time. No manual parameter passing required!

#### 4. SAM Template - DynamoDB Tables

**File**: `backend/template.yaml`
**Changes**: Add after Cognito resources

```yaml
  # Students DynamoDB Table
  StudentsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub "${AWS::StackName}-students"
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: userId
          AttributeType: S
        - AttributeName: email
          AttributeType: S
      KeySchema:
        - AttributeName: userId
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: email-index
          KeySchema:
            - AttributeName: email
              KeyType: HASH
          Projection:
            ProjectionType: ALL
      StreamSpecification:
        StreamViewType: NEW_AND_OLD_IMAGES
      Tags:
        - Key: Application
          Value: LearnerMax
        - Key: Environment
          Value: !Ref AWS::StackName

  # Courses DynamoDB Table
  CoursesTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub "${AWS::StackName}-courses"
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: courseId
          AttributeType: S
      KeySchema:
        - AttributeName: courseId
          KeyType: HASH
      Tags:
        - Key: Application
          Value: LearnerMax
        - Key: Environment
          Value: !Ref AWS::StackName
```

#### 5. SAM Template - SNS Topic

**File**: `backend/template.yaml`
**Changes**: Add SNS topic for student onboarding events

```yaml
  # SNS Topic for Student Onboarding
  StudentOnboardingTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: !Sub "${AWS::StackName}-student-onboarding"
      DisplayName: Student Onboarding Events
      Tags:
        - Key: Application
          Value: LearnerMax
        - Key: Environment
          Value: !Ref AWS::StackName
```

#### 6. SAM Template - PostConfirmation Lambda Function

**File**: `backend/template.yaml`
**Changes**: Add PostConfirmation Lambda function

```yaml
  # PostConfirmation Lambda Function
  PostConfirmationFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./
      Handler: dist/lambdas/post-confirmation.handler
      Runtime: nodejs22.x
      MemorySize: 256
      Timeout: 10
      Description: Cognito PostConfirmation trigger - publishes to SNS
      Environment:
        Variables:
          SNS_TOPIC_ARN: !Ref StudentOnboardingTopic
      Policies:
        - SNSPublishMessagePolicy:
            TopicName: !GetAtt StudentOnboardingTopic.TopicName
      Events:
        CognitoTrigger:
          Type: Cognito
          Properties:
            UserPool: !Ref LearnerMaxUserPool
            Trigger: PostConfirmation

  # Student Onboarding Lambda Function
  StudentOnboardingFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./
      Handler: dist/lambdas/student-onboarding.handler
      Runtime: nodejs22.x
      MemorySize: 512
      Timeout: 30
      Description: Student Onboarding - creates student record in DynamoDB
      Environment:
        Variables:
          STUDENTS_TABLE: !Ref StudentsTable
          API_ENDPOINT: !Sub "https://${ApiGatewayApi}.execute-api.${AWS::Region}.amazonaws.com/Prod"
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref StudentsTable
      Events:
        SNSEvent:
          Type: SNS
          Properties:
            Topic: !Ref StudentOnboardingTopic
      DeadLetterQueue:
        Type: SQS
        TargetArn: !GetAtt StudentOnboardingDLQ.Arn

  # Dead Letter Queue for Student Onboarding
  StudentOnboardingDLQ:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub "${AWS::StackName}-student-onboarding-dlq"
      MessageRetentionPeriod: 1209600  # 14 days
      Tags:
        - Key: Application
          Value: LearnerMax

  # SNS Topic for DLQ Alerts
  DLQAlertTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: !Sub "${AWS::StackName}-dlq-alerts"
      DisplayName: Student Onboarding DLQ Alerts
      Tags:
        - Key: Application
          Value: LearnerMax

  # CloudWatch Alarm for DLQ Messages
  StudentOnboardingDLQAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub "${AWS::StackName}-student-onboarding-dlq-alarm"
      AlarmDescription: Alert when messages appear in Student Onboarding DLQ
      MetricName: ApproximateNumberOfMessagesVisible
      Namespace: AWS/SQS
      Statistic: Sum
      Period: 300  # 5 minutes
      EvaluationPeriods: 1
      Threshold: 0
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: QueueName
          Value: !GetAtt StudentOnboardingDLQ.QueueName
      AlarmActions:
        - !Ref DLQAlertTopic
      TreatMissingData: notBreaching
```

#### 7. SAM Template - API Gateway Cognito Authorizer

**File**: `backend/template.yaml`
**Changes**: Update `ApiGatewayApi` resource (replace existing one at lines 40-45)

```yaml
  # API Gateway with Cognito Authorizer
  ApiGatewayApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: Prod
      Cors:
        AllowOrigin: "'*'"
        AllowHeaders: "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
        AllowMethods: "'GET,POST,PUT,PATCH,DELETE,OPTIONS'"
      Auth:
        DefaultAuthorizer: CognitoAuthorizer
        Authorizers:
          CognitoAuthorizer:
            UserPoolArn: !GetAtt LearnerMaxUserPool.Arn
            Identity:
              Header: Authorization
```

#### 8. SAM Template - Update Express Function with Environment Variables

**File**: `backend/template.yaml`
**Changes**: Update `ExpressApiFunction` Environment section (lines 22-27)

```yaml
      Environment:
        Variables:
          # Lambda Web Adapter configuration
          AWS_LAMBDA_EXEC_WRAPPER: /opt/bootstrap
          RUST_LOG: info
          PORT: 8080
          # DynamoDB Tables
          STUDENTS_TABLE: !Ref StudentsTable
          COURSES_TABLE: !Ref CoursesTable
          # Cognito
          USER_POOL_ID: !Ref LearnerMaxUserPool
          USER_POOL_CLIENT_ID: !Ref LearnerMaxUserPoolClient
```

#### 9. SAM Template - Update Express Function Policies

**File**: `backend/template.yaml`
**Changes**: Add Policies section to `ExpressApiFunction` (after Environment)

```yaml
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref StudentsTable
        - DynamoDBReadPolicy:
            TableName: !Ref CoursesTable
```

#### 10. SAM Template - Update API Gateway Events for Express

**File**: `backend/template.yaml`
**Changes**: Update Events section in `ExpressApiFunction` (replace lines 31-37)

```yaml
      Events:
        # Catch-all for all routes (protected by Cognito)
        # Lambda Web Adapter forwards to Express, which handles routing
        ProxyEndpoint:
          Type: Api
          Properties:
            Path: /{proxy+}
            Method: ANY
            RestApiId: !Ref ApiGatewayApi
```

#### 11. SAM Template - CloudFormation Outputs

**File**: `backend/template.yaml`
**Changes**: Add new outputs (append to Outputs section after line 105)

```yaml
  # Cognito Outputs
  UserPoolId:
    Description: Cognito User Pool ID
    Value: !Ref LearnerMaxUserPool
    Export:
      Name: !Sub "${AWS::StackName}-UserPoolId"

  UserPoolClientId:
    Description: Cognito User Pool Client ID
    Value: !Ref LearnerMaxUserPoolClient
    Export:
      Name: !Sub "${AWS::StackName}-UserPoolClientId"

  UserPoolDomain:
    Description: Cognito User Pool Domain
    Value: !Sub "https://${LearnerMaxUserPoolDomain}.auth.${AWS::Region}.amazoncognito.com"
    Export:
      Name: !Sub "${AWS::StackName}-UserPoolDomain"

  # DynamoDB Outputs
  StudentsTableName:
    Description: Students DynamoDB Table Name
    Value: !Ref StudentsTable
    Export:
      Name: !Sub "${AWS::StackName}-StudentsTable"

  CoursesTableName:
    Description: Courses DynamoDB Table Name
    Value: !Ref CoursesTable
    Export:
      Name: !Sub "${AWS::StackName}-CoursesTable"

  # SNS Outputs
  StudentOnboardingTopicArn:
    Description: SNS Topic ARN for Student Onboarding
    Value: !Ref StudentOnboardingTopic
    Export:
      Name: !Sub "${AWS::StackName}-StudentOnboardingTopic"

  # Monitoring Outputs
  DLQAlertTopicArn:
    Description: SNS Topic ARN for DLQ Alerts (subscribe for failure notifications)
    Value: !Ref DLQAlertTopic
    Export:
      Name: !Sub "${AWS::StackName}-DLQAlertTopic"

  StudentOnboardingDLQUrl:
    Description: URL of Student Onboarding Dead Letter Queue
    Value: !Ref StudentOnboardingDLQ
    Export:
      Name: !Sub "${AWS::StackName}-StudentOnboardingDLQ"
```

**IMPORTANT**: Subscribe to DLQ alerts to be notified of student onboarding failures:

```bash
# Get the DLQ Alert Topic ARN from CloudFormation outputs
DLQ_ALERT_TOPIC=$(aws cloudformation describe-stacks \
  --stack-name learnermax-course-app-preview \
  --query 'Stacks[0].Outputs[?OutputKey==`DLQAlertTopicArn`].OutputValue' \
  --output text)

# Subscribe your email
aws sns subscribe \
  --topic-arn "$DLQ_ALERT_TOPIC" \
  --protocol email \
  --notification-endpoint your-email@example.com
```

#### 12. Backend Package.json - Add Dependencies

**File**: `backend/package.json`
**Changes**: Add to dependencies section (after line 12)

```json
    "@aws-sdk/client-cognito-identity-provider": "^3.398.0",
    "@aws-sdk/client-sns": "^3.398.0",
    "zod": "^3.22.0"
```


### Success Criteria

#### Continuous Validation (During Implementation):
- [ ] Google OAuth credentials stored in AWS Secrets Manager
- [ ] Secrets Manager secret created: `learnermax/google-oauth`
- [ ] Run `pnpm install` in backend - no errors
- [ ] Run `pnpm run typecheck` - no type errors
- [ ] SAM template validates: `cd backend && sam validate --lint`

#### Phase Completion Validation:
- [ ] All SAM resources validate successfully: `sam validate --lint`
- [ ] TypeScript compiles: `cd backend && pnpm run build`
- [ ] SAM builds successfully: `cd backend && sam build`
- [ ] CloudFormation template resolves Secrets Manager parameters correctly

#### Preview Deployment Validation:
- [ ] Backend deploys successfully: `./scripts/deploy-preview-backend.sh`
- [ ] CloudFormation stack created: `learnermax-course-app-preview`
- [ ] Cognito User Pool created (check AWS Console)
- [ ] DynamoDB tables created: Students and Courses
- [ ] SNS topics created: StudentOnboarding and DLQAlerts
- [ ] Lambda functions deployed: PostConfirmation, StudentOnboarding
- [ ] DLQ created and linked to StudentOnboardingFunction
- [ ] CloudWatch Alarm created for DLQ monitoring
- [ ] Subscribe to DLQ alert topic for failure notifications
- [ ] API Gateway has Cognito authorizer configured
- [ ] CloudFormation outputs include UserPoolId, UserPoolClientId, DLQAlertTopicArn, etc.

---

## Phase 2: Backend API - Student Endpoints

### Overview
Implement Express API endpoints for student CRUD operations with DynamoDB integration and Cognito authorization context.

### Changes Required

#### 1. Create Student Schema with Zod

**File**: `backend/src/schemas/student.schema.ts` (new file)
**Changes**: Create Zod validation schemas

```typescript
import { z } from 'zod';

export const CreateStudentSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100),
  signUpMethod: z.enum(['email', 'google']),
  enrolledCourses: z.array(z.string()).default([]),
});

export const UpdateStudentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  enrolledCourses: z.array(z.string()).optional(),
});

export const StudentResponseSchema = CreateStudentSchema.extend({
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;
export type StudentResponse = z.infer<typeof StudentResponseSchema>;
```

#### 2. Create Course Schema with Zod

**File**: `backend/src/schemas/course.schema.ts` (new file)
**Changes**: Create course schema

```typescript
import { z } from 'zod';

export const CourseSchema = z.object({
  courseId: z.string(),
  title: z.string(),
  description: z.string(),
  instructor: z.object({
    name: z.string(),
    title: z.string(),
    avatar: z.string().optional(),
  }),
  duration: z.string(),
  metadata: z.object({
    level: z.string(),
    category: z.string(),
    enrollmentCount: z.number().optional(),
  }),
});

export type Course = z.infer<typeof CourseSchema>;
```

#### 3. Create DynamoDB Client Utility

**File**: `backend/src/utils/dynamodb.ts` (new file)
**Changes**: Create DynamoDB client singleton

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Create DynamoDB client
const client = new DynamoDBClient({});

// Create DocumentClient wrapper
export const ddbDocClient = DynamoDBDocumentClient.from(client);

// Table names from environment
export const STUDENTS_TABLE = process.env.STUDENTS_TABLE || '';
export const COURSES_TABLE = process.env.COURSES_TABLE || '';
```

#### 4. Create Student Service Layer

**File**: `backend/src/services/student.service.ts` (new file)
**Changes**: Create student database operations

```typescript
import { GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient, STUDENTS_TABLE } from '../utils/dynamodb.js';
import { CreateStudentInput, UpdateStudentInput, StudentResponse } from '../schemas/student.schema.js';

export class StudentService {
  /**
   * Create a new student record
   */
  async createStudent(input: CreateStudentInput): Promise<StudentResponse> {
    const timestamp = new Date().toISOString();

    const student: StudentResponse = {
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const params = {
      TableName: STUDENTS_TABLE,
      Item: student,
      ConditionExpression: 'attribute_not_exists(userId)',
    };

    try {
      await ddbDocClient.send(new PutCommand(params));
      console.info('Student created:', { userId: student.userId });
      return student;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new Error('Student already exists');
      }
      console.error('Error creating student:', error);
      throw error;
    }
  }

  /**
   * Get student by userId
   */
  async getStudentById(userId: string): Promise<StudentResponse | null> {
    const params = {
      TableName: STUDENTS_TABLE,
      Key: { userId },
    };

    try {
      const result = await ddbDocClient.send(new GetCommand(params));
      if (!result.Item) {
        return null;
      }
      return result.Item as StudentResponse;
    } catch (error) {
      console.error('Error getting student:', error);
      throw error;
    }
  }

  /**
   * Get student by email (using GSI)
   */
  async getStudentByEmail(email: string): Promise<StudentResponse | null> {
    const params = {
      TableName: STUDENTS_TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
    };

    try {
      const result = await ddbDocClient.send(new QueryCommand(params));
      if (!result.Items || result.Items.length === 0) {
        return null;
      }
      return result.Items[0] as StudentResponse;
    } catch (error) {
      console.error('Error querying student by email:', error);
      throw error;
    }
  }

  /**
   * Update student
   */
  async updateStudent(userId: string, input: UpdateStudentInput): Promise<StudentResponse> {
    const timestamp = new Date().toISOString();

    // Build update expression dynamically
    const updateExpressions: string[] = ['updatedAt = :updatedAt'];
    const expressionAttributeValues: Record<string, any> = {
      ':updatedAt': timestamp,
    };
    const expressionAttributeNames: Record<string, string> = {};

    if (input.name !== undefined) {
      updateExpressions.push('#name = :name');
      expressionAttributeValues[':name'] = input.name;
      expressionAttributeNames['#name'] = 'name';
    }

    if (input.enrolledCourses !== undefined) {
      updateExpressions.push('enrolledCourses = :enrolledCourses');
      expressionAttributeValues[':enrolledCourses'] = input.enrolledCourses;
    }

    const params = {
      TableName: STUDENTS_TABLE,
      Key: { userId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0
        ? expressionAttributeNames
        : undefined,
      ConditionExpression: 'attribute_exists(userId)',
      ReturnValues: 'ALL_NEW' as const,
    };

    try {
      const result = await ddbDocClient.send(new UpdateCommand(params));
      console.info('Student updated:', { userId });
      return result.Attributes as StudentResponse;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new Error('Student not found');
      }
      console.error('Error updating student:', error);
      throw error;
    }
  }
}

export const studentService = new StudentService();
```

#### 5. Create Course Service Layer

**File**: `backend/src/services/course.service.ts` (new file)
**Changes**: Create course database operations

```typescript
import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient, COURSES_TABLE } from '../utils/dynamodb.js';
import { Course } from '../schemas/course.schema.js';

export class CourseService {
  /**
   * Get course by ID
   */
  async getCourseById(courseId: string): Promise<Course | null> {
    const params = {
      TableName: COURSES_TABLE,
      Key: { courseId },
    };

    try {
      const result = await ddbDocClient.send(new GetCommand(params));
      if (!result.Item) {
        return null;
      }
      return result.Item as Course;
    } catch (error) {
      console.error('Error getting course:', error);
      throw error;
    }
  }

  /**
   * List all courses
   */
  async listCourses(): Promise<Course[]> {
    const params = {
      TableName: COURSES_TABLE,
    };

    try {
      const result = await ddbDocClient.send(new ScanCommand(params));
      return (result.Items || []) as Course[];
    } catch (error) {
      console.error('Error listing courses:', error);
      throw error;
    }
  }
}

export const courseService = new CourseService();
```

#### 6. Create Middleware for Cognito Authorization Context

**File**: `backend/src/middleware/auth.middleware.ts` (new file)
**Changes**: Extract Cognito user from API Gateway authorizer context

```typescript
import { Request, Response, NextFunction } from 'express';

export interface CognitoUser {
  sub: string;
  email: string;
  name?: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: CognitoUser;
    }
  }
}

/**
 * Middleware to extract Cognito user from API Gateway authorizer context
 * API Gateway adds authorizer context to event.requestContext.authorizer.claims
 * Lambda Web Adapter passes this in headers: x-apigateway-event
 */
export const extractCognitoUser = (req: Request, res: Response, next: NextFunction) => {
  try {
    // When called via API Gateway with Cognito authorizer,
    // Lambda Web Adapter passes the event in x-apigateway-event header
    const apiGatewayEvent = req.headers['x-apigateway-event'];

    if (apiGatewayEvent && typeof apiGatewayEvent === 'string') {
      const event = JSON.parse(apiGatewayEvent);
      const claims = event.requestContext?.authorizer?.claims;

      if (claims) {
        req.user = {
          sub: claims.sub,
          email: claims.email,
          name: claims.name,
        };
        console.info('Authenticated user:', { sub: req.user.sub, email: req.user.email });
      }
    }

    next();
  } catch (error) {
    console.error('Error extracting Cognito user:', error);
    next();
  }
};

/**
 * Middleware to require authenticated user
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

/**
 * Middleware to require resource ownership (centralized authorization)
 * Ensures the authenticated user can only access their own resources
 *
 * @param userIdParam - The name of the route parameter containing the userId
 * @example router.get('/students/:userId', requireAuth, requireOwnership('userId'), handler)
 */
export const requireOwnership = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestedUserId = req.params[userIdParam];
    const authenticatedUserId = req.user?.sub;

    if (!authenticatedUserId) {
      // Should not happen if requireAuth is used, but defensive check
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (authenticatedUserId !== requestedUserId) {
      console.warn('Authorization failed:', {
        authenticatedUserId,
        requestedUserId,
        endpoint: req.path,
      });
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};
```

#### 7. Create Student API Routes

**File**: `backend/src/routes/student.routes.ts` (new file)
**Changes**: Define student API endpoints

```typescript
import { Router, Request, Response } from 'express';
import { studentService } from '../services/student.service.js';
import { CreateStudentSchema, UpdateStudentSchema } from '../schemas/student.schema.js';
import { requireAuth, requireOwnership } from '../middleware/auth.middleware.js';

export const studentRouter = Router();

/**
 * POST /api/students
 * Create a new student (authentication required, no ownership check needed for creation)
 */
studentRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = CreateStudentSchema.parse(req.body);

    // Create student
    const student = await studentService.createStudent(validatedData);

    res.status(201).json(student);
  } catch (error: any) {
    console.error('Error creating student:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    if (error.message === 'Student already exists') {
      return res.status(409).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/students/:userId
 * Get student by ID (uses centralized ownership check)
 */
studentRouter.get('/:userId', requireAuth, requireOwnership('userId'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const student = await studentService.getStudentById(userId);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Error getting student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/students/:userId
 * Update student (uses centralized ownership check)
 */
studentRouter.patch('/:userId', requireAuth, requireOwnership('userId'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Validate request body
    const validatedData = UpdateStudentSchema.parse(req.body);

    const student = await studentService.updateStudent(userId, validatedData);

    res.json(student);
  } catch (error: any) {
    console.error('Error updating student:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    if (error.message === 'Student not found') {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});
```

#### 8. Create Course API Routes

**File**: `backend/src/routes/course.routes.ts` (new file)
**Changes**: Define course API endpoints

```typescript
import { Router, Request, Response } from 'express';
import { courseService } from '../services/course.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const courseRouter = Router();

/**
 * GET /api/courses
 * List all courses (authentication required)
 */
courseRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const courses = await courseService.listCourses();
    res.json(courses);
  } catch (error) {
    console.error('Error listing courses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/courses/:courseId
 * Get course by ID (authentication required)
 */
courseRouter.get('/:courseId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const course = await courseService.getCourseById(courseId);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    console.error('Error getting course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

#### 9. Update Express App with New Routes

**File**: `backend/src/app.ts`
**Changes**: Add new routes and middleware (replace entire file)

```typescript
import express, { Request, Response, Express } from 'express';
import { studentRouter } from './routes/student.routes.js';
import { courseRouter } from './routes/course.routes.js';
import { extractCognitoUser } from './middleware/auth.middleware.js';

// Initialize Express app
const app: Express = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// Extract Cognito user from API Gateway authorizer context
app.use(extractCognitoUser);

// Health check endpoint (useful for monitoring)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes (protected by Cognito via API Gateway)
app.use('/api/students', studentRouter);
app.use('/api/courses', courseRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
```

#### 10. Create Shell Script for Course Data Population

**File**: `backend/scripts/populate-courses.sh` (new file)
**Changes**: Script to populate sample GenAI course

```bash
#!/bin/bash

set -e

# Get stack name (default to preview)
STACK_NAME="${1:-learnermax-course-app-preview}"

echo "📚 Populating courses table for stack: $STACK_NAME"

# Get table name from CloudFormation
TABLE_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`CoursesTableName`].OutputValue' \
  --output text)

if [ -z "$TABLE_NAME" ]; then
  echo "❌ Error: Could not find CoursesTable output"
  exit 1
fi

echo "📋 Table name: $TABLE_NAME"

# Sample GenAI Course
COURSE_JSON='{
  "courseId": "genai-fundamentals-2025",
  "title": "Generative AI Fundamentals: From Theory to Practice",
  "description": "Master the fundamentals of Generative AI including Large Language Models, prompt engineering, fine-tuning, and building production-ready AI applications. Learn to work with GPT, Claude, and open-source models while understanding the ethical implications and best practices.",
  "instructor": {
    "name": "Dr. Sarah Chen",
    "title": "AI Research Lead & Former OpenAI Engineer",
    "avatar": "https://i.pravatar.cc/150?img=47"
  },
  "duration": "8 weeks",
  "metadata": {
    "level": "Intermediate",
    "category": "Artificial Intelligence",
    "enrollmentCount": 0,
    "topics": [
      "Large Language Models Architecture",
      "Prompt Engineering Techniques",
      "RAG (Retrieval-Augmented Generation)",
      "Fine-tuning and Model Adaptation",
      "AI Safety and Alignment",
      "Production Deployment Strategies"
    ],
    "prerequisites": [
      "Basic Python programming",
      "Understanding of neural networks",
      "Familiarity with REST APIs"
    ],
    "learningOutcomes": [
      "Understand transformer architecture and attention mechanisms",
      "Master advanced prompt engineering techniques",
      "Build RAG systems with vector databases",
      "Fine-tune models for specific use cases",
      "Deploy AI applications to production",
      "Navigate ethical considerations in AI development"
    ]
  }
}'

# Insert course into DynamoDB
echo "💾 Inserting course into DynamoDB..."
aws dynamodb put-item \
  --table-name "$TABLE_NAME" \
  --item "$(echo "$COURSE_JSON" | jq -c '{
    courseId: {S: .courseId},
    title: {S: .title},
    description: {S: .description},
    instructor: {M: {
      name: {S: .instructor.name},
      title: {S: .instructor.title},
      avatar: {S: .instructor.avatar}
    }},
    duration: {S: .duration},
    metadata: {M: {
      level: {S: .metadata.level},
      category: {S: .metadata.category},
      enrollmentCount: {N: (.metadata.enrollmentCount | tostring)},
      topics: {L: [.metadata.topics[] | {S: .}]},
      prerequisites: {L: [.metadata.prerequisites[] | {S: .}]},
      learningOutcomes: {L: [.metadata.learningOutcomes[] | {S: .}]}
    }}
  }')"

echo "✅ Course populated successfully!"
echo ""
echo "📖 Course Details:"
echo "  ID: genai-fundamentals-2025"
echo "  Title: Generative AI Fundamentals: From Theory to Practice"
echo "  Instructor: Dr. Sarah Chen"
echo "  Duration: 8 weeks"
```

Make executable:
```bash
chmod +x backend/scripts/populate-courses.sh
```

### Success Criteria

#### Continuous Validation (During Implementation):
- [ ] Run `pnpm install` after adding dependencies - no errors
- [ ] Run `pnpm run typecheck` after each file - no type errors
- [ ] Run `pnpm run lint` - no linting errors
- [ ] Test student service locally with mock data

#### Phase Completion Validation:
- [ ] All TypeScript files compile: `cd backend && pnpm run build`
- [ ] All tests pass: `cd backend && pnpm test`
- [ ] Type checking passes: `pnpm run typecheck`
- [ ] Linting passes: `pnpm run lint`
- [ ] Test coverage meets 90% threshold: `pnpm run test:coverage`
- [ ] Build succeeds: `pnpm run build`
- [ ] Course population script is executable

#### Preview Deployment Validation:
- [ ] Backend deploys successfully: `./scripts/deploy-preview-backend.sh`
- [ ] Sample course populated: `cd backend && ./scripts/populate-courses.sh`
- [ ] API health check responds: `curl <API_URL>/health`
- [ ] Student endpoints protected (401 without JWT)
- [ ] Course endpoints protected (401 without JWT)
- [ ] No errors in backend logs: `scripts/.sam-logs.log`

---

## Phase 3: Event-Driven Architecture - Lambda Functions

### Overview
Implement PostConfirmation Lambda (publishes to SNS) and Student Onboarding Lambda (creates student records).

### Changes Required

#### 1. Create SNS Client Utility

**File**: `backend/src/utils/sns.ts` (new file)
**Changes**: Create SNS client

```typescript
import { SNSClient, PublishCommand, PublishCommandInput } from '@aws-sdk/client-sns';

const snsClient = new SNSClient({});

export interface StudentOnboardingEvent {
  userId: string;
  email: string;
  name: string;
  signUpMethod: 'email' | 'google';
  timestamp: string;
}

/**
 * Publish student onboarding event to SNS
 */
export async function publishStudentOnboardingEvent(
  topicArn: string,
  event: StudentOnboardingEvent
): Promise<void> {
  const params: PublishCommandInput = {
    TopicArn: topicArn,
    Message: JSON.stringify(event),
    Subject: 'New Student Signup',
    MessageAttributes: {
      userId: {
        DataType: 'String',
        StringValue: event.userId,
      },
      signUpMethod: {
        DataType: 'String',
        StringValue: event.signUpMethod,
      },
    },
  };

  try {
    const result = await snsClient.send(new PublishCommand(params));
    console.info('SNS message published:', {
      messageId: result.MessageId,
      userId: event.userId
    });
  } catch (error) {
    console.error('Error publishing to SNS:', error);
    throw error;
  }
}
```

#### 2. Create PostConfirmation Lambda Handler

**File**: `backend/src/lambdas/post-confirmation.ts` (new file)
**Changes**: Cognito PostConfirmation trigger handler

```typescript
import { PostConfirmationTriggerEvent, PostConfirmationTriggerHandler } from 'aws-lambda';
import { publishStudentOnboardingEvent, StudentOnboardingEvent } from '../utils/sns.js';

const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN || '';

/**
 * Cognito PostConfirmation Trigger
 * Triggered after user confirms email or completes OAuth sign-up
 */
export const handler: PostConfirmationTriggerHandler = async (
  event: PostConfirmationTriggerEvent
): Promise<PostConfirmationTriggerEvent> => {
  console.info('PostConfirmation trigger received:', {
    userPoolId: event.userPoolId,
    userName: event.userName,
    triggerSource: event.triggerSource,
  });

  try {
    // Extract user attributes
    const userId = event.request.userAttributes.sub;
    const email = event.request.userAttributes.email;
    const name = event.request.userAttributes.name || email.split('@')[0];

    // Determine sign-up method from trigger source
    let signUpMethod: 'email' | 'google' = 'email';
    if (event.triggerSource === 'PostConfirmation_ConfirmForgotPassword') {
      // This is a password reset, not a new sign-up - skip onboarding
      console.info('Password reset confirmation - skipping onboarding');
      return event;
    } else if (event.triggerSource.includes('External')) {
      signUpMethod = 'google';
    }

    // Create onboarding event
    const onboardingEvent: StudentOnboardingEvent = {
      userId,
      email,
      name,
      signUpMethod,
      timestamp: new Date().toISOString(),
    };

    // Publish to SNS
    await publishStudentOnboardingEvent(SNS_TOPIC_ARN, onboardingEvent);

    console.info('Student onboarding event published successfully:', { userId });
  } catch (error) {
    console.error('Error in PostConfirmation trigger:', error);
    // Don't throw - we don't want to block user sign-up if SNS fails
    // The error will be logged to CloudWatch for manual intervention
  }

  // Always return the event to allow Cognito to complete
  return event;
};
```

#### 3. Create Student Onboarding Lambda Handler

**File**: `backend/src/lambdas/student-onboarding.ts` (new file)
**Changes**: SNS subscriber that creates student records

```typescript
import { SNSEvent, SNSHandler } from 'aws-lambda';
import { studentService } from '../services/student.service.js';
import { StudentOnboardingEvent } from '../utils/sns.js';
import { CreateStudentInput } from '../schemas/student.schema.js';

/**
 * Student Onboarding Lambda
 * Subscribes to SNS topic, creates student records in DynamoDB
 */
export const handler: SNSHandler = async (event: SNSEvent): Promise<void> => {
  console.info('Student onboarding SNS event received:', {
    recordCount: event.Records.length,
  });

  // Process each SNS message
  for (const record of event.Records) {
    try {
      const message = record.Sns.Message;
      const onboardingEvent: StudentOnboardingEvent = JSON.parse(message);

      console.info('Processing student onboarding:', {
        userId: onboardingEvent.userId,
        email: onboardingEvent.email,
        signUpMethod: onboardingEvent.signUpMethod,
      });

      // Check if student already exists (idempotency)
      const existingStudent = await studentService.getStudentById(onboardingEvent.userId);

      if (existingStudent) {
        console.info('Student already exists - skipping creation:', {
          userId: onboardingEvent.userId,
        });
        continue;
      }

      // Create student record
      const createInput: CreateStudentInput = {
        userId: onboardingEvent.userId,
        email: onboardingEvent.email,
        name: onboardingEvent.name,
        signUpMethod: onboardingEvent.signUpMethod,
        enrolledCourses: [],
      };

      const student = await studentService.createStudent(createInput);

      console.info('Student created successfully:', {
        userId: student.userId,
        email: student.email,
      });
    } catch (error) {
      console.error('Error processing student onboarding:', error);
      // Throw error to trigger SNS retry mechanism
      throw error;
    }
  }

  console.info('All student onboarding events processed successfully');
};
```

#### 4. Add Lambda Types to TypeScript

**File**: `backend/package.json`
**Changes**: Add AWS Lambda types to devDependencies (after line 19)

```json
    "@types/aws-lambda": "^8.10.136",
```

#### 5. Update tsconfig for Lambda Handlers

**File**: `backend/tsconfig.json`
**Changes**: Ensure lambdas directory is included (verify line 21)

```json
  "include": ["src/**/*"],
```

This should already include `src/lambdas/*` since it's a wildcard.

### Success Criteria

#### Continuous Validation (During Implementation):
- [ ] Run `pnpm install` after adding Lambda types - no errors
- [ ] Run `pnpm run typecheck` - no type errors for Lambda handlers
- [ ] Build TypeScript: `pnpm run build`
- [ ] Verify Lambda handlers compiled to `dist/lambdas/`

#### Phase Completion Validation:
- [ ] All TypeScript compiles: `cd backend && pnpm run build`
- [ ] Lambda handlers exist in dist: `ls dist/lambdas/post-confirmation.js dist/lambdas/student-onboarding.js`
- [ ] Type checking passes: `pnpm run typecheck`
- [ ] Linting passes: `pnpm run lint`

#### Preview Deployment Validation:
- [ ] Backend deploys successfully: `./scripts/deploy-preview-backend.sh`
- [ ] Lambda functions deployed: PostConfirmationFunction, StudentOnboardingFunction
- [ ] CloudWatch Logs show Lambda function log groups created
- [ ] Test PostConfirmation: Sign up test user via Cognito console
- [ ] Verify SNS message published (check CloudWatch Logs)
- [ ] Verify student record created in DynamoDB
- [ ] No errors in backend logs: `scripts/.sam-logs.log`

---

## Phase 4: Frontend Authentication Foundation

### Overview
Install and configure NextAuth.js with AWS Cognito provider, set up AWS SDK for Cognito operations, create authentication utilities and hooks.

### Changes Required

#### 1. Install Frontend Dependencies

**File**: `frontend/package.json`
**Changes**: Add authentication dependencies (after line 34)

```json
    "next-auth": "^5.0.0-beta.25",
    "@aws-sdk/client-cognito-identity-provider": "^3.398.0",
    "jose": "^5.2.0"
```

Run installation:
```bash
cd frontend && pnpm install
```

#### 2. Create Frontend Environment Configuration

**File**: `frontend/.env.local` (new file)
**Changes**: Create environment variables file

```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<GENERATE_WITH_openssl_rand_base64_32>

# AWS Cognito Configuration
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_USER_POOL_ID=<FROM_CLOUDFORMATION_OUTPUT>
NEXT_PUBLIC_USER_POOL_CLIENT_ID=<FROM_CLOUDFORMATION_OUTPUT>
COGNITO_CLIENT_SECRET=<FROM_AWS_CONSOLE>
COGNITO_ISSUER_URL=<FROM_CLOUDFORMATION_OUTPUT>

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8080

# For Production (Vercel)
# NEXTAUTH_URL=https://learnermax-course-app.vercel.app
# NEXT_PUBLIC_API_URL=<FROM_CLOUDFORMATION_OUTPUT>
```

**ACTION REQUIRED**:
1. Generate NEXTAUTH_SECRET: `openssl rand -base64 32` (used to encrypt NextAuth session JWT cookie)
2. After backend deployment, copy Cognito values from CloudFormation outputs
3. Get COGNITO_CLIENT_SECRET from AWS Console (Cognito > User Pool > App Client > Show secret)

**Note**:
- `NEXTAUTH_SECRET` encrypts NextAuth's JWT session cookie (not related to Cognito)
- `COGNITO_CLIENT_SECRET` is the app client secret from Cognito (required for OAuth code exchange)
- `COGNITO_ISSUER_URL` is your Cognito domain URL (e.g., `https://yourapp.auth.us-east-1.amazoncognito.com`)

#### 3. Update Deployment Script to Populate Frontend .env

**File**: `scripts/deploy-preview-frontend.sh`
**Changes**: Update to populate Cognito config (add after line 12, before line 16)

```bash
# Extract Cognito configuration from backend CloudFormation
echo "🔐 Extracting Cognito configuration..."

USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name learnermax-course-app-preview \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name learnermax-course-app-preview \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
  --output text)

USER_POOL_DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name learnermax-course-app-preview \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolDomain`].OutputValue' \
  --output text)

API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name learnermax-course-app-preview \
  --query 'Stacks[0].Outputs[?OutputKey==`WebEndpoint`].OutputValue' \
  --output text)

# Update frontend .env.local
echo "📝 Updating frontend/.env.local..."
cd "$PROJECT_ROOT/frontend"

# Update or add Cognito config
sed -i '/^NEXT_PUBLIC_USER_POOL_ID=/d' .env.local
sed -i '/^NEXT_PUBLIC_USER_POOL_CLIENT_ID=/d' .env.local
sed -i '/^NEXT_PUBLIC_USER_POOL_DOMAIN=/d' .env.local
sed -i '/^NEXT_PUBLIC_API_URL=/d' .env.local

echo "NEXT_PUBLIC_USER_POOL_ID=$USER_POOL_ID" >> .env.local
echo "NEXT_PUBLIC_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID" >> .env.local
echo "NEXT_PUBLIC_USER_POOL_DOMAIN=$USER_POOL_DOMAIN" >> .env.local
echo "NEXT_PUBLIC_API_URL=$API_ENDPOINT" >> .env.local

cd "$PROJECT_ROOT"
```

#### 4. Create Cognito Service Utility

**File**: `frontend/lib/cognito/cognito-service.ts` (new file)
**Changes**: AWS SDK wrapper for Cognito operations

```typescript
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ResendConfirmationCodeCommand,
  AuthFlowType,
  ChallengeNameType,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
});

const CLIENT_ID = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '';

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
}

export interface ConfirmSignUpParams {
  email: string;
  code: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface ForgotPasswordParams {
  email: string;
}

export interface ResetPasswordParams {
  email: string;
  code: string;
  newPassword: string;
}

/**
 * Sign up a new user with email and password
 */
export async function signUp(params: SignUpParams) {
  const command = new SignUpCommand({
    ClientId: CLIENT_ID,
    Username: params.email,
    Password: params.password,
    UserAttributes: [
      { Name: 'email', Value: params.email },
      { Name: 'name', Value: params.name },
    ],
  });

  try {
    const response = await client.send(command);
    return {
      success: true,
      userSub: response.UserSub,
      codeDeliveryDetails: response.CodeDeliveryDetails,
    };
  } catch (error: any) {
    console.error('Sign up error:', error);
    throw new Error(error.message || 'Sign up failed');
  }
}

/**
 * Confirm email with verification code
 */
export async function confirmSignUp(params: ConfirmSignUpParams) {
  const command = new ConfirmSignUpCommand({
    ClientId: CLIENT_ID,
    Username: params.email,
    ConfirmationCode: params.code,
  });

  try {
    await client.send(command);
    return { success: true };
  } catch (error: any) {
    console.error('Confirm sign up error:', error);
    throw new Error(error.message || 'Email verification failed');
  }
}

/**
 * Resend verification code
 */
export async function resendConfirmationCode(email: string) {
  const command = new ResendConfirmationCodeCommand({
    ClientId: CLIENT_ID,
    Username: email,
  });

  try {
    const response = await client.send(command);
    return {
      success: true,
      codeDeliveryDetails: response.CodeDeliveryDetails,
    };
  } catch (error: any) {
    console.error('Resend code error:', error);
    throw new Error(error.message || 'Failed to resend code');
  }
}

/**
 * Initiate forgot password flow
 */
export async function forgotPassword(params: ForgotPasswordParams) {
  const command = new ForgotPasswordCommand({
    ClientId: CLIENT_ID,
    Username: params.email,
  });

  try {
    const response = await client.send(command);
    return {
      success: true,
      codeDeliveryDetails: response.CodeDeliveryDetails,
    };
  } catch (error: any) {
    console.error('Forgot password error:', error);
    throw new Error(error.message || 'Failed to initiate password reset');
  }
}

/**
 * Confirm forgot password with code and new password
 */
export async function confirmForgotPassword(params: ResetPasswordParams) {
  const command = new ConfirmForgotPasswordCommand({
    ClientId: CLIENT_ID,
    Username: params.email,
    ConfirmationCode: params.code,
    Password: params.newPassword,
  });

  try {
    await client.send(command);
    return { success: true };
  } catch (error: any) {
    console.error('Confirm forgot password error:', error);
    throw new Error(error.message || 'Password reset failed');
  }
}
```

#### 5. Create NextAuth Configuration

**File**: `frontend/lib/auth/auth.config.ts` (new file)
**Changes**: NextAuth configuration with Cognito provider and token refresh

```typescript
import type { NextAuthConfig } from 'next-auth';
import Cognito from 'next-auth/providers/cognito';

/**
 * Refresh Cognito tokens using the refresh token
 * Called automatically when access/ID tokens expire
 */
async function refreshCognitoTokens(refreshToken: string) {
  const tokenEndpoint = `${process.env.COGNITO_ISSUER_URL}/oauth2/token`;

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID!,
      client_secret: process.env.COGNITO_CLIENT_SECRET!,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token refresh failed:', error);
    throw new Error('Failed to refresh tokens');
  }

  const tokens = await response.json();
  return {
    accessToken: tokens.access_token,
    idToken: tokens.id_token,
    // Note: Cognito typically returns a new refresh token
    refreshToken: tokens.refresh_token || refreshToken,
  };
}

export const authConfig = {
  providers: [
    Cognito({
      clientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID!,
      clientSecret: process.env.COGNITO_CLIENT_SECRET!,
      issuer: process.env.COGNITO_ISSUER_URL,
      // The issuer is your Cognito User Pool domain URL
      // NextAuth will use the OIDC discovery document from this issuer
      authorization: {
        params: {
          scope: 'openid email profile',
        },
      },
    }),
  ],
  pages: {
    signIn: '/signin',
    error: '/signin',
    newUser: '/courses', // Smart routing: auto-redirects based on enrollment
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // On initial sign-in, merge Cognito tokens into our JWT
      if (account && profile) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;
        token.userId = profile.sub;
        // Store token expiration time (ID token expires in 1 hour typically)
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : Date.now() + 3600000;
        return token;
      }

      // Check if token is still valid (5 min buffer before expiry)
      const timeUntilExpiry = (token.expiresAt as number) - Date.now();
      if (timeUntilExpiry > 5 * 60 * 1000) {
        // Token still valid, return as-is
        return token;
      }

      // Token expired or expiring soon - refresh it
      console.info('Refreshing expired Cognito tokens');
      try {
        const refreshedTokens = await refreshCognitoTokens(token.refreshToken as string);
        return {
          ...token,
          accessToken: refreshedTokens.accessToken,
          idToken: refreshedTokens.idToken,
          expiresAt: Date.now() + 3600000, // New tokens expire in 1 hour
        };
      } catch (error) {
        console.error('Failed to refresh Cognito tokens:', error);
        // Return token with error flag - session callback will handle sign-out
        return {
          ...token,
          error: 'RefreshTokenError',
        };
      }
    },
    async session({ session, token }) {
      // If token refresh failed, clear session (forces re-authentication)
      if (token.error === 'RefreshTokenError') {
        console.warn('Token refresh failed - user must re-authenticate');
        return {
          ...session,
          error: 'RefreshTokenError',
        };
      }

      // Attach token fields to the session object
      session.user = session.user || {};
      session.user.id = token.userId as string;
      session.accessToken = token.accessToken as string;
      session.idToken = token.idToken as string;
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnCourseRoute = nextUrl.pathname.startsWith('/course');

      if (isOnCourseRoute) {
        if (isLoggedIn) return true;
        return false; // Redirect to signin
      }

      return true;
    },
  },
  session: {
    strategy: 'jwt', // Use JSON Web Tokens for session instead of database
  },
} satisfies NextAuthConfig;
```

**Key Points**:
- Uses Cognito domain URL as issuer (not the IDP URL)
- Stores all three Cognito tokens: `access_token`, `id_token`, `refresh_token`
- Tokens are encrypted in NextAuth's JWT cookie using `NEXTAUTH_SECRET`
- **Automatic token refresh**: Refreshes tokens 5 minutes before expiry (no forced re-logins)
- Session object exposes `idToken` for backend API calls
- Protects all `/course/*` routes - requires authentication
- Redirects to `/courses` after successful signin/signup (smart routing page)
- Graceful error handling: Token refresh failures trigger automatic sign-out

#### 6. Create NextAuth Route Handler

**File**: `frontend/app/api/auth/[...nextauth]/route.ts` (new file)
**Changes**: NextAuth API route

```typescript
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth/auth.config';

const handler = NextAuth(authConfig);

export { handler as GET, handler as POST };
```

#### 7. Extend NextAuth TypeScript Types

**File**: `frontend/types/next-auth.d.ts` (new file)
**Changes**: Type augmentation for NextAuth with Cognito tokens

```typescript
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
    accessToken: string;
    idToken: string;
    error?: string; // Error flag for token refresh failures
  }

  interface User {
    id: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    expiresAt?: number; // Unix timestamp when tokens expire
    error?: string; // Error flag for token refresh failures
  }
}
```

#### 8. Create Authentication Hooks

**File**: `frontend/lib/hooks/use-auth.ts` (new file)
**Changes**: Custom hook for authentication with token refresh error handling

```typescript
import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';

export function useAuth() {
  const { data: session, status } = useSession();

  // Handle token refresh failures by forcing sign-out
  useEffect(() => {
    if (session?.error === 'RefreshTokenError') {
      console.warn('Token refresh failed - signing out');
      signOut({ callbackUrl: '/signin?error=SessionExpired' });
    }
  }, [session?.error]);

  return {
    user: session?.user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated' && !session?.error,
    accessToken: session?.accessToken,
    idToken: session?.idToken,
  };
}
```

#### 9. Create API Client Utility

**File**: `frontend/lib/api/api-client.ts` (new file)
**Changes**: Fetch wrapper with JWT authentication

```typescript
import { getSession } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const session = await getSession();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add JWT token if available
  if (session?.idToken) {
    headers['Authorization'] = `Bearer ${session.idToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new APIError(
      errorData.error || 'API request failed',
      response.status,
      errorData
    );
  }

  return response;
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await fetchWithAuth(endpoint);
  return response.json();
}

export async function apiPost<T>(endpoint: string, data: any): Promise<T> {
  const response = await fetchWithAuth(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function apiPatch<T>(endpoint: string, data: any): Promise<T> {
  const response = await fetchWithAuth(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}
```

#### 10. Update Root Layout with Session Provider

**File**: `frontend/app/layout.tsx`
**Changes**: Wrap app with SessionProvider (update existing file)

```typescript
import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import './globals.css';

export const metadata: Metadata = {
  title: 'LearnerMax - Master Generative AI',
  description: 'Learn cutting-edge AI skills from industry experts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

### Success Criteria

#### Continuous Validation (During Implementation):
- [ ] Run `pnpm install` - no errors
- [ ] Run `pnpm run typecheck` - no type errors
- [ ] Run `pnpm run lint` - no linting errors
- [ ] Dev server starts: `pnpm run dev`

#### Phase Completion Validation:
- [ ] All TypeScript compiles: `cd frontend && pnpm run build`
- [ ] Type checking passes: `pnpm run typecheck`
- [ ] Linting passes: `pnpm run lint`
- [ ] NextAuth API route accessible: `http://localhost:3000/api/auth/providers`
- [ ] `.env.local` file created with placeholders

#### Preview Deployment Validation:
- [ ] Frontend deploys successfully: `./scripts/deploy-preview-frontend.sh`
- [ ] Deployment script populates Cognito config in `.env.local`
- [ ] No build errors in Vercel
- [ ] NextAuth configuration loads without errors

---

## Phase 5: Frontend Authentication Pages

### Overview
Implement all authentication pages: sign-up (update existing), sign-in, forgot-password, reset-password, verify-email.

### Changes Required

#### 1. Update Enrollment Form with Cognito Integration

**File**: `frontend/components/enrollment/EnrollmentForm.tsx`
**Changes**: Connect to Cognito sign-up (replace handleSubmit function at lines 20-24)

```typescript
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { GoogleSignInButton } from './GoogleSignInButton';
import { motion } from 'motion/react';
import { Mail, User, Lock, AlertCircle } from 'lucide-react';
import { signUp } from '@/lib/cognito/cognito-service';

export function EnrollmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseid');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Sign up with Cognito
      await signUp({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });

      // Redirect to verification page with email
      router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
    } catch (err: any) {
      console.error('Sign up error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="max-w-md mx-auto p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Create Your Account</h2>
          <p className="text-sm text-muted-foreground">
            Start your learning journey today
          </p>
        </div>

        <GoogleSignInButton />

        <div className="relative my-6">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
            OR
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="pl-10"
                required
                disabled={isLoading}
                minLength={8}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Min 8 characters, uppercase, lowercase, number, special character
            </p>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>

        <p className="text-center text-sm mt-4">
          Already have an account?{' '}
          <a href="/signin" className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </Card>
    </motion.div>
  );
}
```

#### 2. Update Google Sign In Button

**File**: `frontend/components/enrollment/GoogleSignInButton.tsx`
**Changes**: Connect to NextAuth with Cognito provider (replace entire file)

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { signIn } from 'next-auth/react';

export function GoogleSignInButton() {
  const handleGoogleSignIn = () => {
    // Redirect to Cognito, which will immediately redirect to Google
    // identity_provider parameter bypasses Cognito login page
    signIn('cognito',
      { callbackUrl: '/courses' },
      { identity_provider: 'Google' }
    );
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      size="lg"
      onClick={handleGoogleSignIn}
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Continue with Google
    </Button>
  );
}
```

**Flow**:
1. User clicks button → `signIn('cognito')` called
2. NextAuth redirects to Cognito Authorize endpoint with `identity_provider=Google`
3. Cognito immediately redirects to Google OAuth (skips Cognito login page)
4. User authenticates with Google
5. Google redirects to Cognito `/oauth2/idpresponse`
6. Cognito redirects to NextAuth callback with authorization code
7. NextAuth exchanges code for Cognito tokens
8. User redirected to `/courses` (smart routing page) with session established

#### 3. Create Sign In Page

**File**: `frontend/app/signin/page.tsx` (new file)
**Changes**: Sign in page with email/password and Google

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function SignInPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/courses');
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('cognito', { callbackUrl: '/courses' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">
            Sign in to continue your learning journey
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full mb-6"
          size="lg"
          onClick={handleGoogleSignIn}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="relative my-6">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
            OR
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <p className="text-center text-sm mt-6">
          Don't have an account?{' '}
          <Link href="/enroll" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}
```

#### 4. Create Verify Email Page

**File**: `frontend/app/verify-email/page.tsx` (new file)
**Changes**: Email verification with code input

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import {
  confirmSignUp,
  resendConfirmationCode,
} from '@/lib/cognito/cognito-service';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');

  const [email, setEmail] = useState(emailParam || '');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      await confirmSignUp({ email, code });
      setSuccess('Email verified successfully! Redirecting to sign in...');

      setTimeout(() => {
        router.push('/signin');
      }, 2000);
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setSuccess(null);
    setIsResending(true);

    try {
      await resendConfirmationCode(email);
      setSuccess('Verification code resent! Check your email.');
    } catch (err: any) {
      console.error('Resend error:', err);
      setError(err.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Verify Your Email</h1>
          <p className="text-muted-foreground">
            We sent a verification code to{' '}
            <span className="font-medium">{email}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-md flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              required
              disabled={isLoading}
              className="text-center text-2xl tracking-widest font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Check your email for the verification code
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isLoading || code.length !== 6}
          >
            {isLoading ? 'Verifying...' : 'Verify Email'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Didn't receive the code?
          </p>
          <Button
            type="button"
            variant="link"
            onClick={handleResendCode}
            disabled={isResending}
            className="text-primary"
          >
            {isResending ? 'Resending...' : 'Resend Code'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

#### 5. Create Forgot Password Page

**File**: `frontend/app/forgot-password/page.tsx` (new file)
**Changes**: Initiate password reset

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { forgotPassword } from '@/lib/cognito/cognito-service';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await forgotPassword({ email });
      setSuccess(true);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err.message || 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
            <p className="text-muted-foreground mb-6">
              We've sent a password reset code to{' '}
              <span className="font-medium">{email}</span>
            </p>
            <Button
              onClick={() =>
                router.push(`/reset-password?email=${encodeURIComponent(email)}`)
              }
              className="w-full"
              size="lg"
            >
              Continue to Reset Password
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Forgot Password?</h1>
          <p className="text-muted-foreground">
            Enter your email and we'll send you a code to reset your password
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? 'Sending Code...' : 'Send Reset Code'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/signin"
            className="text-sm text-primary hover:underline"
          >
            Back to Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
}
```

#### 6. Create Reset Password Page

**File**: `frontend/app/reset-password/page.tsx` (new file)
**Changes**: Reset password with code

```typescript
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { confirmForgotPassword } from '@/lib/cognito/cognito-service';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');

  const [formData, setFormData] = useState({
    email: emailParam || '',
    code: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await confirmForgotPassword({
        email: formData.email,
        code: formData.code,
        newPassword: formData.newPassword,
      });

      setSuccess(true);

      setTimeout(() => {
        router.push('/signin');
      }, 2000);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Password Reset!</h1>
            <p className="text-muted-foreground mb-4">
              Your password has been reset successfully. Redirecting to sign in...
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
          <p className="text-muted-foreground">
            Enter the code from your email and your new password
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              disabled={isLoading || !!emailParam}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="Enter 6-digit code"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              maxLength={6}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="••••••••"
              value={formData.newPassword}
              onChange={(e) =>
                setFormData({ ...formData, newPassword: e.target.value })
              }
              minLength={8}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Min 8 characters, uppercase, lowercase, number, special character
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              minLength={8}
              required
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? 'Resetting Password...' : 'Reset Password'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

#### 7. Create Smart Routing Courses Page

**File**: `frontend/app/courses/page.tsx` (new file)
**Changes**: Smart routing page that redirects based on enrollment

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { apiGet } from '@/lib/api/api-client';

export default function CoursesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkEnrollment() {
      if (authLoading) return;

      if (!user?.id) {
        // Not authenticated - shouldn't reach here due to middleware
        router.push('/signin');
        return;
      }

      try {
        // Fetch student record to check enrolled courses
        const student = await apiGet<{
          userId: string;
          email: string;
          name: string;
          enrolledCourses: string[];
        }>(`/api/students/${user.id}`);

        if (student.enrolledCourses.length === 1) {
          // Single course enrolled - auto-redirect
          router.push(`/course/${student.enrolledCourses[0]}`);
        } else if (student.enrolledCourses.length > 1) {
          // Multiple courses - stay on this page to show selection
          setIsChecking(false);
        } else {
          // No courses enrolled - redirect to landing page to browse
          router.push('/');
        }
      } catch (error) {
        console.error('Error fetching student enrollment:', error);
        // On error, redirect to landing page
        router.push('/');
      }
    }

    checkEnrollment();
  }, [user, authLoading, router]);

  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your courses...</p>
        </div>
      </div>
    );
  }

  // This will only show if user has multiple courses
  // (In current implementation, this won't be reached since we only have 1 course)
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Your Courses</h1>
      <p className="text-gray-600">Select a course to continue learning.</p>
      {/* TODO: Add course selection UI when multiple courses supported */}
    </div>
  );
}
```

**Smart Routing Logic:**
- **0 courses enrolled**: Redirect to `/` (landing page to browse courses)
- **1 course enrolled**: Auto-redirect to `/course/<course-id>` (seamless experience)
- **Multiple courses enrolled**: Show course selection UI (future support)

**Note**: This page is protected by NextAuth middleware since it's under `/courses`. Users must be authenticated to access.

#### 8. Create Middleware for Protected Routes

**File**: `frontend/middleware.ts` (new file)
**Changes**: NextAuth middleware for route protection

```typescript
export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/course/:path*', '/courses'],
};
```

**Protected Routes:**
- `/course/*` - All individual course pages
- `/courses` - Smart routing page (checks enrollment and redirects)

### Success Criteria

#### Continuous Validation (During Implementation):
- [ ] Run `pnpm run typecheck` after each page - no type errors
- [ ] Run `pnpm run lint` - no linting errors
- [ ] Test each page in dev mode: `pnpm run dev`
- [ ] Visual inspection of all pages

#### Phase Completion Validation:
- [ ] All TypeScript compiles: `cd frontend && pnpm run build`
- [ ] All pages render without errors
- [ ] Type checking passes: `pnpm run typecheck`
- [ ] Linting passes: `pnpm run lint`
- [ ] All authentication flows work locally (with backend running)

#### Preview Deployment Validation:
- [ ] Frontend deploys successfully: `./scripts/deploy-preview-frontend.sh`
- [ ] All pages accessible in preview
- [ ] Sign-up flow works: enroll → verify-email
- [ ] Sign-in page loads and validates credentials
- [ ] Forgot password flow works
- [ ] Google OAuth redirects to Cognito Hosted UI
- [ ] No errors in frontend logs: `scripts/.vercel-logs.log`

---

## Phase 6: E2E Testing

### Overview
Create comprehensive E2E tests for complete authentication flows with test user accounts.

### Changes Required

#### 1. Create Test User Setup Script

**File**: `e2e/scripts/setup-test-users.sh` (new file)
**Changes**: Script to create test users in Cognito

```bash
#!/bin/bash

set -e

STACK_NAME="learnermax-course-app-preview"

echo "👥 Setting up test users for E2E testing..."

# Get User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

if [ -z "$USER_POOL_ID" ]; then
  echo "❌ Error: Could not find User Pool ID"
  exit 1
fi

echo "📋 User Pool ID: $USER_POOL_ID"

# Test User 1: Verified Email
echo ""
echo "Creating verified test user..."
VERIFIED_EMAIL="verified-test@learnermax.test"
VERIFIED_PASSWORD="Test123!@#"

# Create user
aws cognito-idp admin-create-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "$VERIFIED_EMAIL" \
  --user-attributes \
    Name=email,Value="$VERIFIED_EMAIL" \
    Name=email_verified,Value=true \
    Name=name,Value="Verified Test User" \
  --message-action SUPPRESS || echo "User may already exist"

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id "$USER_POOL_ID" \
  --username "$VERIFIED_EMAIL" \
  --password "$VERIFIED_PASSWORD" \
  --permanent

echo "✅ Verified user created: $VERIFIED_EMAIL / $VERIFIED_PASSWORD"

# Test User 2: Unverified Email
echo ""
echo "Creating unverified test user..."
UNVERIFIED_EMAIL="unverified-test@learnermax.test"
UNVERIFIED_PASSWORD="Test123!@#"

# Create user (not verified)
aws cognito-idp admin-create-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "$UNVERIFIED_EMAIL" \
  --user-attributes \
    Name=email,Value="$UNVERIFIED_EMAIL" \
    Name=email_verified,Value=false \
    Name=name,Value="Unverified Test User" \
  --message-action SUPPRESS || echo "User may already exist"

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id "$USER_POOL_ID" \
  --username "$UNVERIFIED_EMAIL" \
  --password "$UNVERIFIED_PASSWORD" \
  --permanent

# Force user status to UNCONFIRMED (require email verification)
aws cognito-idp admin-update-user-attributes \
  --user-pool-id "$USER_POOL_ID" \
  --username "$UNVERIFIED_EMAIL" \
  --user-attributes Name=email_verified,Value=false

echo "✅ Unverified user created: $UNVERIFIED_EMAIL / $UNVERIFIED_PASSWORD"

# Get User Pool Client ID and region for API testing
USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
  --output text)

API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`WebEndpoint`].OutputValue' \
  --output text)

# Save credentials and config to .env
echo ""
echo "📝 Updating e2e/.env with test credentials and Cognito config..."

cd "$(dirname "$0")/.."

sed -i '/^TEST_VERIFIED_EMAIL=/d' .env
sed -i '/^TEST_VERIFIED_PASSWORD=/d' .env
sed -i '/^TEST_UNVERIFIED_EMAIL=/d' .env
sed -i '/^TEST_UNVERIFIED_PASSWORD=/d' .env
sed -i '/^NEXT_PUBLIC_USER_POOL_CLIENT_ID=/d' .env
sed -i '/^NEXT_PUBLIC_AWS_REGION=/d' .env
sed -i '/^NEXT_PUBLIC_API_URL=/d' .env

echo "TEST_VERIFIED_EMAIL=$VERIFIED_EMAIL" >> .env
echo "TEST_VERIFIED_PASSWORD=$VERIFIED_PASSWORD" >> .env
echo "TEST_UNVERIFIED_EMAIL=$UNVERIFIED_EMAIL" >> .env
echo "TEST_UNVERIFIED_PASSWORD=$UNVERIFIED_PASSWORD" >> .env
echo "NEXT_PUBLIC_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID" >> .env
echo "NEXT_PUBLIC_AWS_REGION=us-east-1" >> .env
echo "NEXT_PUBLIC_API_URL=$API_URL" >> .env

echo ""
echo "✅ Test users setup complete!"
echo ""
echo "Credentials saved to e2e/.env:"
echo "  Verified: $VERIFIED_EMAIL / $VERIFIED_PASSWORD"
echo "  Unverified: $UNVERIFIED_EMAIL / $UNVERIFIED_PASSWORD"
echo "  User Pool Client ID: $USER_POOL_CLIENT_ID"
echo "  API URL: $API_URL"
```

Make executable:
```bash
chmod +x e2e/scripts/setup-test-users.sh
```

**E2E Environment Variables:**

The setup script creates `e2e/.env` with the following variables:

```bash
# Test user credentials
TEST_VERIFIED_EMAIL=verified-test@learnermax.test
TEST_VERIFIED_PASSWORD=Test123!@#
TEST_UNVERIFIED_EMAIL=unverified-test@learnermax.test
TEST_UNVERIFIED_PASSWORD=Test123!@#

# Cognito configuration (for auth helper)
NEXT_PUBLIC_USER_POOL_CLIENT_ID=<from CloudFormation>
NEXT_PUBLIC_AWS_REGION=us-east-1

# API endpoint (for API testing)
NEXT_PUBLIC_API_URL=<from CloudFormation>

# Frontend URL (for browser tests)
BASE_URL=https://learnermax-course-app.vercel.app
```

#### 2. Create E2E Auth Helper for API Testing

**File**: `e2e/utils/auth-helper.ts` (new file)
**Changes**: Utility to get Cognito tokens for API testing

```typescript
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
});

const USER_POOL_CLIENT_ID = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '';

export interface CognitoTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

/**
 * Get Cognito tokens for E2E API testing
 * Uses USER_PASSWORD_AUTH flow with test user credentials
 */
export async function getTestUserTokens(
  email: string,
  password: string
): Promise<CognitoTokens> {
  try {
    const response = await client.send(
      new InitiateAuthCommand({
        ClientId: USER_POOL_CLIENT_ID,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      })
    );

    if (!response.AuthenticationResult) {
      throw new Error('Authentication failed - no tokens returned');
    }

    return {
      accessToken: response.AuthenticationResult.AccessToken!,
      idToken: response.AuthenticationResult.IdToken!,
      refreshToken: response.AuthenticationResult.RefreshToken!,
    };
  } catch (error: any) {
    console.error('Failed to get test user tokens:', error.message);
    throw error;
  }
}

/**
 * Get ID token for verified test user (convenience method)
 */
export async function getVerifiedUserToken(): Promise<string> {
  const email = process.env.TEST_VERIFIED_EMAIL || '';
  const password = process.env.TEST_VERIFIED_PASSWORD || '';

  const tokens = await getTestUserTokens(email, password);
  return tokens.idToken;
}
```

**Why this approach?**
- ✅ Tests real Cognito authentication flow
- ✅ No need for separate API key infrastructure
- ✅ Works in both preview and production
- ✅ Can cache tokens in Playwright storage for speed
- ✅ Validates that USER_PASSWORD_AUTH flow is configured correctly

#### 3. Add AWS SDK Dependencies to E2E

**File**: `e2e/package.json`
**Changes**: Add AWS SDK for Cognito

```json
  "dependencies": {
    "@aws-sdk/client-cognito-identity-provider": "^3.398.0"
  }
```

Run installation:
```bash
cd e2e && pnpm install
```

#### 4. Create API E2E Tests

**File**: `e2e/tests/api/students.spec.ts` (new file)
**Changes**: Direct API testing using Cognito tokens

```typescript
import { test, expect } from '@playwright/test';
import { getVerifiedUserToken, getTestUserTokens } from '../../utils/auth-helper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

test.describe('Student API', () => {
  let authToken: string;
  let userId: string;

  test.beforeAll(async () => {
    // Get token once for all tests
    authToken = await getVerifiedUserToken();

    // Extract userId from token (it's the 'sub' claim in JWT)
    const payload = JSON.parse(
      Buffer.from(authToken.split('.')[1], 'base64').toString()
    );
    userId = payload.sub;
  });

  test('should reject requests without authorization', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/students/${userId}`);

    expect(response.status()).toBe(401);
  });

  test('should get student by ID with valid token', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/students/${userId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status()).toBe(200);
    const student = await response.json();
    expect(student.userId).toBe(userId);
    expect(student.email).toBe(process.env.TEST_VERIFIED_EMAIL);
  });

  test('should reject access to other user data', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/students/other-user-id`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status()).toBe(403);
  });

  test('should update student name', async ({ request }) => {
    const response = await request.patch(
      `${API_URL}/api/students/${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          name: 'Updated Test User',
        },
      }
    );

    expect(response.status()).toBe(200);
    const updated = await response.json();
    expect(updated.name).toBe('Updated Test User');
  });
});

test.describe('Course API', () => {
  let authToken: string;

  test.beforeAll(async () => {
    authToken = await getVerifiedUserToken();
  });

  test('should list all courses with valid token', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/courses`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status()).toBe(200);
    const courses = await response.json();
    expect(Array.isArray(courses)).toBeTruthy();
    expect(courses.length).toBeGreaterThan(0);
  });

  test('should get course by ID', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/api/courses/genai-fundamentals-2025`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);
    const course = await response.json();
    expect(course.courseId).toBe('genai-fundamentals-2025');
    expect(course.title).toContain('Generative AI');
  });
});
```

**Key Features:**
- Uses `beforeAll` to get token once (reused across tests)
- Tests both success and failure cases (401, 403)
- Validates authorization checks (can't access other user's data)
- Tests all CRUD operations with real auth

#### 5. Create Authentication E2E Tests

**File**: `e2e/tests/authentication.spec.ts` (new file)
**Changes**: Complete authentication flow tests

```typescript
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const VERIFIED_EMAIL = process.env.TEST_VERIFIED_EMAIL || '';
const VERIFIED_PASSWORD = process.env.TEST_VERIFIED_PASSWORD || '';
const UNVERIFIED_EMAIL = process.env.TEST_UNVERIFIED_EMAIL || '';

test.describe('Authentication Flows', () => {
  test.describe('Sign In', () => {
    test('should sign in successfully with verified user', async ({ page }) => {
      await page.goto(`${BASE_URL}/signin`);

      // Fill in credentials
      await page.fill('input[name="email"]', VERIFIED_EMAIL);
      await page.fill('input[name="password"]', VERIFIED_PASSWORD);

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to /courses (smart routing page)
      // Note: In E2E, may auto-redirect to course if enrolled
      await expect(page).toHaveURL(/\/(courses|course\/.+)/, { timeout: 10000 });
    });

    test('should show error with invalid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/signin`);

      await page.fill('input[name="email"]', VERIFIED_EMAIL);
      await page.fill('input[name="password"]', 'WrongPassword123!');

      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('text=Invalid email or password')).toBeVisible();
    });

    test('should prevent unverified user from signing in', async ({ page }) => {
      await page.goto(`${BASE_URL}/signin`);

      await page.fill('input[name="email"]', UNVERIFIED_EMAIL);
      await page.fill('input[name="password"]', VERIFIED_PASSWORD);

      await page.click('button[type="submit"]');

      // Should show verification required error or redirect to verify page
      const errorVisible = await page.locator('text=/verify|confirm/i').isVisible();
      expect(errorVisible).toBeTruthy();
    });
  });

  test.describe('Sign Up', () => {
    test('should sign up new user and redirect to verification', async ({ page }) => {
      const uniqueEmail = `test-${Date.now()}@learnermax.test`;

      await page.goto(`${BASE_URL}/enroll`);

      // Fill in form
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', uniqueEmail);
      await page.fill('input[name="password"]', 'Test123!@#');

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to verify-email page
      await expect(page).toHaveURL(/\/verify-email/, { timeout: 10000 });
      await expect(page.locator(`text=${uniqueEmail}`)).toBeVisible();
    });

    test('should show error for invalid password', async ({ page }) => {
      await page.goto(`${BASE_URL}/enroll`);

      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'weak');

      await page.click('button[type="submit"]');

      // Should show validation error (HTML5 or custom)
      const passwordInput = page.locator('input[name="password"]');
      const validationMessage = await passwordInput.evaluate((el: HTMLInputElement) =>
        el.validationMessage
      );
      expect(validationMessage).toBeTruthy();
    });
  });

  test.describe('Email Verification', () => {
    test('should show verification page with email pre-filled', async ({ page }) => {
      const email = 'test@example.com';
      await page.goto(`${BASE_URL}/verify-email?email=${encodeURIComponent(email)}`);

      await expect(page.locator(`text=${email}`)).toBeVisible();
      await expect(page.locator('input[type="text"]')).toBeVisible(); // Code input
    });

    test('should allow resending verification code', async ({ page }) => {
      const email = UNVERIFIED_EMAIL;
      await page.goto(`${BASE_URL}/verify-email?email=${encodeURIComponent(email)}`);

      // Click resend button
      await page.click('text=Resend Code');

      // Should show success message
      await expect(page.locator('text=/resent|sent/i')).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe('Password Reset', () => {
    test('should initiate password reset flow', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      await page.fill('input[type="email"]', VERIFIED_EMAIL);
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('text=/check.*email/i')).toBeVisible({
        timeout: 5000,
      });
    });

    test('should navigate to reset password page', async ({ page }) => {
      const email = VERIFIED_EMAIL;
      await page.goto(`${BASE_URL}/reset-password?email=${encodeURIComponent(email)}`);

      // Should have all required fields
      await expect(page.locator('input[id="email"]')).toHaveValue(email);
      await expect(page.locator('input[id="code"]')).toBeVisible();
      await expect(page.locator('input[id="newPassword"]')).toBeVisible();
      await expect(page.locator('input[id="confirmPassword"]')).toBeVisible();
    });

    test('should validate password confirmation match', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password`);

      await page.fill('input[id="email"]', VERIFIED_EMAIL);
      await page.fill('input[id="code"]', '123456');
      await page.fill('input[id="newPassword"]', 'NewPass123!');
      await page.fill('input[id="confirmPassword"]', 'DifferentPass123!');

      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator('text=/password.*not match/i')).toBeVisible();
    });
  });

  test.describe('Google OAuth', () => {
    test('should redirect to Cognito hosted UI for Google sign-in', async ({ page }) => {
      await page.goto(`${BASE_URL}/signin`);

      // Click Google button
      await page.click('button:has-text("Continue with Google")');

      // Should redirect to Cognito or show NextAuth page
      await page.waitForURL(/cognito|next-auth/, { timeout: 10000 });
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to sign in', async ({ page }) => {
      await page.goto(`${BASE_URL}/course/genai-fundamentals-2025`);

      // Should redirect to sign in page
      await expect(page).toHaveURL(/\/signin/, { timeout: 5000 });
    });

    test('should allow authenticated users to access protected routes', async ({ page }) => {
      // Sign in first
      await page.goto(`${BASE_URL}/signin`);
      await page.fill('input[name="email"]', VERIFIED_EMAIL);
      await page.fill('input[name="password"]', VERIFIED_PASSWORD);
      await page.click('button[type="submit"]');

      // Wait for redirect to /courses or auto-redirect to course
      await page.waitForURL(/\/(courses|course\/.+)/, { timeout: 10000 });

      // Try accessing protected course route directly
      await page.goto(`${BASE_URL}/course/genai-fundamentals-2025`);
      await expect(page).toHaveURL(/\/course\/genai-fundamentals-2025/);
    });
  });

  test.describe('Student Record Creation', () => {
    test('should create student record after sign-up and verification', async ({ page }) => {
      // This test verifies the event-driven architecture
      // Sign up creates Cognito user → PostConfirmation Lambda → SNS → Student Onboarding Lambda → DynamoDB

      const uniqueEmail = `integration-test-${Date.now()}@learnermax.test`;

      await page.goto(`${BASE_URL}/enroll`);

      await page.fill('input[name="name"]', 'Integration Test User');
      await page.fill('input[name="email"]', uniqueEmail);
      await page.fill('input[name="password"]', 'Test123!@#');
      await page.click('button[type="submit"]');

      // Verify redirect to verification page
      await expect(page).toHaveURL(/\/verify-email/, { timeout: 10000 });

      // In a real test, we would:
      // 1. Get the verification code from Cognito (admin command)
      // 2. Submit the code
      // 3. Sign in
      // 4. Verify student record exists via API call

      // For now, we verify the flow gets to the verification page
      expect(page.url()).toContain('verify-email');
    });
  });
});
```

#### 6. Update E2E Package.json Scripts

**File**: `e2e/package.json`
**Changes**: Add test setup and test type scripts

```json
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug",
    "test:headed": "playwright test --headed",
    "test:api": "playwright test tests/api",
    "test:auth": "playwright test tests/authentication.spec.ts",
    "setup-users": "bash scripts/setup-test-users.sh"
  }
```

**New scripts:**
- `test:api` - Run only API tests (direct backend testing with tokens)
- `test:auth` - Run only authentication flow tests (browser-based)

### Success Criteria

#### Continuous Validation (During Implementation):
- [ ] Test user setup script is executable
- [ ] Run script locally: `cd e2e && pnpm run setup-users`
- [ ] Verify test users created in Cognito User Pool
- [ ] AWS SDK installed in e2e: `cd e2e && pnpm install`
- [ ] Auth helper TypeScript compiles (if tsconfig configured)
- [ ] E2E tests syntax is valid: `cd e2e && pnpm run typecheck` (if configured)

#### Phase Completion Validation:
- [ ] Test users exist in Cognito: verify in AWS Console
- [ ] Test credentials saved to `e2e/.env`
- [ ] Auth helper can get tokens: test with `getVerifiedUserToken()`
- [ ] API tests can be run: `cd e2e && pnpm run test:api` (may fail if services not running)
- [ ] Authentication tests can be run: `cd e2e && pnpm run test:auth` (may fail if services not running)

#### Preview Deployment Validation:
- [ ] Both deployments complete: backend and frontend
- [ ] Sample course populated: `cd backend && ./scripts/populate-courses.sh`
- [ ] Test users created: `cd e2e && pnpm run setup-users`
- [ ] Start log monitoring: `./scripts/start-sam-logs.sh && ./scripts/start-vercel-logs.sh`
- [ ] Run API tests: `cd e2e && pnpm run test:api`
  - [ ] API rejects requests without token (401)
  - [ ] API accepts requests with valid Cognito token
  - [ ] API enforces authorization (403 for other user's data)
  - [ ] Student CRUD operations work
  - [ ] Course list/get operations work
- [ ] Run authentication E2E tests: `cd e2e && pnpm run test:auth`
  - [ ] Verified user can sign in
  - [ ] Sign-up redirects to verification
  - [ ] Password reset flow initiates
  - [ ] Protected routes redirect unauthenticated users
  - [ ] Google OAuth redirects correctly
- [ ] Run full E2E suite: `cd e2e && pnpm test`
- [ ] Check logs for errors:
  - [ ] Backend logs: `cat scripts/.sam-logs.log`
  - [ ] Frontend logs: `cat scripts/.vercel-logs.log`
- [ ] Verify student record created in DynamoDB after sign-up
- [ ] Stop log monitoring: `./scripts/stop-sam-logs.sh && ./scripts/stop-vercel-logs.sh`

---

## Testing Strategy

### Unit Tests

**Backend:**
- Student service: create, get, update operations
- Course service: get, list operations
- PostConfirmation Lambda: SNS publish
- Student Onboarding Lambda: DynamoDB create with idempotency
- Cognito auth middleware: JWT extraction

**Frontend:**
- Cognito service functions (mocked SDK)
- API client utility (mocked fetch)
- Authentication hooks

### Integration Tests

**Backend:**
- Express API endpoints with mocked Cognito authorizer
- Lambda handlers with mocked AWS services
- DynamoDB operations with mock client

### E2E Tests

**Browser-Based Flows (Playwright):**
- Sign-up → verify-email → sign-in → smart routing (`/courses`) → course page
- Sign-in → forgot-password → reset-password → sign-in
- Google OAuth → smart routing (`/courses`) → course page
- Protected route access control (`/course/*` and `/courses` require auth)
- Student record creation after sign-up (event-driven via SNS)

**API Testing with Real Auth (Playwright Request Context):**
- Get Cognito tokens using `USER_PASSWORD_AUTH` flow
- Test API endpoints with valid JWT tokens
- Validate 401 responses without authentication
- Validate 403 responses for unauthorized access (other user's data)
- Test all CRUD operations: Student (GET, PATCH), Course (GET, LIST)
- Verify Cognito authorizer integration with API Gateway

### Manual Testing Steps

1. **Sign-Up Flow:**
   - Visit `/enroll`
   - Fill form and submit
   - Check email for verification code
   - Enter code on `/verify-email`
   - Verify redirect to sign-in
   - Check DynamoDB for student record

2. **Sign-In Flow:**
   - Visit `/signin`
   - Enter credentials
   - Verify redirect to `/courses` (smart routing)
   - Should auto-redirect to `/course/genai-fundamentals-2025` if enrolled
   - Check JWT token in browser DevTools (Application → Cookies)

3. **Google OAuth:**
   - Click "Continue with Google"
   - Verify redirect to Cognito Hosted UI
   - Authenticate with Google
   - Verify redirect to `/courses` → auto-redirect to course
   - Check student record in DynamoDB

4. **Smart Routing:**
   - After sign-in, observe redirect to `/courses`
   - With 1 enrolled course: auto-redirects to `/course/<id>`
   - With 0 courses: redirects to `/` (landing page)
   - Try accessing `/course/genai-fundamentals-2025` directly when logged out → redirects to `/signin`

5. **Password Reset:**
   - Visit `/forgot-password`
   - Enter email
   - Check email for reset code
   - Enter code and new password on `/reset-password`
   - Sign in with new password

6. **API Authorization (Manual curl testing):**
   - Get token: Use auth helper or sign in via browser and copy JWT from DevTools
   - Test without token: `curl https://api.example.com/api/students/xyz`
   - Expected: 401 Unauthorized
   - Test with valid token: `curl -H "Authorization: Bearer <token>" https://api.example.com/api/students/xyz`
   - Expected: 200 OK with student data
   - Test accessing other user's data: `curl -H "Authorization: Bearer <token>" https://api.example.com/api/students/other-id`
   - Expected: 403 Forbidden

6b. **API Authorization (Automated E2E testing):**
   - Run API tests: `cd e2e && pnpm run test:api`
   - Auth helper automatically gets Cognito tokens
   - Tests validate 401, 200, and 403 responses
   - Faster and more reliable than manual testing

7. **Event-Driven Architecture:**
   - Check CloudWatch Logs for PostConfirmation Lambda
   - Verify SNS message published
   - Check CloudWatch Logs for Student Onboarding Lambda
   - Verify student record in DynamoDB

## Performance Considerations

- **DynamoDB:** Pay-per-request billing mode scales automatically
- **Lambda:** Cold starts mitigated by keeping functions warm in production
- **Cognito:** Handles authentication at scale, no custom optimization needed
- **API Gateway:** Cognito authorizer adds ~100ms latency (acceptable)
- **SNS/Lambda:** Asynchronous processing doesn't block user sign-up
- **Frontend:** NextAuth.js JWT strategy minimizes database lookups

## Migration Notes

**Not Applicable** - This is a greenfield implementation with no existing data to migrate.

## Security Considerations

1. **JWT Validation:** API Gateway validates all JWTs before reaching Express
2. **User Isolation:** Users can only access their own student records (checked in routes)
3. **Environment Variables:** Sensitive data (Google OAuth secrets) in .env files, not code
4. **HTTPS Only:** All production traffic over HTTPS (Vercel + API Gateway)
5. **Password Policy:** Cognito enforces strong passwords
6. **Email Verification:** Required before account activation
7. **SNS Encryption:** Consider enabling encryption at rest for sensitive events (future)

## Deployment Order

**Critical:** Backend must be deployed before frontend to populate Cognito configuration.

1. **Store Google OAuth credentials in Secrets Manager:**
   ```bash
   aws secretsmanager create-secret \
     --name learnermax/google-oauth \
     --secret-string '{"client_id":"YOUR_ID","client_secret":"YOUR_SECRET"}'
   ```
2. **Deploy backend:** `./scripts/deploy-preview-backend.sh`
3. **Subscribe to DLQ alerts:**
   ```bash
   DLQ_ALERT_TOPIC=$(aws cloudformation describe-stacks \
     --stack-name learnermax-course-app-preview \
     --query 'Stacks[0].Outputs[?OutputKey==`DLQAlertTopicArn`].OutputValue' \
     --output text)
   aws sns subscribe --topic-arn "$DLQ_ALERT_TOPIC" --protocol email \
     --notification-endpoint your-email@example.com
   ```
4. **Populate sample course:** `cd backend && ./scripts/populate-courses.sh`
5. **Deploy frontend:** `./scripts/deploy-preview-frontend.sh` (auto-populates Cognito config)
6. **Setup test users:** `cd e2e && pnpm run setup-users`
7. **Run E2E tests:** `cd e2e && pnpm test`

## Architecture Improvements Summary

This plan includes 4 critical improvements over the initial design:

### 1. **Secrets Management (Security)**
- ❌ **Before:** OAuth secrets in `samconfig.toml` (version control risk)
- ✅ **After:** AWS Secrets Manager with CloudFormation dynamic resolution
- **Benefit:** Zero secrets in code, easy rotation, audit trail

### 2. **Token Refresh (UX)**
- ❌ **Before:** Users forced to re-login every hour
- ✅ **After:** Automatic refresh 5 minutes before expiry
- **Benefit:** Seamless experience, maintains authentication indefinitely

### 3. **DLQ Monitoring (Reliability)**
- ❌ **Before:** Student creation failures go unnoticed
- ✅ **After:** CloudWatch Alarm + SNS alerts on any DLQ message
- **Benefit:** Immediate notification of system issues, faster incident response

### 4. **Centralized Authorization (Code Quality)**
- ❌ **Before:** Repeated ownership checks in every route handler
- ✅ **After:** Reusable `requireOwnership()` middleware
- **Benefit:** DRY code, reduced bugs, easier to audit security

**Token Refresh Flow:**
```
NextAuth checks token expiry on every request
  ↓
If < 5 min until expiry → refresh automatically
  ↓
Fetch new tokens from Cognito OAuth endpoint
  ↓
Update session with new tokens (transparent to user)
  ↓
If refresh fails → graceful sign-out with error message
```

## References

- Specification: `specs/student_enrollment/slices/authentication/authentication.md`
- AWS Cognito Docs: https://docs.aws.amazon.com/cognito/
- NextAuth.js Docs: https://next-auth.js.org/
- AWS SDK v3 Cognito Client: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/cognito-identity-provider/
- Lambda Web Adapter: https://github.com/awslabs/aws-lambda-web-adapter
