import { afterEach, describe, expect, it } from 'vitest';
import { deterministicFallback, explainStep, parsedExplanationOrFallback } from './tutor';
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

  it('keeps deterministic hints staged without exposing stateAfter', () => {
    const result = deterministicFallback({
      ...context,
      interaction: 'hint',
      currentPrediction: {
        prompt: 'Which midpoint comes next?',
        correctAnswer: '3'
      }
    });

    expect(result.summary).toContain('Hint:');
    expect(result.stateChange).toContain('stays hidden');
    expect(JSON.stringify(result)).not.toContain('"mid":3');
  });

  it('labels invalid structured model output as deterministic fallback', () => {
    const result = parsedExplanationOrFallback(context, null);

    expect(result).toMatchObject({
      available: false,
      source: 'fallback',
      reason: 'invalid-output'
    });
  });

  it('uses recorded prediction evidence for mistake recovery', () => {
    const result = deterministicFallback({
      ...context,
      interaction: 'mistake',
      misconceptionTags: ['index-vs-value'],
      currentPrediction: {
        prompt: 'Which midpoint comes next?',
        learnerAnswer: '4',
        correctAnswer: '3'
      }
    });

    expect(result.summary).toContain('(4)');
    expect(result.summary).toContain('(3)');
    expect(result.recoveryChallenge).toBeTruthy();
  });
});
