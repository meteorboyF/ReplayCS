import { describe, expect, it } from 'vitest';
import { GET } from './+server';

describe('health endpoint', () => {
  it('returns safe deployment metadata', async () => {
    const originalVercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
    const originalGitSha = process.env.GIT_COMMIT_SHA;
    process.env.VERCEL_GIT_COMMIT_SHA = '';
    process.env.GIT_COMMIT_SHA = '';
    const response = GET();
    const body = await response.json();

    if (originalVercelSha === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA;
    else process.env.VERCEL_GIT_COMMIT_SHA = originalVercelSha;
    if (originalGitSha === undefined) delete process.env.GIT_COMMIT_SHA;
    else process.env.GIT_COMMIT_SHA = originalGitSha;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', app: 'ReplayCS' });
    expect(typeof body.aiConfigured).toBe('boolean');
    expect(body.version).toBe('development');
    expect(body).not.toHaveProperty('apiKey');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
