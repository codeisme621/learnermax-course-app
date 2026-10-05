import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { reconcilePurchases } from '@/features/purchases';
import { handle } from '@/platform/http';

/**
 * Read-only operator check: GET /api/ops/reconcile?days=30 with `Authorization: Bearer <OPS_SECRET>`.
 * Runs where the (sensitive, non-pullable) Stripe key lives. 404 when OPS_SECRET isn't configured.
 */
function authorized(req: Request, secret: string): boolean {
  const given = Buffer.from(req.headers.get('authorization')?.replace(/^Bearer /, '') ?? '');
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function GET(req: Request) {
  return handle(async () => {
    const secret = process.env.OPS_SECRET;
    if (!secret) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!authorized(req, secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const days = Math.min(Math.max(Number(new URL(req.url).searchParams.get('days') ?? 30) || 30, 1), 90);
    const report = await reconcilePurchases({ days });
    return NextResponse.json({ days, ...report }, { headers: { 'Cache-Control': 'no-store' } });
  });
}
