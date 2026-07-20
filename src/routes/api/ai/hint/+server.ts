import { json } from '@sveltejs/kit';
import { stepContextSchema } from '$lib/server/openai/schemas';
export async function POST({ request }) {
  const parsed = stepContextSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: 'Invalid trace context' }, { status: 400 });
  return json({
    available: false,
    level: 1,
    hint: `Focus on the active line and compare it with this state: ${parsed.data.deterministicExplanation}`
  });
}
