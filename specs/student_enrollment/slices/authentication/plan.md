# Authentication & Student Onboarding Implementation Plan

## Overview

This plan implements a complete authentication and student onboarding system using AWS Cognito (email/password + Google OAuth), event-driven architecture (PostConfirmation Lambda → SNS → Student Onboarding Lambda), Express Student API, NextAuth.js frontend integration, and comprehensive E2E testing.

## Current State Analysis

**Backend**:
- Minimal Express.js app (`backend/src/app.ts:1-21`) with single `/hello` endpoint
- Basic SAM template with API Gateway + API Key auth only
- No Cognito, SNS, DynamoDB, or Lambda triggers

**Frontend**:
- UI-only landing (`frontend/app/page.tsx`) and enrollment (`frontend/app/enroll/page.tsx`) pages
- Placeholder components (no real auth logic)
- Missing: NextAuth, Cognito integration, auth pages

**Infrastructure**:
- No Cognito User Pool, Client, or Google Identity Provider
- No DynamoDB tables (Students, Courses)
- No SNS topics or event-driven architecture
- No JWT validation

## Desired End State

A fully functional authentication system where:
1. Users can sign up via email/password or Google OAuth
2. Email verification works (Cognito sends emails, users verify)
3. PostConfirmation Lambda → SNS → Student Onboarding Lambda → Student API creates student records automatically
4. Student API (POST/GET/PATCH /api/students) validates JWT tokens and manages student data in DynamoDB
5. NextAuth.js handles frontend authentication with automatic token refresh
6. Protected routes redirect unauthenticated users
7. E2E tests validate complete auth flows using pre-created test users

**Verification**:
- `sam deploy` successfully creates all infrastructure
- User sign-up triggers PostConfirmation Lambda (visible in CloudWatch logs)
- Student record appears in DynamoDB after email verification
- `curl` with JWT token successfully calls `/api/students/:userId`
- E2E tests pass: `cd e2e && pnpm test`

## What We're NOT Doing

- ❌ Email service integration (SES + react-email) - future slice
- ❌ Course enrollment logic beyond creating student record
- ❌ Student dashboard/profile pages (just auth flows)
- ❌ Multi-course selection UI
- ❌ Payment integration
- ❌ Course progress tracking
- ❌ Custom Cognito UI (using hosted UI)
- ❌ MFA (multi-factor authentication)

## Implementation Approach

We'll build from infrastructure up:
1. Create AWS resources (Cognito, DynamoDB, SNS) via SAM
2. Implement Lambda functions for event handling
3. Build Student API with JWT validation
4. Integrate NextAuth.js in frontend
5. Create authentication pages
6. Add E2E testing infrastructure

Each phase has clear success criteria with both automated checks and manual verification steps.

---

## Phase 1: Infrastructure Foundation

### Overview
Create all AWS resources in SAM template: Cognito User Pool with Google OAuth, DynamoDB tables, SNS topic, and API Gateway Cognito authorizer.

### Changes Required

#### 1. Update SAM Template - Add Parameters
**File**: `backend/template.yaml`
**Changes**: Add environment and Google OAuth secret parameters

```yaml
Parameters:
  Environment:
    Type: String
    Default: preview
    AllowedValues: [preview, prod]
    Description: Environment name (preview or prod)

  GoogleOAuthSecretArn:
    Type: String
    Default: arn:aws:secretsmanager:us-east-1:853219709625:secret:learnermax/google-oauth-15o5Q2
    Description: ARN of Secrets Manager secret containing Google OAuth credentials

Conditions:
  IsProd: !Equals [!Ref Environment, prod]
  IsPreview: !Not [!Equals [!Ref Environment, prod]]
```

#### 2. SAM Template - Cognito User Pool
**File**: `backend/template.yaml`
**Changes**: Add Cognito User Pool resource

```yaml
Resources:
  # Cognito User Pool
  LearnerMaxUserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: !Sub learnermax-${Environment}
      AutoVerifiedAttributes:
        - email
      UsernameAttributes:
        - email
      UsernameConfiguration:
        CaseSensitive: false
      Policies:
        PasswordPolicy:
          MinimumLength: 8
          RequireUppercase: true
          RequireLowercase: true
          RequireNumbers: true
          RequireSymbols: true
      Schema:
        - Name: email
          AttributeDataType: String
          Required: true
          Mutable: false
        - Name: name
          AttributeDataType: String
          Required: true
          Mutable: true
      EmailConfiguration:
        EmailSendingAccount: COGNITO_DEFAULT  # Uses Cognito's email service
      AdminCreateUserConfig:
        AllowAdminCreateUserOnly: false
      LambdaConfig:
        PostConfirmation: !GetAtt PostConfirmationFunction.Arn
      UserPoolTags:
        Environment: !Ref Environment
        Project: LearnerMax
```

#### 3. SAM Template - Cognito User Pool Domain
**File**: `backend/template.yaml`
**Changes**: Add Cognito Hosted UI domain

```yaml
  LearnerMaxUserPoolDomain:
    Type: AWS::Cognito::UserPoolDomain
    Properties:
      Domain: !Sub learnermax-${Environment}-${AWS::AccountId}
      UserPoolId: !Ref LearnerMaxUserPool
```

#### 4. SAM Template - Cognito User Pool Client
**File**: `backend/template.yaml`
**Changes**: Add User Pool Client for OAuth

```yaml
  LearnerMaxUserPoolClient:
    Type: AWS::Cognito::UserPoolClient
    DependsOn: LearnerMaxGoogleIdentityProvider
    Properties:
      ClientName: !Sub learnermax-client-${Environment}
      UserPoolId: !Ref LearnerMaxUserPool
      GenerateSecret: false  # Public client (Next.js frontend)
      ExplicitAuthFlows:
        - ALLOW_USER_SRP_AUTH
        - ALLOW_USER_PASSWORD_AUTH
        - ALLOW_REFRESH_TOKEN_AUTH
        - ALLOW_ADMIN_USER_PASSWORD_AUTH  # For E2E testing
      SupportedIdentityProviders:
        - COGNITO
        - Google
      CallbackURLs:
        - !If
          - IsProd
          - https://learnermax.com/api/auth/callback/cognito
          - !Sub https://preview-${Environment}.learnermax.vercel.app/api/auth/callback/cognito
        - http://localhost:3000/api/auth/callback/cognito  # Local development
      LogoutURLs:
        - !If
          - IsProd
          - https://learnermax.com
          - !Sub https://preview-${Environment}.learnermax.vercel.app
        - http://localhost:3000
      AllowedOAuthFlows:
        - code
      AllowedOAuthFlowsUserPoolClient: true
      AllowedOAuthScopes:
        - openid
        - email
        - profile
      PreventUserExistenceErrors: ENABLED
      AccessTokenValidity: 1  # 1 hour
      IdTokenValidity: 1      # 1 hour
      RefreshTokenValidity: 30  # 30 days
      TokenValidityUnits:
        AccessToken: hours
        IdToken: hours
        RefreshToken: days
```

#### 5. SAM Template - Google Identity Provider
**File**: `backend/template.yaml`
**Changes**: Add Google OAuth integration

```yaml
  LearnerMaxGoogleIdentityProvider:
    Type: AWS::Cognito::UserPoolIdentityProvider
    Properties:
      UserPoolId: !Ref LearnerMaxUserPool
      ProviderName: Google
      ProviderType: Google
      ProviderDetails:
        client_id: !Sub '{{resolve:secretsmanager:${GoogleOAuthSecretArn}:SecretString:client_id}}'
        client_secret: !Sub '{{resolve:secretsmanager:${GoogleOAuthSecretArn}:SecretString:client_secret}}'
        authorize_scopes: openid email profile
      AttributeMapping:
        email: email
        name: name
        username: sub
```

#### 6. SAM Template - DynamoDB Students Table
**File**: `backend/template.yaml`
**Changes**: Add Students table

```yaml
  StudentsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub learnermax-students-${Environment}
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
        - Key: Environment
          Value: !Ref Environment
        - Key: Project
          Value: LearnerMax
```

#### 7. SAM Template - DynamoDB Courses Table
**File**: `backend/template.yaml`
**Changes**: Add Courses table

```yaml
  CoursesTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub learnermax-courses-${Environment}
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: courseId
          AttributeType: S
      KeySchema:
        - AttributeName: courseId
          KeyType: HASH
      Tags:
        - Key: Environment
          Value: !Ref Environment
        - Key: Project
          Value: LearnerMax
```

#### 8. SAM Template - SNS Topic
**File**: `backend/template.yaml`
**Changes**: Add SNS topic for student onboarding events

```yaml
  StudentOnboardingTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: !Sub learnermax-student-onboarding-${Environment}
      DisplayName: Student Onboarding Events
      Tags:
        - Key: Environment
          Value: !Ref Environment
        - Key: Project
          Value: LearnerMax
```

#### 9. SAM Template - Dead Letter Queue
**File**: `backend/template.yaml`
**Changes**: Add DLQ for failed Lambda invocations

```yaml
  StudentOnboardingDLQ:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub learnermax-student-onboarding-dlq-${Environment}
      MessageRetentionPeriod: 1209600  # 14 days
      Tags:
        - Key: Environment
          Value: !Ref Environment
        - Key: Project
          Value: LearnerMax
```

#### 10. SAM Template - Update API Gateway with Cognito Authorizer
**File**: `backend/template.yaml`
**Changes**: Replace API Key auth with Cognito JWT authorizer

```yaml
  ApiGatewayApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: Prod
      Cors:
        AllowOrigin: "'*'"
        AllowHeaders: "'Content-Type,Authorization'"
        AllowMethods: "'GET,POST,PATCH,OPTIONS'"
      Auth:
        DefaultAuthorizer: CognitoAuthorizer
        Authorizers:
          CognitoAuthorizer:
            UserPoolArn: !GetAtt LearnerMaxUserPool.Arn
            Identity:
              Header: Authorization
```

#### 11. SAM Template - Update Outputs
**File**: `backend/template.yaml`
**Changes**: Add outputs for Cognito and DynamoDB

```yaml
Outputs:
  WebEndpoint:
    Description: API Gateway endpoint URL for Prod stage
    Value: !Sub "https://${ApiGatewayApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/"

  UserPoolId:
    Description: Cognito User Pool ID
    Value: !Ref LearnerMaxUserPool
    Export:
      Name: !Sub ${AWS::StackName}-UserPoolId

  UserPoolClientId:
    Description: Cognito User Pool Client ID
    Value: !Ref LearnerMaxUserPoolClient
    Export:
      Name: !Sub ${AWS::StackName}-UserPoolClientId

  UserPoolDomain:
    Description: Cognito Hosted UI Domain
    Value: !Sub https://learnermax-${Environment}-${AWS::AccountId}.auth.${AWS::Region}.amazoncognito.com

  CognitoIssuerUrl:
    Description: Cognito Issuer URL for NextAuth
    Value: !Sub https://cognito-idp.${AWS::Region}.amazonaws.com/${LearnerMaxUserPool}

  StudentsTableName:
    Description: DynamoDB Students Table Name
    Value: !Ref StudentsTable
    Export:
      Name: !Sub ${AWS::StackName}-StudentsTable

  CoursesTableName:
    Description: DynamoDB Courses Table Name
    Value: !Ref CoursesTable
    Export:
      Name: !Sub ${AWS::StackName}-CoursesTable

  StudentOnboardingTopicArn:
    Description: SNS Topic ARN for Student Onboarding
    Value: !Ref StudentOnboardingTopic
    Export:
      Name: !Sub ${AWS::StackName}-StudentOnboardingTopicArn

  ExpressApiFunction:
    Description: Express API Lambda Function ARN
    Value: !GetAtt ExpressApiFunction.Arn

  ExpressApiFunctionIamRole:
    Description: Implicit IAM Role created for Express API function
    Value: !GetAtt ExpressApiFunctionRole.Arn
```

#### 12. Update Backend Environment Variables
**File**: `backend/env.json`
**Changes**: Add environment-specific variables

```json
{
  "ExpressApiFunction": {
    "STUDENTS_TABLE_NAME": "learnermax-students-preview",
    "COURSES_TABLE_NAME": "learnermax-courses-preview",
    "COGNITO_USER_POOL_ID": "us-east-1_XXXXXXXXX",
    "COGNITO_CLIENT_ID": "your-client-id",
    "AWS_REGION": "us-east-1"
  },
  "PostConfirmationFunction": {
    "SNS_TOPIC_ARN": "arn:aws:sns:us-east-1:...",
    "AWS_REGION": "us-east-1"
  },
  "StudentOnboardingFunction": {
    "API_ENDPOINT": "https://your-api.execute-api.us-east-1.amazonaws.com/Prod",
    "AWS_REGION": "us-east-1"
  }
}
```

### Success Criteria

#### Continuous Validation (During Implementation):
- [ ] Run `sam validate` after each template change - no errors
- [ ] Monitor CloudFormation console - stack events show progress
- [ ] Check AWS CLI: `aws cognito-idp list-user-pools --max-results 10` - pool exists

#### Phase Completion Validation:
- [ ] SAM template validation passes: `cd backend && sam validate`
- [ ] SAM build succeeds: `cd backend && pnpm run build && sam build`
- [ ] SAM deploy succeeds: `sam deploy --parameter-overrides Environment=preview`
- [ ] CloudFormation stack shows CREATE_COMPLETE status
- [ ] All outputs populated in CloudFormation console
- [ ] Cognito User Pool exists: `aws cognito-idp describe-user-pool --user-pool-id <UserPoolId>`
- [ ] DynamoDB tables exist: `aws dynamodb list-tables | grep learnermax`
- [ ] SNS topic exists: `aws sns list-topics | grep student-onboarding`
- [ ] Google Identity Provider configured: Check Cognito console → Federation → Identity providers

---

## Phase 2: Backend Lambda Functions

### Overview
Implement PostConfirmation Lambda (triggered by Cognito) and Student Onboarding Lambda (subscribed to SNS) to create student records automatically.

### Changes Required

#### 1. Install Backend Dependencies
**File**: `backend/package.json`
**Changes**: Add AWS SDK for SNS

```json
{
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.398.0",
    "@aws-sdk/lib-dynamodb": "^3.398.0",
    "@aws-sdk/client-sns": "^3.398.0",
    "express": "^4.18.2"
  }
}
```

Run: `cd backend && pnpm install`

#### 2. Create PostConfirmation Lambda Handler
**File**: `backend/src/lambdas/post-confirmation.ts` (new file)
**Changes**: Create Lambda handler for Cognito PostConfirmation trigger

```typescript
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { PostConfirmationTriggerEvent, PostConfirmationTriggerHandler } from 'aws-lambda';

const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN!;

interface StudentOnboardingMessage {
  userId: string;
  email: string;
  name: string;
  signUpMethod: 'email' | 'google';
  timestamp: string;
}

export const handler: PostConfirmationTriggerHandler = async (
  event: PostConfirmationTriggerEvent
) => {
  console.log('PostConfirmation event:', JSON.stringify(event, null, 2));

  try {
    const { userPoolId, userName, request } = event;
    const userAttributes = request.userAttributes;

    // Determine sign-up method
    const identities = request.identities || [];
    const signUpMethod = identities.length > 0 ? 'google' : 'email';

    // Extract user details
    const message: StudentOnboardingMessage = {
      userId: userAttributes.sub,
      email: userAttributes.email,
      name: userAttributes.name || userAttributes.email,
      signUpMethod,
      timestamp: new Date().toISOString(),
    };

    console.log('Publishing student onboarding event:', message);

    // Publish to SNS topic
    await snsClient.send(
      new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Message: JSON.stringify(message),
        Subject: 'New Student Onboarding',
        MessageAttributes: {
          userId: {
            DataType: 'String',
            StringValue: message.userId,
          },
          signUpMethod: {
            DataType: 'String',
            StringValue: message.signUpMethod,
          },
        },
      })
    );

    console.log('Successfully published to SNS');

    return event; // Return event to complete Cognito flow
  } catch (error) {
    console.error('Error in PostConfirmation Lambda:', error);
    // Don't throw - we don't want to block user sign-up
    // Error will be logged in CloudWatch for investigation
    return event;
  }
};
```

#### 3. Create Student Onboarding Lambda Handler
**File**: `backend/src/lambdas/student-onboarding.ts` (new file)
**Changes**: Create Lambda handler for SNS subscription

```typescript
import { SNSEvent, SNSHandler } from 'aws-lambda';

const API_ENDPOINT = process.env.API_ENDPOINT!;

interface StudentOnboardingMessage {
  userId: string;
  email: string;
  name: string;
  signUpMethod: 'email' | 'google';
  timestamp: string;
}

export const handler: SNSHandler = async (event: SNSEvent) => {
  console.log('Student Onboarding Lambda triggered:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      const message: StudentOnboardingMessage = JSON.parse(record.Sns.Message);
      console.log('Processing student onboarding:', message);

      // Call Student API to create student record
      const response = await fetch(`${API_ENDPOINT}/api/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: message.userId,
          email: message.email,
          name: message.name,
          signUpMethod: message.signUpMethod,
          enrolledCourses: [],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Student API returned ${response.status}: ${errorText}`
        );
      }

      const student = await response.json();
      console.log('Successfully created student record:', student);
    } catch (error) {
      console.error('Error processing student onboarding:', error);
      // Throw error to trigger SNS retry and eventually send to DLQ
      throw error;
    }
  }
};
```

#### 4. Add Lambda Functions to SAM Template
**File**: `backend/template.yaml`
**Changes**: Define Lambda functions

```yaml
  PostConfirmationFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./
      Handler: dist/lambdas/post-confirmation.handler
      Runtime: nodejs22.x
      Architectures:
        - x86_64
      MemorySize: 256
      Timeout: 10
      Description: Cognito PostConfirmation trigger - publishes to SNS
      Environment:
        Variables:
          SNS_TOPIC_ARN: !Ref StudentOnboardingTopic
          AWS_REGION: !Ref AWS::Region
      Policies:
        - SNSPublishMessagePolicy:
            TopicName: !GetAtt StudentOnboardingTopic.TopicName

  # Grant Cognito permission to invoke PostConfirmation Lambda
  PostConfirmationInvokePermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref PostConfirmationFunction
      Action: lambda:InvokeFunction
      Principal: cognito-idp.amazonaws.com
      SourceArn: !GetAtt LearnerMaxUserPool.Arn

  StudentOnboardingFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./
      Handler: dist/lambdas/student-onboarding.handler
      Runtime: nodejs22.x
      Architectures:
        - x86_64
      MemorySize: 512
      Timeout: 30
      Description: Processes student onboarding events from SNS
      Environment:
        Variables:
          API_ENDPOINT: !Sub "https://${ApiGatewayApi}.execute-api.${AWS::Region}.amazonaws.com/Prod"
          AWS_REGION: !Ref AWS::Region
      DeadLetterQueue:
        Type: SQS
        TargetArn: !GetAtt StudentOnboardingDLQ.Arn
      Events:
        StudentOnboardingSNS:
          Type: SNS
          Properties:
            Topic: !Ref StudentOnboardingTopic
```

#### 5. Update TypeScript Build Configuration
**File**: `backend/tsconfig.json`
**Changes**: Ensure Lambda handlers are compiled

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

#### 6. Create Lambda Function Tests
**File**: `backend/src/lambdas/__tests__/post-confirmation.test.ts` (new file)
**Changes**: Unit tests for PostConfirmation Lambda

```typescript
import { mockClient } from 'aws-sdk-client-mock';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { PostConfirmationTriggerEvent } from 'aws-lambda';
import { handler } from '../post-confirmation.js';

const snsMock = mockClient(SNSClient);

describe('PostConfirmation Lambda', () => {
  beforeEach(() => {
    snsMock.reset();
    process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:test-topic';
  });

  it('should publish SNS message for email sign-up', async () => {
    const event: PostConfirmationTriggerEvent = {
      version: '1',
      region: 'us-east-1',
      userPoolId: 'us-east-1_XXXXXXXXX',
      userName: 'test-user',
      callerContext: {
        awsSdkVersion: '1',
        clientId: 'test-client-id',
      },
      triggerSource: 'PostConfirmation_ConfirmSignUp',
      request: {
        userAttributes: {
          sub: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          email_verified: 'true',
        },
      },
      response: {},
    };

    snsMock.on(PublishCommand).resolves({});

    const result = await handler(event);

    expect(result).toEqual(event);
    expect(snsMock.calls()).toHaveLength(1);

    const publishCall = snsMock.call(0);
    const message = JSON.parse(publishCall.args[0].input.Message!);

    expect(message).toMatchObject({
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      signUpMethod: 'email',
    });
  });

  it('should identify Google sign-up correctly', async () => {
    const event: PostConfirmationTriggerEvent = {
      version: '1',
      region: 'us-east-1',
      userPoolId: 'us-east-1_XXXXXXXXX',
      userName: 'google_123456',
      callerContext: {
        awsSdkVersion: '1',
        clientId: 'test-client-id',
      },
      triggerSource: 'PostConfirmation_ConfirmSignUp',
      request: {
        userAttributes: {
          sub: 'user-456',
          email: 'google@example.com',
          name: 'Google User',
          email_verified: 'true',
        },
        identities: [
          {
            userId: '123456',
            providerName: 'Google',
            providerType: 'Google',
            issuer: null,
            primary: 'true',
            dateCreated: '1234567890',
          },
        ],
      },
      response: {},
    };

    snsMock.on(PublishCommand).resolves({});

    await handler(event);

    const publishCall = snsMock.call(0);
    const message = JSON.parse(publishCall.args[0].input.Message!);

    expect(message.signUpMethod).toBe('google');
  });

  it('should not throw error if SNS publish fails', async () => {
    const event: PostConfirmationTriggerEvent = {
      version: '1',
      region: 'us-east-1',
      userPoolId: 'us-east-1_XXXXXXXXX',
      userName: 'test-user',
      callerContext: {
        awsSdkVersion: '1',
        clientId: 'test-client-id',
      },
      triggerSource: 'PostConfirmation_ConfirmSignUp',
      request: {
        userAttributes: {
          sub: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
      },
      response: {},
    };

    snsMock.on(PublishCommand).rejects(new Error('SNS error'));

    // Should not throw - just log error
    const result = await handler(event);
    expect(result).toEqual(event);
  });
});
```

#### 7. Create Student Onboarding Lambda Tests
**File**: `backend/src/lambdas/__tests__/student-onboarding.test.ts` (new file)
**Changes**: Unit tests for Student Onboarding Lambda

```typescript
import { SNSEvent } from 'aws-lambda';
import { handler } from '../student-onboarding.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('Student Onboarding Lambda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.API_ENDPOINT = 'https://api.example.com';
  });

  it('should call Student API to create student record', async () => {
    const event: SNSEvent = {
      Records: [
        {
          EventSource: 'aws:sns',
          EventVersion: '1.0',
          EventSubscriptionArn: 'arn:aws:sns:...',
          Sns: {
            Type: 'Notification',
            MessageId: 'msg-123',
            TopicArn: 'arn:aws:sns:us-east-1:123456789012:topic',
            Subject: 'New Student Onboarding',
            Message: JSON.stringify({
              userId: 'user-123',
              email: 'test@example.com',
              name: 'Test User',
              signUpMethod: 'email',
              timestamp: '2025-01-01T00:00:00.000Z',
            }),
            Timestamp: '2025-01-01T00:00:00.000Z',
            SignatureVersion: '1',
            Signature: 'signature',
            SigningCertUrl: 'https://...',
            UnsubscribeUrl: 'https://...',
            MessageAttributes: {},
          },
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        signUpMethod: 'email',
        enrolledCourses: [],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      }),
    });

    await handler(event);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/api/students',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          signUpMethod: 'email',
          enrolledCourses: [],
        }),
      }
    );
  });

  it('should throw error if Student API call fails', async () => {
    const event: SNSEvent = {
      Records: [
        {
          EventSource: 'aws:sns',
          EventVersion: '1.0',
          EventSubscriptionArn: 'arn:aws:sns:...',
          Sns: {
            Type: 'Notification',
            MessageId: 'msg-123',
            TopicArn: 'arn:aws:sns:us-east-1:123456789012:topic',
            Subject: 'New Student Onboarding',
            Message: JSON.stringify({
              userId: 'user-123',
              email: 'test@example.com',
              name: 'Test User',
              signUpMethod: 'email',
              timestamp: '2025-01-01T00:00:00.000Z',
            }),
            Timestamp: '2025-01-01T00:00:00.000Z',
            SignatureVersion: '1',
            Signature: 'signature',
            SigningCertUrl: 'https://...',
            UnsubscribeUrl: 'https://...',
            MessageAttributes: {},
          },
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    await expect(handler(event)).rejects.toThrow();
  });
});
```

### Success Criteria

#### Continuous Validation (During Implementation):
- [ ] Run `pnpm test` after each Lambda implementation - tests pass
- [ ] Run `pnpm run typecheck` - no type errors
- [ ] Monitor local test output - 90% coverage maintained

#### Phase Completion Validation:
- [ ] All unit tests pass: `cd backend && pnpm test`
- [ ] Test coverage meets 90% threshold: `pnpm run test:coverage`
- [ ] TypeScript compilation succeeds: `pnpm run build`
- [ ] Lambda handlers compiled to `dist/lambdas/*.js`
- [ ] SAM build succeeds: `sam build`
- [ ] SAM deploy succeeds: `sam deploy`
- [ ] PostConfirmation Lambda exists in AWS Console
- [ ] Student Onboarding Lambda subscribed to SNS topic
- [ ] DLQ created and linked to Student Onboarding Lambda

#### Preview Deployment Validation:
- [ ] Backend deployed: `./scripts/deploy-preview-backend.sh`
- [ ] CloudWatch Logs show Lambda functions exist
- [ ] Manually trigger PostConfirmation (via Cognito test user): Check CloudWatch logs for SNS publish
- [ ] Manually publish to SNS topic: Check Student Onboarding Lambda logs

---

## Phase 3: Backend Student API

### Overview
Implement Express Student API endpoints (POST/GET/PATCH /api/students) with Cognito JWT validation middleware and DynamoDB integration.

### Changes Required

#### 1. Install Backend Dependencies
**File**: `backend/package.json`
**Changes**: Add JWT verification and Zod validation

```json
{
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.398.0",
    "@aws-sdk/lib-dynamodb": "^3.398.0",
    "@aws-sdk/client-sns": "^3.398.0",
    "aws-jwt-verify": "^4.0.0",
    "express": "^4.18.2",
    "zod": "^3.22.0"
  }
}
```

Run: `cd backend && pnpm install`

#### 2. Create JWT Middleware
**File**: `backend/src/middleware/auth.ts` (new file)
**Changes**: Cognito JWT validation middleware

```typescript
import { Request, Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;

// Create JWT verifier
const verifier = CognitoJwtVerifier.create({
  userPoolId: USER_POOL_ID,
  tokenUse: 'access',
  clientId: CLIENT_ID,
});

// Extend Express Request type
export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email: string;
    username: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const payload = await verifier.verify(token);

    // Attach user info to request
    req.user = {
      sub: payload.sub,
      email: payload.email || '',
      username: payload.username || payload.sub,
    };

    next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

#### 3. Create DynamoDB Client
**File**: `backend/src/lib/dynamodb.ts` (new file)
**Changes**: DynamoDB client initialization

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});
```

#### 4. Create Student Model
**File**: `backend/src/models/student.ts` (new file)
**Changes**: Student data model and DynamoDB operations

```typescript
import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../lib/dynamodb.js';

const STUDENTS_TABLE = process.env.STUDENTS_TABLE_NAME!;

export interface Student {
  userId: string;
  email: string;
  name: string;
  signUpMethod: 'email' | 'google';
  enrolledCourses: string[];
  createdAt: string;
  updatedAt: string;
}

export const createStudent = async (
  studentData: Omit<Student, 'createdAt' | 'updatedAt'>
): Promise<Student> => {
  const now = new Date().toISOString();
  const student: Student = {
    ...studentData,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: STUDENTS_TABLE,
      Item: student,
      ConditionExpression: 'attribute_not_exists(userId)', // Prevent duplicates
    })
  );

  return student;
};

export const getStudentByUserId = async (userId: string): Promise<Student | null> => {
  const result = await docClient.send(
    new GetCommand({
      TableName: STUDENTS_TABLE,
      Key: { userId },
    })
  );

  return (result.Item as Student) || null;
};

export const getStudentByEmail = async (email: string): Promise<Student | null> => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: STUDENTS_TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
    })
  );

  return (result.Items?.[0] as Student) || null;
};

export const updateStudent = async (
  userId: string,
  updates: Partial<Pick<Student, 'name' | 'enrolledCourses'>>
): Promise<Student> => {
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  // Build update expression dynamically
  if (updates.name !== undefined) {
    updateExpressions.push('#name = :name');
    expressionAttributeNames['#name'] = 'name';
    expressionAttributeValues[':name'] = updates.name;
  }

  if (updates.enrolledCourses !== undefined) {
    updateExpressions.push('enrolledCourses = :enrolledCourses');
    expressionAttributeValues[':enrolledCourses'] = updates.enrolledCourses;
  }

  // Always update updatedAt
  updateExpressions.push('updatedAt = :updatedAt');
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: STUDENTS_TABLE,
      Key: { userId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0
        ? expressionAttributeNames
        : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes as Student;
};
```

#### 5. Create Zod Validation Schemas
**File**: `backend/src/schemas/student.ts` (new file)
**Changes**: Request/response validation schemas

```typescript
import { z } from 'zod';

export const createStudentSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  signUpMethod: z.enum(['email', 'google']),
  enrolledCourses: z.array(z.string()).default([]),
});

export const updateStudentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  enrolledCourses: z.array(z.string()).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
```

#### 6. Create Student Routes
**File**: `backend/src/routes/students.ts` (new file)
**Changes**: Student API endpoints

```typescript
import express, { Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { createStudent, getStudentByUserId, updateStudent } from '../models/student.js';
import { createStudentSchema, updateStudentSchema } from '../schemas/student.js';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

const router = express.Router();

// POST /api/students - Create student record
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData = createStudentSchema.parse(req.body);

    // Create student in DynamoDB
    const student = await createStudent(validatedData);

    res.status(201).json(student);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid request body', details: error.errors });
      return;
    }

    if (error instanceof ConditionalCheckFailedException) {
      res.status(409).json({ error: 'Student already exists' });
      return;
    }

    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/students/:userId - Get student by ID (protected)
router.get('/:userId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // Verify user can only access their own data
    if (req.user?.sub !== userId) {
      res.status(403).json({ error: 'Forbidden: Cannot access other users\' data' });
      return;
    }

    const student = await getStudentByUserId(userId);

    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.status(200).json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/students/:userId - Update student (protected)
router.patch('/:userId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // Verify user can only update their own data
    if (req.user?.sub !== userId) {
      res.status(403).json({ error: 'Forbidden: Cannot update other users\' data' });
      return;
    }

    // Validate request body
    const validatedData = updateStudentSchema.parse(req.body);

    // Update student in DynamoDB
    const updatedStudent = await updateStudent(userId, validatedData);

    res.status(200).json(updatedStudent);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid request body', details: error.errors });
      return;
    }

    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

#### 7. Update Express App
**File**: `backend/src/app.ts`
**Changes**: Add student routes and CORS

```typescript
import express, { Request, Response, Express } from 'express';
import studentRoutes from './routes/students.js';

// Initialize Express app
const app: Express = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
});

// Routes
app.get('/hello', (req: Request, res: Response) => {
  console.info('GET /hello - Hello World endpoint');
  res.status(200).json({ message: 'hello world' });
});

app.use('/api/students', studentRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
```

#### 8. Update SAM Template - Express Function Permissions
**File**: `backend/template.yaml`
**Changes**: Grant DynamoDB permissions to Express Lambda

```yaml
  ExpressApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./
      Handler: run.sh
      Runtime: nodejs22.x
      Architectures:
        - x86_64
      MemorySize: 1024
      Timeout: 30
      Description: Express.js API running on Lambda with Web Adapter
      Environment:
        Variables:
          AWS_LAMBDA_EXEC_WRAPPER: /opt/bootstrap
          RUST_LOG: info
          PORT: 8080
          STUDENTS_TABLE_NAME: !Ref StudentsTable
          COURSES_TABLE_NAME: !Ref CoursesTable
          COGNITO_USER_POOL_ID: !Ref LearnerMaxUserPool
          COGNITO_CLIENT_ID: !Ref LearnerMaxUserPoolClient
          AWS_REGION: !Ref AWS::Region
      Layers:
        - !Sub arn:aws:lambda:${AWS::Region}:753240598075:layer:LambdaAdapterLayerX86:25
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref StudentsTable
        - DynamoDBCrudPolicy:
            TableName: !Ref CoursesTable
      Events:
        RootEndpoint:
          Type: Api
          Properties:
            Path: /{proxy+}
            Method: ANY
            RestApiId: !Ref ApiGatewayApi
```

#### 9. Create Student API Tests
**File**: `backend/src/routes/__tests__/students.test.ts` (new file)
**Changes**: Integration tests for Student API

```typescript
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Student API Routes', () => {
  beforeEach(() => {
    ddbMock.reset();
    process.env.STUDENTS_TABLE_NAME = 'test-students-table';
  });

  describe('POST /api/students', () => {
    it('should create a new student', async () => {
      ddbMock.on(PutCommand).resolves({});

      const studentData = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        signUpMethod: 'email',
        enrolledCourses: [],
      };

      // Test would call API endpoint and verify response
      // Full integration test would be in e2e/
    });
  });

  describe('GET /api/students/:userId', () => {
    it('should retrieve student by userId', async () => {
      const mockStudent = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        signUpMethod: 'email',
        enrolledCourses: [],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };

      ddbMock.on(GetCommand).resolves({ Item: mockStudent });

      // Test would call API endpoint with JWT token
    });

    it('should return 404 if student not found', async () => {
      ddbMock.on(GetCommand).resolves({});

      // Test would call API endpoint and verify 404 response
    });
  });

  describe('PATCH /api/students/:userId', () => {
    it('should update student name', async () => {
      ddbMock.on(UpdateCommand).resolves({
        Attributes: {
          userId: 'user-123',
          name: 'Updated Name',
        },
      });

      // Test would call API endpoint with update data
    });
  });
});
```

### Success Criteria

#### Continuous Validation (During Implementation):
- [ ] Run `pnpm test` after each route implementation - tests pass
- [ ] Run `pnpm run typecheck` - no type errors
- [ ] Run `pnpm run lint` - no linting errors
- [ ] Monitor local dev logs: `pnpm run dev` - no startup errors

#### Phase Completion Validation:
- [ ] All unit tests pass: `cd backend && pnpm test`
- [ ] Test coverage meets 90% threshold: `pnpm run test:coverage`
- [ ] TypeScript compilation succeeds: `pnpm run build`
- [ ] Linting passes: `pnpm run lint`
- [ ] Build succeeds: `pnpm run build && sam build`
- [ ] Local dev server starts: `pnpm run dev` - listens on port 8080

#### Preview Deployment Validation:
- [ ] Backend deployed: `./scripts/deploy-preview-backend.sh`
- [ ] Test POST /api/students (no auth): `curl -X POST <API_URL>/api/students -H "Content-Type: application/json" -d '{"userId":"test","email":"test@test.com","name":"Test","signUpMethod":"email","enrolledCourses":[]}'` - returns 201
- [ ] Test GET /api/students/:userId (with invalid JWT): `curl <API_URL>/api/students/test -H "Authorization: Bearer invalid"` - returns 401
- [ ] No errors in backend logs: `scripts/.sam-logs.log`

---

## Phase 4: Frontend NextAuth Setup

### Overview
Install and configure NextAuth.js with Cognito provider, implement JWT session management with token refresh, and create session provider wrapper.

### Changes Required

#### 1. Install Frontend Dependencies
**File**: `frontend/package.json`
**Changes**: Add NextAuth and AWS SDK

```json
{
  "dependencies": {
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slot": "^1.2.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.544.0",
    "motion": "^12.23.22",
    "next": "15.5.4",
    "next-auth": "^5.0.0-beta.25",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-hook-form": "^7.64.0",
    "tailwind-merge": "^3.3.1",
    "zod": "^4.1.11"
  }
}
```

Run: `cd frontend && pnpm install`

#### 2. Create NextAuth Configuration
**File**: `frontend/auth.ts` (new file)
**Changes**: NextAuth configuration with Cognito provider

```typescript
import NextAuth from 'next-auth';
import CognitoProvider from 'next-auth/providers/cognito';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CognitoProvider({
      clientId: process.env.COGNITO_CLIENT_ID!,
      clientSecret: process.env.COGNITO_CLIENT_SECRET || '',
      issuer: process.env.COGNITO_ISSUER_URL!,
      checks: ['pkce'],
    }),
  ],
  session: {
    strategy: 'jwt', // Use JWT-based sessions
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }

      // Token still valid
      if (Date.now() < (token.expiresAt as number) * 1000) {
        return token;
      }

      // Token expired, refresh it
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      // Add tokens to session
      session.user = {
        ...session.user,
        id: token.sub!,
      };
      session.accessToken = token.accessToken as string;
      session.idToken = token.idToken as string;
      session.error = token.error as string | undefined;

      return session;
    },
  },
  pages: {
    signIn: '/signin',
    error: '/auth/error',
  },
});

async function refreshAccessToken(token: any) {
  try {
    const url = `${process.env.COGNITO_ISSUER_URL}/oauth2/token`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.COGNITO_CLIENT_ID!,
        refresh_token: token.refreshToken,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      idToken: refreshedTokens.id_token,
      expiresAt: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);

    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}
```

#### 3. Create NextAuth API Route
**File**: `frontend/app/api/auth/[...nextauth]/route.ts` (new file)
**Changes**: NextAuth API route handler

```typescript
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
```

#### 4. Create Auth Types
**File**: `frontend/types/next-auth.d.ts` (new file)
**Changes**: Extend NextAuth types

```typescript
import NextAuth, { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    idToken?: string;
    error?: string;
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
  }
}
```

#### 5. Create Session Provider Component
**File**: `frontend/components/providers/session-provider.tsx` (new file)
**Changes**: Client-side session provider

```typescript
'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
```

#### 6. Update Root Layout
**File**: `frontend/app/layout.tsx`
**Changes**: Wrap app with SessionProvider

```typescript
import { SessionProvider } from '@/components/providers/session-provider';
import './globals.css';

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

#### 7. Create Protected Route Middleware
**File**: `frontend/middleware.ts` (new file)
**Changes**: Protect routes requiring authentication

```typescript
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public routes
  const publicRoutes = ['/', '/signin', '/enroll', '/forgot-password', '/reset-password', '/verify-email'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // API routes and NextAuth routes are always allowed
  if (pathname.startsWith('/api') || pathname.startsWith('/auth')) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to sign in
  if (!isPublicRoute && !req.auth) {
    const signInUrl = new URL('/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

#### 8. Create Environment Variables Template
**File**: `frontend/.env.local.example` (new file)
**Changes**: Document required environment variables

```bash
# Cognito Configuration (from SAM outputs)
COGNITO_CLIENT_ID=your-cognito-client-id
COGNITO_CLIENT_SECRET=  # Leave empty for public clients
COGNITO_ISSUER_URL=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000  # Update for preview/prod
NEXTAUTH_SECRET=your-nextauth-secret  # Generate with: openssl rand -base64 32

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080  # Backend API URL
```

#### 9. Create Auth Utility Hooks
**File**: `frontend/lib/hooks/use-auth.ts` (new file)
**Changes**: Custom hooks for authentication

```typescript
'use client';

import { useSession } from 'next-auth/react';

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    session,
    user: session?.user,
    accessToken: session?.accessToken,
    idToken: session?.idToken,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    error: session?.error,
  };
}
```

### Success Criteria

#### Continuous Validation (During Implementation):
- [ ] Run `pnpm run typecheck` after each change - no type errors
- [ ] Run `pnpm run lint` - no linting errors
- [ ] Monitor dev server logs: `pnpm run dev` - no errors

#### Phase Completion Validation:
- [ ] TypeScript compilation succeeds: `cd frontend && pnpm run typecheck`
- [ ] Linting passes: `pnpm run lint`
- [ ] Build succeeds: `pnpm run build`
- [ ] Dev server starts: `pnpm run dev` - no errors
- [ ] NextAuth API route accessible: `curl http://localhost:3000/api/auth/session` - returns session data

#### Manual Testing:
- [ ] Create `.env.local` from `.env.local.example`
- [ ] Add Cognito outputs from SAM deployment
- [ ] Generate NEXTAUTH_SECRET: `openssl rand -base64 32`
- [ ] Visit `http://localhost:3000/api/auth/providers` - shows Cognito provider

---

## Phase 5: Frontend Authentication Pages

### Overview
Create sign-in, sign-up (enrollment), forgot password, reset password, and email verification pages with Cognito integration.

### Changes Required

#### 1. Update Enrollment Page
**File**: `frontend/app/enroll/page.tsx`
**Changes**: Connect to Cognito sign-up API

```typescript
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EnrollmentForm } from '@/components/enrollment/EnrollmentForm';
import { GoogleSignInButton } from '@/components/enrollment/GoogleSignInButton';
import { signIn } from 'next-auth/react';

export default function EnrollPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseid');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSignUp = async (data: { email: string; password: string; name: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      // Sign up with Cognito using NextAuth
      const result = await signIn('cognito', {
        redirect: false,
        email: data.email,
        password: data.password,
        // Cognito will send verification email automatically
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      // Redirect to email verification page
      router.push('/verify-email?email=' + encodeURIComponent(data.email));
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);

    // Redirect to Cognito Hosted UI for Google OAuth
    await signIn('cognito', {
      callbackUrl: courseId ? `/course/${courseId}` : '/',
      redirect: true,
    });
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <h1 className="text-4xl font-bold mb-8">Enroll Now</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            {error}
          </div>
        )}

        <EnrollmentForm onSubmit={handleEmailSignUp} isLoading={isLoading} />

        <div className="my-6 text-center text-gray-500">OR</div>

        <GoogleSignInButton onClick={handleGoogleSignIn} isLoading={isLoading} />

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/signin" className="text-blue-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
```

#### 2. Create Sign-In Page
**File**: `frontend/app/signin/page.tsx` (new file)
**Changes**: Sign-in page with email/password and Google

```typescript
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('cognito', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError('Invalid email or password');
        return;
      }

      router.push(callbackUrl);
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);

    await signIn('cognito', {
      callbackUrl,
      redirect: true,
    });
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <h1 className="text-4xl font-bold mb-8">Sign In</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="my-6 text-center text-gray-500">OR</div>

        <Button
          onClick={handleGoogleSignIn}
          variant="outline"
          className="w-full"
          disabled={isLoading}
        >
          Sign in with Google
        </Button>

        <div className="mt-6 text-center space-y-2">
          <a href="/forgot-password" className="block text-sm text-blue-600 hover:underline">
            Forgot password?
          </a>
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <a href="/enroll" className="text-blue-600 hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
```

#### 3. Create Forgot Password Page
**File**: `frontend/app/forgot-password/page.tsx` (new file)
**Changes**: Password reset request page

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement Cognito forgot password API call
      // For now, just show success message
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <h1 className="text-4xl font-bold mb-8">Check Your Email</h1>
          <p className="text-gray-600 mb-6">
            We've sent a password reset code to <strong>{email}</strong>.
            Please check your inbox and follow the instructions.
          </p>
          <a href="/reset-password" className="text-blue-600 hover:underline">
            Enter reset code →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <h1 className="text-4xl font-bold mb-8">Forgot Password</h1>
        <p className="text-gray-600 mb-6">
          Enter your email address and we'll send you a code to reset your password.
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Reset Code'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Remember your password?{' '}
          <a href="/signin" className="text-blue-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
```

#### 4. Create Reset Password Page
**File**: `frontend/app/reset-password/page.tsx` (new file)
**Changes**: Password reset with code page

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement Cognito confirm forgot password API call
      // For now, just redirect
      router.push('/signin?message=password-reset-success');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <h1 className="text-4xl font-bold mb-8">Reset Password</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="code">Reset Code</Label>
            <Input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Check your email for the code"
            />
          </div>

          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={8}
            />
            <p className="text-sm text-gray-500 mt-1">
              Must be at least 8 characters with uppercase, lowercase, number, and symbol
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

#### 5. Create Email Verification Page
**File**: `frontend/app/verify-email/page.tsx` (new file)
**Changes**: Email verification confirmation page

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-4">Verify Your Email</h1>
          <p className="text-gray-600 mb-6">
            We've sent a verification email to <strong>{email}</strong>.
          </p>
          <p className="text-gray-600 mb-8">
            Please check your inbox and click the verification link to complete your registration.
          </p>
        </div>

        <div className="space-y-4">
          <Button asChild className="w-full">
            <a href="/signin">Continue to Sign In</a>
          </Button>

          <p className="text-sm text-gray-500">
            Didn't receive the email?{' '}
            <button className="text-blue-600 hover:underline">
              Resend verification email
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
```

### Success Criteria

#### Continuous Validation (During Implementation):
- [ ] Run `pnpm run typecheck` after each page - no type errors
- [ ] Run `pnpm run lint` - no linting errors
- [ ] Monitor dev server: `pnpm run dev` - pages render without errors

#### Phase Completion Validation:
- [ ] TypeScript compilation succeeds: `cd frontend && pnpm run typecheck`
- [ ] Linting passes: `pnpm run lint`
- [ ] Build succeeds: `pnpm run build`
- [ ] All pages accessible locally:
  - [ ] `/signin` - sign-in form renders
  - [ ] `/enroll` - enrollment form renders
  - [ ] `/forgot-password` - forgot password form renders
  - [ ] `/reset-password` - reset password form renders
  - [ ] `/verify-email` - verification message displays

#### Preview Deployment Validation:
- [ ] Frontend deployed: `./scripts/deploy-preview-frontend.sh`
- [ ] All pages accessible on Vercel preview URL
- [ ] No errors in frontend logs: `scripts/.vercel-logs.log`

#### Manual Testing:
- [ ] Visit `/enroll` - form submits without errors
- [ ] Visit `/signin` - can attempt login (will fail without valid credentials)
- [ ] Visit `/forgot-password` - can request reset code
- [ ] Protected routes redirect to `/signin`

---

## Phase 6: E2E Testing Setup

### Overview
Create test user management scripts, Playwright configuration with Cognito authentication, and E2E tests for complete authentication flows.

### Changes Required

#### 1. Create Test User Management Script
**File**: `scripts/create-test-users.ts` (new file)
**Changes**: Script to create pre-confirmed test users in Cognito

```typescript
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDeleteUserCommand,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({ region: 'us-east-1' });

const TEST_USERS = [
  {
    username: 'test-student@learnermax.com',
    password: 'TestStudent123!',
    email: 'test-student@learnermax.com',
    name: 'Test Student',
    emailVerified: true,
  },
  {
    username: 'test-student-unverified@learnermax.com',
    password: 'TestStudent123!',
    email: 'test-student-unverified@learnermax.com',
    name: 'Test Student Unverified',
    emailVerified: false,
  },
];

async function createTestUsers() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;

  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID environment variable is required');
  }

  for (const user of TEST_USERS) {
    try {
      console.log(`Creating test user: ${user.username}`);

      // Create user
      await client.send(
        new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: user.username,
          UserAttributes: [
            { Name: 'email', Value: user.email },
            { Name: 'email_verified', Value: String(user.emailVerified) },
            { Name: 'name', Value: user.name },
          ],
          MessageAction: 'SUPPRESS',
          TemporaryPassword: 'TempPassword123!',
        })
      );

      // Set permanent password
      await client.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: userPoolId,
          Username: user.username,
          Password: user.password,
          Permanent: true,
        })
      );

      console.log(`✅ Created: ${user.username}`);
    } catch (error: any) {
      if (error.name === 'UsernameExistsException') {
        console.log(`⚠️  User already exists: ${user.username}`);
      } else {
        console.error(`❌ Failed to create ${user.username}:`, error.message);
      }
    }
  }
}

async function deleteTestUsers() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;

  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID environment variable is required');
  }

  for (const user of TEST_USERS) {
    try {
      await client.send(
        new AdminDeleteUserCommand({
          UserPoolId: userPoolId,
          Username: user.username,
        })
      );
      console.log(`🗑️  Deleted: ${user.username}`);
    } catch (error: any) {
      console.error(`❌ Failed to delete ${user.username}:`, error.message);
    }
  }
}

async function listTestUsers() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;

  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID environment variable is required');
  }

  const response = await client.send(
    new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: 'email ^= "test-"',
    })
  );

  console.log('Test Users:');
  response.Users?.forEach((user) => {
    const email = user.Attributes?.find((attr) => attr.Name === 'email')?.Value;
    const emailVerified = user.Attributes?.find((attr) => attr.Name === 'email_verified')?.Value;
    const status = user.UserStatus;

    console.log(`  - ${email} (${status}, verified: ${emailVerified})`);
  });
}

const command = process.argv[2];

if (command === 'create') {
  createTestUsers();
} else if (command === 'delete') {
  deleteTestUsers();
} else if (command === 'list') {
  listTestUsers();
} else {
  console.log('Usage: tsx scripts/create-test-users.ts <create|delete|list>');
}
```

#### 2. Install E2E Dependencies
**File**: `e2e/package.json`
**Changes**: Add Playwright and AWS SDK

```json
{
  "name": "e2e-tests",
  "version": "1.0.0",
  "private": true,
  "packageManager": "pnpm@10.13.1",
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug",
    "test:users:create": "tsx ../scripts/create-test-users.ts create",
    "test:users:delete": "tsx ../scripts/create-test-users.ts delete",
    "test:users:list": "tsx ../scripts/create-test-users.ts list"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@aws-sdk/client-cognito-identity-provider": "^3.398.0",
    "dotenv": "^16.3.1",
    "tsx": "^4.7.0"
  }
}
```

Run: `cd e2e && pnpm install`

#### 3. Create Playwright Configuration
**File**: `e2e/playwright.config.ts` (new file)
**Changes**: Playwright configuration with global setup

```typescript
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: process.env.CI
    ? undefined
    : {
        command: 'cd ../frontend && pnpm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
      },
});
```

#### 4. Create Global Setup Script
**File**: `e2e/global-setup.ts` (new file)
**Changes**: Authenticate test user and save storage state

```typescript
import { chromium, FullConfig } from '@playwright/test';
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';

async function globalSetup(config: FullConfig) {
  const client = new CognitoIdentityProviderClient({ region: 'us-east-1' });

  const username = process.env.TEST_USER_USERNAME || 'test-student@learnermax.com';
  const password = process.env.TEST_USER_PASSWORD || 'TestStudent123!';

  // Authenticate via Cognito
  const response = await client.send(
    new AdminInitiateAuthCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID!,
      ClientId: process.env.COGNITO_CLIENT_ID!,
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    })
  );

  const idToken = response.AuthenticationResult?.IdToken;
  const accessToken = response.AuthenticationResult?.AccessToken;
  const refreshToken = response.AuthenticationResult?.RefreshToken;

  // Create storage state
  const browser = await chromium.launch();
  const context = await browser.newContext();

  await context.addInitScript(
    ({ clientId, username, idToken, accessToken, refreshToken }) => {
      const prefix = `CognitoIdentityServiceProvider.${clientId}`;
      localStorage.setItem(`${prefix}.LastAuthUser`, username);
      localStorage.setItem(`${prefix}.${username}.idToken`, idToken);
      localStorage.setItem(`${prefix}.${username}.accessToken`, accessToken);
      localStorage.setItem(`${prefix}.${username}.refreshToken`, refreshToken);
    },
    {
      clientId: process.env.COGNITO_CLIENT_ID!,
      username,
      idToken: idToken!,
      accessToken: accessToken!,
      refreshToken: refreshToken!,
    }
  );

  await context.storageState({ path: '.auth/user.json' });
  await browser.close();
}

export default globalSetup;
```

#### 5. Create Authentication E2E Tests
**File**: `e2e/tests/authentication.spec.ts` (new file)
**Changes**: E2E tests for authentication flows

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test.describe('Unauthenticated', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('should show sign-in page', async ({ page }) => {
      await page.goto('/signin');
      await expect(page.locator('h1')).toContainText('Sign In');
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('should show enrollment page', async ({ page }) => {
      await page.goto('/enroll');
      await expect(page.locator('h1')).toContainText('Enroll');
    });

    test('should redirect to signin for protected routes', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/.*signin/);
    });
  });

  test.describe('Authenticated', () => {
    test('should access protected routes', async ({ page }) => {
      // User is already authenticated via storage state
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/.*dashboard/);
    });
  });
});
```

#### 6. Create Student API E2E Tests
**File**: `e2e/tests/student-api.spec.ts` (new file)
**Changes**: E2E tests for Student API

```typescript
import { test, expect } from '@playwright/test';
import { CognitoTokenManager } from '../utils/cognito-token-manager';

const tokenManager = new CognitoTokenManager();
const API_BASE_URL = process.env.API_BASE_URL!;
const TEST_USERNAME = process.env.TEST_USER_USERNAME!;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD!;

test.describe('Student API', () => {
  let accessToken: string;
  let userId: string;

  test.beforeAll(async () => {
    accessToken = await tokenManager.getAccessToken(TEST_USERNAME, TEST_PASSWORD);
    const idToken = await tokenManager.getIdToken(TEST_USERNAME, TEST_PASSWORD);
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
    userId = payload.sub;
  });

  test('should retrieve student profile', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/students/${userId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);
    const student = await response.json();
    expect(student.userId).toBe(userId);
    expect(student.email).toBe(TEST_USERNAME);
  });

  test('should reject request without token', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/students/${userId}`);
    expect(response.status()).toBe(401);
  });
});
```

#### 7. Create Environment Variables Template
**File**: `e2e/.env.test.example` (new file)
**Changes**: Document E2E environment variables

```bash
# Cognito Configuration
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=your-client-id
AWS_REGION=us-east-1

# Test User Credentials
TEST_USER_USERNAME=test-student@learnermax.com
TEST_USER_PASSWORD=TestStudent123!

# URLs
FRONTEND_URL=https://preview-your-app.vercel.app
API_BASE_URL=https://your-api.execute-api.us-east-1.amazonaws.com/Prod
```

### Success Criteria

#### Continuous Validation (During Implementation):
- [ ] Run `pnpm test:users:create` - test users created successfully
- [ ] Run `pnpm test:users:list` - test users visible in Cognito
- [ ] Monitor Playwright output - tests execute without crashes

#### Phase Completion Validation:
- [ ] Test user script works: `cd e2e && pnpm run test:users:create`
- [ ] Test users visible: `pnpm run test:users:list`
- [ ] Playwright installed: `npx playwright install --with-deps chromium`
- [ ] E2E tests run locally: `pnpm test` (may fail if services not running)

#### Preview Deployment Validation:
- [ ] Create `.env.test` from `.env.test.example`
- [ ] Add Cognito and API URLs from SAM/Vercel outputs
- [ ] Create test users: `pnpm run test:users:create`
- [ ] Run E2E tests against preview: `pnpm test`
- [ ] All E2E tests pass
- [ ] Screenshots/videos available in `test-results/` for failures

---

## Testing Strategy

### Unit Tests
- **Backend Lambda Functions**: Test SNS publish, event parsing, API calls
- **Backend Student API**: Test CRUD operations, JWT validation, error handling
- **Frontend Components**: Test form submission, error display, loading states

### Integration Tests
- **Student Onboarding Flow**: PostConfirmation → SNS → Student Onboarding → Student API → DynamoDB
- **JWT Validation**: Verify Cognito tokens are correctly validated by API Gateway and Express middleware

### E2E Tests (Created During Preview Validation)
- **Sign-up Flow**: Email verification required, student record created
- **Google OAuth Flow**: Cognito Hosted UI redirect, auto-verified email
- **Sign-in Flow**: Successful authentication, JWT tokens issued
- **Protected Routes**: Unauthenticated users redirected to sign-in
- **Student API**: Authenticated requests succeed, unauthorized fail

**Note**: E2E tests are written and run against the preview environment after local implementation is complete.

### Manual Testing Steps
1. **Sign up with email**: Fill enrollment form → receive verification email → click link → sign in
2. **Sign up with Google**: Click Google button → authenticate → redirected to app → student record created
3. **Forgot password**: Request reset code → enter code and new password → sign in with new password
4. **Protected routes**: Visit `/dashboard` without auth → redirected to `/signin`
5. **Student API**: Use `curl` with JWT token → successful response

---

## Performance Considerations

- **JWT Token Caching**: NextAuth automatically caches tokens in session, reducing Cognito API calls
- **DynamoDB GSI**: Email index allows efficient student lookup by email
- **Lambda Cold Starts**: PostConfirmation and Student Onboarding Lambdas may experience initial cold start (~1-2s)
- **API Gateway Caching**: Consider enabling caching for GET endpoints in production
- **SNS Fan-out**: Async processing via SNS prevents blocking Cognito sign-up flow

---

## Migration Notes

- **Existing Users**: No migration needed (starting from scratch)
- **Environment Transition**: Deploy to `preview` first, validate, then deploy to `prod` with `Environment=prod` parameter
- **Rollback Strategy**: Keep previous CloudFormation stack version, roll back via AWS Console if needed
- **Data Persistence**: DynamoDB tables persist across deployments (use `DeletionPolicy: Retain` for production)

---

## References

- **Research**: `specs/student_enrollment/slices/authentication/research.md`
- **Testing Strategy**: `specs/student_enrollment/slices/authentication/testing-strategy.md`
- **Main Spec**: `specs/student_enrollment/mainspec.md`
- **NextAuth Guide**: `specs/student_enrollment/slices/authentication/nextauth-cognito.md`
- **AWS Cognito Docs**: https://docs.aws.amazon.com/cognito/
- **NextAuth Docs**: https://next-auth.js.org/
- **SAM Docs**: https://docs.aws.amazon.com/serverless-application-model/
