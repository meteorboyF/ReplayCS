export type SubjectId = 'dsa-1' | 'dsa-2' | 'dbms' | 'operating-systems' | 'computer-networks';
export type SupportedLanguage = 'c' | 'cpp' | 'java' | 'python';
export type TraceValue =
  string | number | boolean | null | TraceValue[] | { [key: string]: TraceValue };
export interface SourceLine {
  id: string;
  number: number;
  text: string;
  semanticOperationId?: string;
}
export interface TraceEntity {
  id: string;
  type:
    | 'variable'
    | 'array'
    | 'array-cell'
    | 'node'
    | 'edge'
    | 'pointer'
    | 'stack-frame'
    | 'queue-item'
    | 'table'
    | 'row'
    | 'process'
    | 'memory-page'
    | 'lock'
    | 'packet'
    | 'protocol-layer';
  label: string;
  value?: TraceValue;
  metadata?: Record<string, TraceValue>;
}
export interface TraceMutation {
  entityId: string;
  property: string;
  previousValue: TraceValue;
  nextValue: TraceValue;
  animation?:
    | 'highlight'
    | 'move'
    | 'swap'
    | 'insert'
    | 'remove'
    | 'compare'
    | 'activate'
    | 'deactivate'
    | 'pulse';
}
export interface PredictionChallenge {
  id: string;
  prompt: string;
  type: 'multiple-choice' | 'numeric' | 'boolean' | 'text' | 'select-entity' | 'reorder';
  options?: { id: string; label: string; value: TraceValue }[];
  correctAnswer: TraceValue;
  explanation: string;
  misconceptionTags?: string[];
  xpReward: number;
}
export interface TraceStep {
  id: string;
  index: number;
  title: string;
  eventType: string;
  sourceLineIds: string[];
  semanticOperationId: string;
  stateBefore: Record<string, TraceValue>;
  stateAfter: Record<string, TraceValue>;
  entities: TraceEntity[];
  mutations: TraceMutation[];
  deterministicExplanation: string;
  visualFocus: string[];
  prediction?: PredictionChallenge;
  complexityCost?: { comparisons?: number; reads?: number; writes?: number; swaps?: number };
  metadata?: Record<string, TraceValue>;
}
export interface TraceLesson {
  id: string;
  subject: SubjectId;
  topic: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  learningObjectives: string[];
  supportedLanguages: SupportedLanguage[];
  sourceByLanguage: Record<SupportedLanguage, SourceLine[]>;
  initialState: Record<string, TraceValue>;
  steps: TraceStep[];
  completionCriteria: { requiredCorrectPredictions: number; masteryThreshold: number };
}
