import { describe, expect, it } from 'vitest';
import { GET } from './+server';

describe('health endpoint', () => {
  it('returns safe deployment metadata', async () => {
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', app: 'ReplayCS' });
    expect(typeof body.aiConfigured).toBe('boolean');
    expect(body).not.toHaveProperty('apiKey');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
