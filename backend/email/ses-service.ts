import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { createLogger } from './lib/logger.js';

const logger = createLogger('SESService');
const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

const FROM_EMAIL = process.env.SES_FROM_EMAIL!;
const REPLY_TO_EMAIL = process.env.SES_REPLY_TO_EMAIL!;

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

/**
 * Build MIME multipart message for raw email
 */
function buildMimeMessage(params: SendEmailParams): string {
  const { to, subject, html, attachments = [] } = params;
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const lines: string[] = [
    `From: ${FROM_EMAIL}`,
    `To: ${to}`,
    `Reply-To: ${REPLY_TO_EMAIL}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    '',
    html,
    '',
  ];

  // Add attachments if present
  for (const attachment of attachments) {
    const base64Content = attachment.content.toString('base64');
    lines.push(
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      `Content-Transfer-Encoding: base64`,
      '',
      base64Content,
      ''
    );
  }

  lines.push(`--${boundary}--`);

  return lines.join('\r\n');
}

/**
 * Send email via AWS SES with optional attachments
 * Uses SendRawEmailCommand to support MIME multipart messages
 */
export async function sendEmail(params: SendEmailParams): Promise<string> {
  const { to, subject, attachments = [] } = params;

  logger.info('Sending email via SES', {
    to,
    subject,
    hasAttachments: attachments.length > 0,
    attachmentCount: attachments.length,
  });

  const rawMessage = buildMimeMessage(params);

  const command = new SendRawEmailCommand({
    RawMessage: {
      Data: Buffer.from(rawMessage),
    },
  });

  try {
    const response = await sesClient.send(command);

    logger.info('Email sent successfully', {
      messageId: response.MessageId,
      to,
      subject,
    });

    return response.MessageId || '';
  } catch (error) {
    logger.error('Failed to send email via SES', {
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      to,
      subject,
      attachmentCount: attachments.length,
    });
    throw error;
  }
}
