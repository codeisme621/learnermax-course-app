import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';

// Set environment variables before importing modules that use them
process.env.SES_FROM_EMAIL = 'support@learnwithrico.com';
process.env.SES_REPLY_TO_EMAIL = 'support@learnwithrico.com';

// Mock logger before importing ses-service
vi.mock('../../src/lib/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

// Mock SES
const sesMock = mockClient(SESClient);

// Import after setting env vars
let sendEmail: typeof import('../ses-service').sendEmail;

beforeAll(async () => {
  const module = await import('../ses-service');
  sendEmail = module.sendEmail;
});

describe('ses-service', () => {
  beforeEach(() => {
    sesMock.reset();
  });

  describe('sendEmail', () => {
    it('sendEmail_success_sendsViaRawEmail', async () => {
      sesMock.on(SendRawEmailCommand).resolves({
        MessageId: 'test-message-id-123',
      });

      const messageId = await sendEmail({
        to: 'alex@example.com',
        subject: 'Welcome to the Course!',
        html: '<html><body>Hello!</body></html>',
      });

      expect(messageId).toBe('test-message-id-123');

      // Verify command was called
      const calls = sesMock.commandCalls(SendRawEmailCommand);
      expect(calls).toHaveLength(1);

      // Check raw message content
      const rawData = calls[0].args[0].input.RawMessage?.Data;
      expect(rawData).toBeDefined();
      const rawMessage = rawData?.toString() || '';
      expect(rawMessage).toContain('From: support@learnwithrico.com');
      expect(rawMessage).toContain('To: alex@example.com');
      expect(rawMessage).toContain('Reply-To: support@learnwithrico.com');
      expect(rawMessage).toContain('Subject: Welcome to the Course!');
      expect(rawMessage).toContain('Hello!');
    });

    it('sendEmail_withAttachment_includesMimeAttachment', async () => {
      sesMock.on(SendRawEmailCommand).resolves({
        MessageId: 'test-message-id-456',
      });

      const icsContent = Buffer.from(
        'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR'
      );

      const messageId = await sendEmail({
        to: 'alex@example.com',
        subject: 'Meetup Calendar Invite',
        html: '<html><body>Your invite</body></html>',
        attachments: [
          {
            filename: 'meetup.ics',
            content: icsContent,
            contentType: 'text/calendar; charset=utf-8; method=REQUEST',
          },
        ],
      });

      expect(messageId).toBe('test-message-id-456');

      // Verify raw message contains attachment
      const calls = sesMock.commandCalls(SendRawEmailCommand);
      const rawData = calls[0].args[0].input.RawMessage?.Data;
      const rawMessage = rawData?.toString() || '';

      expect(rawMessage).toContain('multipart/mixed');
      expect(rawMessage).toContain('meetup.ics');
      expect(rawMessage).toContain('text/calendar; charset=utf-8; method=REQUEST');
      expect(rawMessage).toContain('Content-Transfer-Encoding: base64');
    });

    it('sendEmail_sesError_throwsAndLogs', async () => {
      sesMock.on(SendRawEmailCommand).rejects(new Error('SES rate limit exceeded'));

      await expect(
        sendEmail({
          to: 'alex@example.com',
          subject: 'Test Email',
          html: '<html><body>Test</body></html>',
        })
      ).rejects.toThrow('SES rate limit exceeded');
    });
  });
});
