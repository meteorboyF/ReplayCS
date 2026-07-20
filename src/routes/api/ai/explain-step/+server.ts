import { json } from '@sveltejs/kit';
import { stepContextSchema } from '$lib/server/openai/schemas';
import { explainStep } from '$lib/server/openai/tutor';
const hits = new Map<string, number[]>();
export async function POST({ request, getClientAddress }) {
  if (Number(request.headers.get('content-length') ?? 0) > 20_000)
    return json({ error: 'Request too large' }, { status: 413 });
  const ip = getClientAddress();
  const now = Date.now(),
    recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 12) return json({ error: 'Rate limit exceeded' }, { status: 429 });
  hits.set(ip, [...recent, now]);
  const parsed = stepContextSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: 'Invalid trace context' }, { status: 400 });
  return json(await explainStep(parsed.data));
}
