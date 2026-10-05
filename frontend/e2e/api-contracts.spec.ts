import { expect, test } from '@playwright/test';
import { activate, paidBuyer } from './support';

// REST contracts the dashboard (and anything else) relies on, checked against the running app.

test('public course endpoints keep the Course shape', async ({ request }) => {
  const course = {
    courseId: 'agentic-coding',
    name: 'Agentic Coding',
    description: expect.any(String),
    instructor: 'Rico Romero',
    pricingModel: 'paid',
    price: 399,
    imageUrl: expect.any(String),
    learningObjectives: expect.any(Array),
    curriculum: [],
    comingSoon: false,
    totalLessons: 0,
  };
  const list = await request.get('/api/courses');
  expect(list.status()).toBe(200);
  expect((await list.json())[0]).toEqual(course);

  const one = await request.get('/api/courses/agentic-coding');
  expect(await one.json()).toEqual(course);

  const missing = await request.get('/api/courses/nope');
  expect(missing.status()).toBe(404);
  expect(await missing.json()).toEqual({ error: 'Course not found' });
});

test('signed-in student endpoints keep their shapes and error formats', async ({ page }) => {
  const { email, userId } = await paidBuyer();
  await activate(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);
  const api = page.request;

  expect(await (await api.get('/api/students/me')).json()).toEqual({
    studentId: userId,
    userId,
    email,
    name: expect.any(String),
    emailVerified: true,
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
    interestedInPremium: false,
  });

  expect(await (await api.get('/api/enrollments')).json()).toEqual([
    { courseId: 'agentic-coding', status: 'active', enrolledAt: expect.any(String) },
  ]);

  expect(await (await api.get('/api/progress/agentic-coding')).json()).toEqual({
    courseId: 'agentic-coding',
    completedLessons: [],
    percentage: 0,
    totalLessons: 0,
    updatedAt: expect.any(String),
  });

  const badBody = await api.post('/api/progress', { data: { courseId: 'agentic-coding' } });
  expect(badBody.status()).toBe(400);
  expect(await badBody.json()).toMatchObject({ error: 'Missing or invalid courseId or lessonId' });

  const unknownLesson = await api.post('/api/progress', { data: { courseId: 'agentic-coding', lessonId: 'lesson-1' } });
  expect(unknownLesson.status()).toBe(404);
  expect(await unknownLesson.json()).toEqual({ error: 'Lesson not found in this course' });

  const feedback = await api.post('/api/feedback', { data: { feedback: 'Love it', category: 'general', rating: 5 } });
  expect(feedback.status()).toBe(201);
  expect(await feedback.json()).toEqual({ feedbackId: expect.any(String) });

  const badFeedback = await api.post('/api/feedback', { data: { feedback: 'x', category: 'bug', rating: 3 } });
  expect(badFeedback.status()).toBe(400);
  expect(await badFeedback.json()).toMatchObject({ error: 'Invalid request', details: expect.any(Array) });

  const earlyAccess = await api.post('/api/students/early-access', { data: { courseId: 'agentic-coding' } });
  expect(await earlyAccess.json()).toMatchObject({ success: true, student: { studentId: userId, interestedInPremium: true } });
});

test('removed endpoints are gone', async ({ request }) => {
  for (const [method, path] of [
    ['POST', '/api/enrollments'],
    ['GET', '/api/enrollments/check/agentic-coding'],
    ['GET', '/api/meetups'],
    ['GET', '/api/lessons/lesson-1/video-url'],
    ['GET', '/api/courses/agentic-coding/video-access'],
  ] as const) {
    const res = await request.fetch(path, { method });
    expect([404, 405], `${method} ${path}`).toContain(res.status());
  }
});

test('the Stripe webhook rejects unsigned and forged requests; activation resend never reveals accounts', async ({ request }) => {
  const unsigned = await request.post('/api/webhooks/stripe', { data: { type: 'checkout.session.completed' } });
  expect(unsigned.status()).toBe(400);
  const forged = await request.post('/api/webhooks/stripe', {
    data: '{"id":"evt_x","type":"checkout.session.completed"}',
    headers: { 'stripe-signature': 't=1,v1=deadbeef', 'content-type': 'application/json' },
  });
  expect(forged.status()).toBe(400);

  for (const email of ['nobody-here@example.test', 'not-an-email']) {
    const res = await request.post('/api/activation/resend', { data: { email } });
    expect(res.status()).toBe(202);
    expect(await res.json()).toEqual({ accepted: true });
  }
});
