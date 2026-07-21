import { describe, expect, it } from 'vitest';
import {
  RECAP_TOPICS,
  buildDeterministicRecap,
  selectRecapTopics,
  type RecapRequest
} from './recap';

describe('study recap builder', () => {
  it('selects known topics and orders them by curated study order', () => {
    const topics = selectRecapTopics(['bst', 'arrays', 'sorting-arena', 'unknown-topic']);
    expect(topics.map((t) => t.id)).toEqual(['arrays', 'sorting-arena', 'bst']);
  });

  it('dedupes requested ids', () => {
    const topics = selectRecapTopics(['arrays', 'arrays', 'arrays']);
    expect(topics).toHaveLength(1);
  });

  it('builds a deterministic sheet with every section populated', () => {
    const request: RecapRequest = {
      topicIds: ['arrays', 'binary-search'],
      language: 'en',
      depth: 'exam'
    };
    const sheet = buildDeterministicRecap(request);

    expect(sheet.source).toBe('deterministic');
    expect(sheet.topics).toHaveLength(2);
    expect(sheet.comparisons).toHaveLength(2);
    expect(sheet.bigO).toHaveLength(2);
    expect(sheet.pitfalls).toHaveLength(2);
    expect(sheet.studySequence).toEqual(['1. Arrays & Dynamic Arrays', '2. Binary Search']);
    // Big-O text is present and specific.
    expect(sheet.bigO.join(' ')).toContain('O(log n)');
  });

  it('trims complexity detail in concise mode and keeps it in exam mode', () => {
    const concise = buildDeterministicRecap({
      topicIds: ['sorting-arena'],
      language: 'en',
      depth: 'concise'
    });
    const exam = buildDeterministicRecap({
      topicIds: ['sorting-arena'],
      language: 'en',
      depth: 'exam'
    });
    expect(concise.topics[0].complexity.length).toBeLessThan(exam.topics[0].complexity.length);
  });

  it('localizes framing text for Bangla', () => {
    const sheet = buildDeterministicRecap({
      topicIds: ['arrays'],
      language: 'bn',
      depth: 'concise'
    });
    expect(sheet.language).toBe('bn');
    expect(sheet.heading).toBe('রিভিশন শিট');
  });

  it('exposes every topic with an in-app trace href', () => {
    for (const topic of RECAP_TOPICS) {
      expect(topic.href.startsWith('/lesson/')).toBe(true);
      expect(topic.complexity.length).toBeGreaterThan(0);
    }
  });
});
