import { zodTextFormat } from 'openai/helpers/zod';
import { getOpenAI } from './client';
import { explanationSchema, type StepContext, type AiStepExplanation } from './schemas';
export function deterministicFallback(c: StepContext): AiStepExplanation {
  const bangla = c.explanationLanguage === 'bn';
  const groundingNote = bangla
    ? 'এই উত্তরটি ReplayCS-এর deterministic trace থেকে তৈরি fallback।'
    : 'This answer is the deterministic ReplayCS fallback.';

  if (c.interaction === 'hint') {
    const focus = c.activeSourceLines[0] ?? 'the highlighted operation';
    return {
      language: c.explanationLanguage,
      summary: bangla
        ? `ইঙ্গিত: ${focus}-এ কী পড়া হচ্ছে দেখুন।`
        : `Hint: inspect what ${focus} reads.`,
      whyNow: bangla
        ? 'পরের state না দেখে current operation-এর input এবং control flow অনুসরণ করুন।'
        : 'Follow the current operation’s inputs and control flow before revealing the next state.',
      stateChange: bangla
        ? 'ইঙ্গিতটি answer লুকিয়ে রেখেছে; prediction lock করার পর transition দেখা যাবে।'
        : 'The resulting state stays hidden until you lock a prediction.',
      unchangedState: [
        bangla
          ? 'কোনো recorded mutation এখনো reveal করা হয়নি।'
          : 'No recorded mutation is revealed by this hint.'
      ],
      commonMistake: bangla
        ? 'operation execute হওয়ার আগে outcome ধরে নেবেন না।'
        : 'Do not assume the outcome before applying the active operation.',
      groundingNote,
      checkQuestion: {
        prompt:
          c.currentPrediction?.prompt ??
          (bangla
            ? 'active operation কোন input পড়ে?'
            : 'Which input does the active operation read?'),
        expectedConcept: 'Reason from the active operation without revealing stateAfter.'
      }
    };
  }

  if (c.interaction === 'mistake') {
    const learnerAnswer = c.currentPrediction?.learnerAnswer ?? 'no answer recorded';
    const correctAnswer = c.currentPrediction?.correctAnswer ?? 'the deterministic trace result';
    return {
      language: c.explanationLanguage,
      summary: bangla
        ? `আপনার prediction (${learnerAnswer}) deterministic answer (${correctAnswer})-এর সাথে মেলেনি।`
        : `Your prediction (${learnerAnswer}) diverged from the deterministic answer (${correctAnswer}).`,
      whyNow: c.deterministicExplanation,
      stateChange: bangla
        ? `প্রথম divergence বোঝার জন্য recorded mutation দেখুন: ${JSON.stringify(c.mutation)}।`
        : `Use the recorded mutation to locate the first divergence: ${JSON.stringify(c.mutation)}.`,
      unchangedState: [
        bangla
          ? 'mutation তালিকায় না থাকা মানগুলো পরিবর্তিত হয়নি।'
          : 'Values absent from the mutation list did not change.'
      ],
      commonMistake: c.misconceptionTags.length
        ? `Recorded misconception: ${c.misconceptionTags.join(', ')}.`
        : 'Compare the predicted operation with the active deterministic operation.',
      groundingNote,
      recoveryChallenge: bangla
        ? 'একই operation আবার চালিয়ে mutation হওয়ার আগের value বলুন।'
        : 'Replay the same operation and name the value immediately before the mutation.',
      checkQuestion: {
        prompt: bangla ? 'প্রথম divergence কোথায় ঘটেছে?' : 'Where did the first divergence occur?',
        expectedConcept: 'Identify the first recorded mutation that conflicts with the prediction.'
      }
    };
  }

  return {
    language: c.explanationLanguage,
    summary:
      c.interaction === 'simplify' && !bangla
        ? `In plain terms: ${c.deterministicExplanation}`
        : bangla
          ? `এই ধাপে: ${c.deterministicExplanation}`
          : c.deterministicExplanation,
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
    groundingNote,
    checkQuestion: {
      prompt: bangla ? 'এই ধাপে কোন মানটি পরিবর্তিত হয়েছে?' : 'Which value changed in this step?',
      expectedConcept: 'Identify the recorded mutation.'
    }
  };
}

export function parsedExplanationOrFallback(c: StepContext, parsed: AiStepExplanation | null) {
  if (parsed) return { available: true, source: 'ai' as const, explanation: parsed };
  return {
    available: false,
    source: 'fallback' as const,
    reason: 'invalid-output' as const,
    explanation: deterministicFallback(c)
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
    return parsedExplanationOrFallback(c, response.output_parsed);
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
