import { describe, expect, it } from 'vitest';
import {
  arenaChallenges,
  evaluateChallengeAnswer,
  getArenaChallenge,
  isChallengeId
} from './arena';

describe('challenge arena catalog', () => {
  it('ships one deterministic challenge for every advertised subject', () => {
    expect(arenaChallenges.map((challenge) => challenge.subjectId)).toEqual([
      'dsa-1',
      'dsa-2',
      'dbms',
      'operating-systems',
      'computer-networks'
    ]);
    expect(new Set(arenaChallenges.map((challenge) => challenge.id)).size).toBe(5);
  });

  it('gives every challenge two valid prediction checkpoints and a real lesson route', () => {
    for (const challenge of arenaChallenges) {
      expect(challenge.checkpoints).toHaveLength(2);
      expect(challenge.xpReward).toBe(30);
      expect(challenge.lessonHref).toMatch(/^\/lesson\//);
      for (const checkpoint of challenge.checkpoints) {
        expect(checkpoint.options.length).toBeGreaterThanOrEqual(3);
        expect(checkpoint.options.map((option) => option.id)).toContain(checkpoint.correctOptionId);
      }
    }
  });

  it('evaluates correct and incorrect answers without randomness', () => {
    const correct = evaluateChallengeAnswer('sql-pipeline-boss', 'final-limited-row', 'south-230');
    const incorrect = evaluateChallengeAnswer(
      'round-robin-boss',
      'dispatch-third-slice',
      'process-p1'
    );

    expect(correct).toMatchObject({ correct: true, answerId: 'south-230' });
    expect(incorrect).toMatchObject({ correct: false, answerId: 'process-p1' });
    expect(evaluateChallengeAnswer('sql-pipeline-boss', 'final-limited-row', 'south-230')).toEqual(
      correct
    );
  });

  it('rejects unknown checkpoints and answers instead of silently scoring them', () => {
    expect(() => evaluateChallengeAnswer('binary-bound-boss', 'missing', 'low-4-high-6')).toThrow(
      'Unknown checkpoint'
    );
    expect(() =>
      evaluateChallengeAnswer('binary-bound-boss', 'update-inclusive-bounds', 'missing')
    ).toThrow('Unknown answer');
  });

  it('looks up only known challenge ids', () => {
    expect(isChallengeId('bfs-frontier-boss')).toBe(true);
    expect(isChallengeId('surprise-boss')).toBe(false);
    expect(getArenaChallenge('packet-route-boss').subjectLabel).toBe('Computer Networks');
  });
});
