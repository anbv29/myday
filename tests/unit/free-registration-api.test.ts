import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/dates/register/route';

const { rpc, rateLimit } = vi.hoisted(() => ({ rpc: vi.fn(), rateLimit: vi.fn() }));
vi.mock('@/server/supabase/admin', () => ({ createAdminSupabaseClient: () => ({ rpc }) }));
vi.mock('@/server/rate-limit/checkout', () => ({ checkCheckoutRateLimit: rateLimit }));
const payload = { date: '2026-06-02', title: 'A milestone', story: 'My meaningful day.', attribution: '@example', consent: true };
const request = (body = JSON.stringify(payload), origin = 'http://localhost:3000') => new Request('http://localhost:3000/api/dates/register', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body,
});
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
  rpc.mockReset().mockResolvedValue({ data: 'registration-id', error: null });
  rateLimit.mockReset().mockResolvedValue({ success: true, reset: Date.now() + 60000, unavailable: false });
});
afterEach(() => vi.unstubAllEnvs());

describe('free registration endpoint', () => {
  it('persists valid free records through the isolated RPC without payment parameters', async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ kind: 'free', date: payload.date });
    expect(rpc).toHaveBeenCalledWith('register_free_date', {
      target_date: payload.date, registration_title: payload.title,
      registration_story: payload.story, registration_attribution: payload.attribution,
    });
  });
  it('rejects cross-origin writes before rate limiting or persistence', async () => {
    expect((await POST(request(undefined, 'https://attacker.example'))).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled(); expect(rateLimit).not.toHaveBeenCalled();
  });
  it('rejects invalid JSON and missing consent without writing', async () => {
    expect((await POST(request('{'))).status).toBe(400);
    expect((await POST(request(JSON.stringify({ ...payload, consent: false })))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('enforces the bounded body limit', async () => {
    expect((await POST(request('x'.repeat(8193)))).status).toBe(413);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('returns conflict for a paid holder without recording a free entry', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'date_has_paid_claim' } });
    expect((await POST(request())).status).toBe(409);
  });
  it('returns conflict for an existing free registration', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'date_already_registered' } });
    expect((await POST(request())).status).toBe(409);
  });
  it('fails closed when rate limiting is unavailable', async () => {
    rateLimit.mockResolvedValue({ success: false, reset: Date.now() + 60000, unavailable: true });
    expect((await POST(request())).status).toBe(503); expect(rpc).not.toHaveBeenCalled();
  });
  it('throttles abuse and supplies retry guidance', async () => {
    rateLimit.mockResolvedValue({ success: false, reset: Date.now() + 60000, unavailable: false });
    const response = await POST(request());
    expect(response.status).toBe(429); expect(response.headers.has('Retry-After')).toBe(true);
  });
  it('never reports saved when the database fails', async () => {
    rpc.mockRejectedValue(new Error('unavailable'));
    expect((await POST(request())).status).toBe(503);
  });
});
