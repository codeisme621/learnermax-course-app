import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { awsCredentialsProvider } from '@vercel/functions/oidc';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let sesClient: SESv2Client | undefined;

function ses(): SESv2Client {
  // On Vercel, assume a scoped IAM role through OIDC (AWS_ROLE_ARN). Locally, the default AWS credential chain.
  sesClient ??= new SESv2Client({
    region: process.env.AWS_REGION ?? 'us-east-1',
    ...(process.env.AWS_ROLE_ARN ? { credentials: awsCredentialsProvider({ roleArn: process.env.AWS_ROLE_ARN }) } : {}),
  });
  return sesClient;
}

async function sendWithSes(message: EmailMessage): Promise<void> {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error('EMAIL_FROM is not set');
  }
  await ses().send(
    new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: [message.to] },
      Content: {
        Simple: {
          Subject: { Data: message.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: message.html, Charset: 'UTF-8' },
            Text: { Data: message.text, Charset: 'UTF-8' },
          },
        },
      },
    }),
  );
}

// Test transport: one JSON file per message, read back by Playwright and Vitest.
async function captureToDisk(message: EmailMessage): Promise<void> {
  const dir = process.env.EMAIL_CAPTURE_DIR;
  if (!dir) {
    throw new Error('EMAIL_TRANSPORT=capture requires EMAIL_CAPTURE_DIR');
  }
  await mkdir(dir, { recursive: true });
  const file = `${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  await writeFile(path.join(dir, file), JSON.stringify({ ...message, sentAt: new Date().toISOString() }));
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const transport = process.env.EMAIL_TRANSPORT ?? 'ses';
  if (transport === 'capture') {
    return captureToDisk(message);
  }
  if (transport === 'ses') {
    return sendWithSes(message);
  }
  throw new Error(`Unknown EMAIL_TRANSPORT "${transport}"`);
}
