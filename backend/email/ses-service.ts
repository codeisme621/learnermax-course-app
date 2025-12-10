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
  isCalendarInvite?: boolean; // If true, include as alternative part for Gmail integration
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

/**
 * Build MIME multipart message for raw email
 *
 * For calendar invites, uses multipart/alternative structure so Gmail/Outlook
 * show interactive "Add to Calendar" buttons instead of just a download link.
 *
 * Structure for calendar invites:
 * multipart/mixed
 * ├── multipart/alternative
 * │   ├── text/html (email body)
 * │   └── text/calendar; method=REQUEST (triggers Gmail's calendar UI)
 * └── application/ics attachment (fallback download for other clients)
 */
function buildMimeMessage(params: SendEmailParams): string {
  const { to, subject, html, attachments = [] } = params;

  const calendarAttachment = attachments.find(a => a.isCalendarInvite);
  const regularAttachments = attachments.filter(a => !a.isCalendarInvite);

  const mixedBoundary = `----=_Mixed_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const altBoundary = `----=_Alt_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const lines: string[] = [
    `From: ${FROM_EMAIL}`,
    `To: ${to}`,
    `Reply-To: ${REPLY_TO_EMAIL}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
  ];

  if (calendarAttachment) {
    // Use multipart/mixed as outer container for alternative + attachment
    lines.push(
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
      '',
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      '',
      // HTML part
      `--${altBoundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      '',
      html,
      '',
      // Calendar part (triggers Gmail's interactive calendar UI)
      `--${altBoundary}`,
      `Content-Type: text/calendar; charset=UTF-8; method=REQUEST`,
      `Content-Transfer-Encoding: 7bit`,
      '',
      calendarAttachment.content.toString('utf-8'),
      '',
      `--${altBoundary}--`,
      '',
    );

    // Add any other regular attachments
    for (const attachment of regularAttachments) {
      const base64Content = attachment.content.toString('base64');
      lines.push(
        `--${mixedBoundary}`,
        `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        `Content-Transfer-Encoding: base64`,
        '',
        base64Content,
        ''
      );
    }

    lines.push(`--${mixedBoundary}--`);
  } else {
    // No calendar invite - use simple multipart/mixed structure
    lines.push(
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
      '',
      `--${mixedBoundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      '',
      html,
      ''
    );

    // Add attachments if present
    for (const attachment of attachments) {
      const base64Content = attachment.content.toString('base64');
      lines.push(
        `--${mixedBoundary}`,
        `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        `Content-Transfer-Encoding: base64`,
        '',
        base64Content,
        ''
      );
    }

    lines.push(`--${mixedBoundary}--`);
  }

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
