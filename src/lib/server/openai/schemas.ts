import { z } from 'zod';
export const stepContextSchema = z.object({
  subject: z.string().max(40),
  lesson: z.string().max(80),
  learningObjective: z.string().max(300).default('Understand the current state transition'),
  selectedLanguage: z.enum(['c', 'cpp', 'java', 'python']).optional(),
  activeSourceLines: z.array(z.string().max(300)).max(8).default([]),
  stateBefore: z.record(z.unknown()),
  mutation: z.array(z.unknown()).max(30).default([]),
  stateAfter: z.record(z.unknown()),
  deterministicExplanation: z.string().min(1).max(1500),
  learnerLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  misconceptionTags: z.array(z.string().max(60)).max(10).default([])
});
export const explanationSchema = z.object({
  summary: z.string(),
  whyNow: z.string(),
  stateChange: z.string(),
  unchangedState: z.array(z.string()),
  commonMistake: z.string().optional(),
  analogy: z.string().optional(),
  checkQuestion: z.object({ prompt: z.string(), expectedConcept: z.string() })
});
export type StepContext = z.infer<typeof stepContextSchema>;
export type AiStepExplanation = z.infer<typeof explanationSchema>;
