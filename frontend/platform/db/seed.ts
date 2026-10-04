import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

const AGENTIC_CODING = {
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
async function main() {
  // Imported after dotenv so the client sees DATABASE_URL.
  const { db } = await import('./client');
  const { courses } = await import('./schema');
  const { id, ...fields } = AGENTIC_CODING;
  await db
    .insert(courses)
    .values(AGENTIC_CODING)
    .onConflictDoUpdate({ target: courses.id, set: fields });
  console.log(`Seeded course ${id}`);
  await db.$client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
