import { json } from '@sveltejs/kit';
import { z } from 'zod';
const schema = z.object({
  lesson: z.string().max(80),
  correct: z.number().int().nonnegative(),
  attempted: z.number().int().nonnegative(),
  misconceptions: z.array(z.string()).max(20)
});
export async function POST({ request }) {
  const p = schema.safeParse(await request.json().catch(() => null));
  if (!p.success) return json({ error: 'Invalid recap context' }, { status: 400 });
  return json({
    available: false,
    recap: {
      conceptsMastered: p.data.correct ? ['Deterministic state tracing'] : [],
      mistakes: p.data.misconceptions,
      suggestedNextLesson: 'Repeat the trace in another language.',
      exercise: 'Before advancing, write down the next value that changes.'
    }
  });
}
