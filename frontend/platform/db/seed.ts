import { courses } from './schema';
import type { Db } from './client';

export const AGENTIC_CODING_SEED = {
  id: 'agentic-coding',
  name: 'Agentic Coding',
  description:
    'Become the engineer your team follows into agentic development. Learn the durable patterns (context, verification, and harnesses) that make coding agents produce work you can trust, from intent to verified PR.',
  instructor: 'Rico Romero',
  imageUrl: '/images/instructor-rico.jpg',
  learningObjectives: [
    'How agents actually work',
    'Context engineering',
    'Retrieval & agentic search',
    'Agent capabilities',
    'Evals & verification',
    'Goal-driven development',
    'SDD + TDD for agents',
    'Harness engineering',
    'Agent legibility',
    'Environment engineering',
    'Autonomous coding agents',
    'Operating autonomous engineering',
  ],
  priceCents: 39900,
  currency: 'usd',
  comingSoon: false,
  estimatedDuration: null,
};

// Deterministic and idempotent: safe to run on every fresh or existing database.
export async function seedDatabase(db: Db): Promise<void> {
  await db
    .insert(courses)
    .values(AGENTIC_CODING_SEED)
    .onConflictDoUpdate({ target: courses.id, set: { ...AGENTIC_CODING_SEED, updatedAt: new Date() } });
}
