import type { ComplexityFamilyDefinition, OperationDefinition } from './types';

export interface ValidationIssue {
  path: string;
  message: string;
}

function requireText(value: string, path: string, issues: ValidationIssue[]) {
  if (!value.trim()) issues.push({ path, message: 'Must not be empty.' });
}

export function validateOperationDefinition(definition: OperationDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  requireText(definition.id, 'id', issues);
  requireText(definition.topicId, 'topicId', issues);
  requireText(definition.name, 'name', issues);
  requireText(definition.description, 'description', issues);
  if (!definition.variants.length) issues.push({ path: 'variants', message: 'Add a variant.' });
  if (!definition.cases.length) issues.push({ path: 'cases', message: 'Add a complexity case.' });

  const caseIds = new Set<string>();
  for (const [index, operationCase] of definition.cases.entries()) {
    const path = `cases[${index}]`;
    if (caseIds.has(operationCase.id)) {
      issues.push({ path: `${path}.id`, message: `Duplicate case ID: ${operationCase.id}` });
    }
    caseIds.add(operationCase.id);
    if (operationCase.operationId !== definition.id) {
      issues.push({ path: `${path}.operationId`, message: 'Must reference the parent operation.' });
    }
    if (!definition.variants.includes(operationCase.implementationVariant)) {
      issues.push({
        path: `${path}.implementationVariant`,
        message: 'Must reference a declared implementation variant.'
      });
    }
    requireText(operationCase.id, `${path}.id`, issues);
    requireText(operationCase.title, `${path}.title`, issues);
    requireText(operationCase.auxiliarySpace, `${path}.auxiliarySpace`, issues);
    requireText(operationCase.scenarioDescription, `${path}.scenarioDescription`, issues);
    requireText(operationCase.traceLessonId, `${path}.traceLessonId`, issues);
    if (!operationCase.assumptions.length) {
      issues.push({ path: `${path}.assumptions`, message: 'State at least one assumption.' });
    }
    if (!operationCase.derivationSteps.length) {
      issues.push({ path: `${path}.derivationSteps`, message: 'Show the derivation.' });
    }
  }
  return issues;
}

export function validateComplexityFamilies(
  families: readonly ComplexityFamilyDefinition[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();
  for (const [index, family] of families.entries()) {
    const path = `families[${index}]`;
    if (ids.has(family.id)) {
      issues.push({ path: `${path}.id`, message: `Duplicate family ID: ${family.id}` });
    }
    ids.add(family.id);
    requireText(family.notation, `${path}.notation`, issues);
    requireText(family.formula, `${path}.formula`, issues);
    requireText(family.summary, `${path}.summary`, issues);
    if (!family.scenarios.length) {
      issues.push({ path: `${path}.scenarios`, message: 'Add a real scenario.' });
    }
    if (!family.assumptions.length) {
      issues.push({ path: `${path}.assumptions`, message: 'State assumptions.' });
    }
    if (!family.derivation.length) {
      issues.push({ path: `${path}.derivation`, message: 'Show a derivation.' });
    }
  }
  return issues;
}
