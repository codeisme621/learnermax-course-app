import { readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import type { EmailMessage } from './email';

export interface CapturedEmail extends EmailMessage {
  sentAt: string;
}

export async function readCapturedEmails(dir: string): Promise<CapturedEmail[]> {
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return [];
  }
  return Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), 'utf8')) as CapturedEmail));
}

export async function clearCapturedEmails(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

/** First http(s) link in a captured email's text body. */
export function firstLink(email: EmailMessage): string {
  const match = email.text.match(/https?:\/\/\S+/);
  if (!match) {
    throw new Error(`No link in email "${email.subject}"`);
  }
  return match[0];
}
