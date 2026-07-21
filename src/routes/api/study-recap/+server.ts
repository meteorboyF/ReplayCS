import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { getOpenAI } from '$lib/server/openai/client';
import { buildDeterministicRecap, type RecapSheet } from '$lib/study/recap';
import type { RequestHandler } from './$types';

const requestSchema = z.object({
  topicIds: z.array(z.string().max(64)).min(1).max(24),
  language: z.enum(['en', 'bn']).default('en'),
  depth: z.enum(['concise', 'exam']).default('concise')
});

// GPT is only allowed to rewrite the deterministic material into these fields.
const gptSchema = z.object({
  intro: z.string().max(600),
  comparisons: z.array(z.string().max(400)).max(24),
  bigO: z.array(z.string().max(400)).max(24),
  pitfalls: z.array(z.string().max(400)).max(24),
  studySequence: z.array(z.string().max(200)).max(24)
});

const RECAP_MODEL = process.env.OPENAI_RECAP_MODEL ?? 'gpt-5.6';

export const POST: RequestHandler = async ({ request }) => {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: 'Invalid recap request' }, { status: 400 });
  }

  // Deterministic content is always computed first and is the guaranteed result.
  const deterministic = buildDeterministicRecap(parsed.data);
  if (deterministic.topics.length === 0) {
    return json({ error: 'None of the selected topics are recognized' }, { status: 400 });
  }

  const openai = getOpenAI();
  if (!openai) {
    // No API key configured: return the honest deterministic fallback.
    return json({ recap: deterministic });
  }

  try {
    const enhanced = await enhanceWithGpt(openai, deterministic);
    return json({ recap: enhanced });
  } catch {
    // Any model/parse failure degrades gracefully to the deterministic sheet.
    return json({ recap: { ...deterministic, source: 'deterministic' as const } });
  }
};

async function enhanceWithGpt(
  openai: NonNullable<ReturnType<typeof getOpenAI>>,
  base: RecapSheet
): Promise<RecapSheet> {
  const language = base.language === 'bn' ? 'Bangla' : 'English';
  const depth = base.depth === 'exam' ? 'exam-ready and thorough' : 'concise';

  const response = await openai.chat.completions.create({
    model: RECAP_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a revision-sheet editor for a computer-science visualizer. Rewrite the supplied ' +
          'deterministic study material into clearer prose. Do NOT invent new facts, Big-O bounds, or ' +
          'topics — only rephrase and translate what is given. Return JSON with keys intro, comparisons, ' +
          'bigO, pitfalls, studySequence.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          language,
          depth,
          source: {
            intro: base.intro,
            comparisons: base.comparisons,
            bigO: base.bigO,
            pitfalls: base.pitfalls,
            studySequence: base.studySequence
          }
        })
      }
    ]
  });

  const raw = response.choices[0]?.message?.content ?? '{}';
  const gpt = gptSchema.parse(JSON.parse(raw));

  // GPT only rewrites prose fields; the structured per-topic facts stay canonical.
  return {
    ...base,
    source: 'gpt',
    intro: gpt.intro,
    comparisons: gpt.comparisons,
    bigO: gpt.bigO,
    pitfalls: gpt.pitfalls,
    studySequence: gpt.studySequence
  };
}
