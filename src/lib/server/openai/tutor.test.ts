import { afterEach, describe, expect, it } from 'vitest';
import { deterministicFallback, explainStep } from './tutor';
import { stepContextSchema } from './schemas';

const context = stepContextSchema.parse({
  subject: 'dsa-1',
  lesson: 'binary-search',
  activeSourceLines: ['mid = left + (right - left) // 2'],
  stateBefore: { left: 0, right: 7, mid: null },
  mutation: [{ entityId: 'mid', nextValue: 3 }],
  stateAfter: { left: 0, right: 7, mid: 3 },
  deterministicExplanation: 'The midpoint is 3.'
});

const originalKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});

describe('AI tutor fallback', () => {
  it('remains grounded when the API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await explainStep(context);
    expect(result).toMatchObject({ available: false, reason: 'not-configured' });
    expect(result.explanation.summary).toContain('midpoint is 3');
  });

  it('supports Bangla fallback without translating identifiers', () => {
    const result = deterministicFallback({ ...context, explanationLanguage: 'bn' });
    expect(result.language).toBe('bn');
    expect(result.summary).toContain('midpoint');
    expect(result.groundingNote).toContain('deterministic trace');
  });
});
