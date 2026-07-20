import { describe, expect, it } from 'vitest';
import { createQueryPipeline } from './queryPipeline';
describe('SQL pipeline', () => {
  it('keeps deterministic intermediates', () => {
    const s = createQueryPipeline();
    expect(s.map((x) => x.rows.length)).toEqual([5, 5, 4, 3, 3, 3, 2]);
    expect(s.at(-1)?.rows[0].department_name).toBe('Engineering');
  });
});
