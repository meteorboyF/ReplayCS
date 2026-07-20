import { zodTextFormat } from 'openai/helpers/zod';
import { getOpenAI } from './client';
import { explanationSchema, type StepContext, type AiStepExplanation } from './schemas';
export function deterministicFallback(c: StepContext): AiStepExplanation {
  const bangla = c.explanationLanguage === 'bn';
  return {
    language: c.explanationLanguage,
    summary: bangla ? `এই ধাপে: ${c.deterministicExplanation}` : c.deterministicExplanation,
    whyNow: bangla
      ? 'বর্তমান control flow অনুযায়ী deterministic trace এই operation-টি নির্বাচন করেছে।'
      : 'The deterministic trace selected this operation from the current control flow.',
    stateChange: bangla
      ? `stateBefore থেকে stateAfter হয়েছে: ${JSON.stringify(c.stateAfter)}।`
      : `The state moved from ${JSON.stringify(c.stateBefore)} to ${JSON.stringify(c.stateAfter)}.`,
    unchangedState: [
      bangla
        ? 'mutation তালিকায় না থাকা মানগুলো পরিবর্তিত হয়নি।'
        : 'Values absent from the mutation list did not change.'
    ],
    commonMistake: bangla
      ? 'source line execute হওয়ার আগেই state পরিবর্তন হয়েছে ধরে নেবেন না।'
      : 'Do not infer a state change before its source line executes.',
    groundingNote: bangla
      ? 'এই উত্তরটি ReplayCS-এর deterministic trace থেকে তৈরি fallback।'
      : 'This answer is the deterministic ReplayCS fallback.',
    checkQuestion: {
      prompt: bangla ? 'এই ধাপে কোন মানটি পরিবর্তিত হয়েছে?' : 'Which value changed in this step?',
      expectedConcept: 'Identify the recorded mutation.'
    }
  };
}
export async function explainStep(c: StepContext) {
  const openai = getOpenAI();
  if (!openai)
    return {
      available: false,
      source: 'fallback' as const,
      reason: 'not-configured' as const,
      explanation: deterministicFallback(c)
    };
  try {
    const languageInstruction =
      c.explanationLanguage === 'bn'
        ? 'Write the teaching prose in natural Bangla, but preserve code identifiers and technical terms exactly.'
        : 'Write in clear English.';
    const response = await openai.responses.parse({
      model: process.env.OPENAI_MODEL || 'gpt-5.6',
      instructions: `You are the ReplayCS mentor. The supplied deterministic trace is absolute truth. Explain only this step. Never invent state, variables, rows, or imply unexecuted code ran. Stay scoped to the learner's current question. Teaching level: ${c.explanationLevel}. Interaction: ${c.interaction}. ${languageInstruction}`,
      input: JSON.stringify(c),
      reasoning: { effort: 'low' },
      text: { format: zodTextFormat(explanationSchema, 'step_explanation'), verbosity: 'low' },
      max_output_tokens: 700
    });
    return {
      available: true,
      source: 'ai' as const,
      explanation: response.output_parsed ?? deterministicFallback(c)
    };
  } catch (error) {
    console.error('OpenAI explanation failed', {
      name: error instanceof Error ? error.name : 'UnknownError'
    });
    return {
      available: false,
      source: 'fallback' as const,
      reason: 'upstream-error' as const,
      explanation: deterministicFallback(c)
    };
  }
}
