import { describe, expect, it } from 'vitest';
import { POST } from './+server';

function call(body: unknown) {
  const request = new Request('http://localhost/api/study-recap', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  // Only `request` is used by the handler.
  return POST({ request } as unknown as Parameters<typeof POST>[0]);
}

describe('POST /api/study-recap', () => {
  it('returns the deterministic recap when no GPT key is configured', async () => {
    // OPENAI_API_KEY is not set in the test environment, so getOpenAI() is null.
    const response = await call({
      topicIds: ['arrays', 'binary-search'],
      language: 'en',
      depth: 'exam'
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.recap.source).toBe('deterministic');
    expect(data.recap.topics).toHaveLength(2);
    expect(data.recap.studySequence.length).toBe(2);
  });

  it('rejects an empty topic list', async () => {
    const response = await call({ topicIds: [], language: 'en', depth: 'concise' });
    expect(response.status).toBe(400);
  });

  it('rejects a request where no topic is recognized', async () => {
    const response = await call({
      topicIds: ['not-a-real-topic'],
      language: 'en',
      depth: 'concise'
    });
    expect(response.status).toBe(400);
  });

  it('defaults language and depth when omitted', async () => {
    const response = await call({ topicIds: ['arrays'] });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.recap.language).toBe('en');
    expect(data.recap.depth).toBe('concise');
  });
});
