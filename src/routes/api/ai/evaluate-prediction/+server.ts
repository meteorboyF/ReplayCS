import { json } from '@sveltejs/kit';
import { z } from 'zod';
const schema = z.object({
  answer: z.string().max(1000),
  expectedConcept: z.string().max(500),
  deterministicAnswer: z.string().max(500)
});
export async function POST({ request }) {
  const p = schema.safeParse(await request.json().catch(() => null));
  if (!p.success) return json({ error: 'Invalid prediction' }, { status: 400 });
  const correct =
    p.data.answer.trim().toLowerCase() === p.data.deterministicAnswer.trim().toLowerCase();
  return json({
    available: false,
    isCorrect: correct,
    score: correct ? 1 : 0,
    feedback: correct ? 'Correct.' : 'Compare your reasoning with the deterministic state.',
    misconceptionTags: correct ? [] : ['state-transition'],
    correctedReasoning: p.data.expectedConcept,
    recommendedHintLevel: correct ? 0 : 2
  });
}
