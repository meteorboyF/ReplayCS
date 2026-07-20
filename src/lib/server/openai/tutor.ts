import { zodTextFormat } from 'openai/helpers/zod';
import { getOpenAI } from './client';
import { explanationSchema, type StepContext, type AiStepExplanation } from './schemas';
export function deterministicFallback(c: StepContext): AiStepExplanation {
  return {
    summary: c.deterministicExplanation,
    whyNow: 'The deterministic trace selected this operation from the current control flow.',
    stateChange: `The state moved from ${JSON.stringify(c.stateBefore)} to ${JSON.stringify(c.stateAfter)}.`,
    unchangedState: ['Values absent from the mutation list did not change.'],
    commonMistake: 'Do not infer a state change before its source line executes.',
    checkQuestion: {
      prompt: 'Which value changed in this step?',
      expectedConcept: 'Identify the recorded mutation.'
    }
  };
}
export async function explainStep(c: StepContext) {
  const openai = getOpenAI();
  if (!openai) return { available: false, explanation: deterministicFallback(c) };
  try {
    const response = await openai.responses.parse({
      model: process.env.OPENAI_MODEL || 'gpt-5.6',
      instructions:
        'You are the ReplayCS mentor. The supplied deterministic trace is absolute truth. Explain only this step in concise beginner-friendly language. Never invent state or imply unexecuted code ran.',
      input: JSON.stringify(c),
      text: { format: zodTextFormat(explanationSchema, 'step_explanation') },
      max_output_tokens: 700
    });
    return { available: true, explanation: response.output_parsed ?? deterministicFallback(c) };
  } catch (error) {
    console.error('OpenAI explanation failed', {
      name: error instanceof Error ? error.name : 'UnknownError'
    });
    return { available: false, explanation: deterministicFallback(c) };
  }
}
