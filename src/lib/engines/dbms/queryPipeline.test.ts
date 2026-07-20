import { describe, expect, it } from 'vitest';
import {
  QUERY_SCENARIOS,
  createQueryPipeline,
  createQueryScenario,
  evaluateClausePrediction
} from './queryPipeline';

describe('SQL query pipeline', () => {
  it('offers two curated scenarios over one consistent HR dataset', () => {
    expect(QUERY_SCENARIOS).toHaveLength(2);
    const active = createQueryScenario('active-department-payroll');
    const dhaka = createQueryScenario('dhaka-department-capacity');

    expect(active.sourceTables).toEqual(dhaka.sourceTables);
    expect(active.sourceTables.map((table) => [table.name, table.rows.length])).toEqual([
      ['departments', 4],
      ['employees', 9]
    ]);
  });

  it('uses the complete logical teaching order in both scenarios', () => {
    for (const { id } of QUERY_SCENARIOS) {
      expect(createQueryPipeline(id).map((stage) => stage.operation)).toEqual([
        'FROM',
        'JOIN',
        'WHERE',
        'GROUP BY',
        'HAVING',
        'SELECT',
        'ORDER BY',
        'LIMIT'
      ]);
    }
  });

  it('keeps deterministic intermediate rows for active payroll', () => {
    const scenario = createQueryScenario('active-department-payroll');

    expect(scenario.stages.map((stage) => stage.rows.length)).toEqual([9, 8, 5, 3, 2, 2, 2, 2]);
    expect(scenario.stages[1].rows.some((row) => row.employee_name === 'Iman')).toBe(false);
    expect(scenario.stages[2].rows.every((row) => row.status === 'Active')).toBe(true);
    expect(scenario.stages[3].rows).toEqual([
      {
        department_id: 10,
        department_name: 'Engineering',
        active_employees: 2,
        total_salary: 220000,
        average_salary: 110000,
        group_members: 'Aisha, Farhan'
      },
      {
        department_id: 20,
        department_name: 'Sales',
        active_employees: 2,
        total_salary: 165000,
        average_salary: 82500,
        group_members: 'Omar, Nila'
      },
      {
        department_id: 30,
        department_name: 'Support',
        active_employees: 1,
        total_salary: 65000,
        average_salary: 65000,
        group_members: 'Rafi'
      }
    ]);
    expect(scenario.stages.at(-1)?.rows).toEqual([
      {
        department: 'Engineering',
        active_employees: 2,
        total_salary: 220000,
        average_salary: 110000
      },
      {
        department: 'Sales',
        active_employees: 2,
        total_salary: 165000,
        average_salary: 82500
      }
    ]);
  });

  it('preserves an unmatched department through the LEFT JOIN and counts non-NULL ids', () => {
    const scenario = createQueryScenario('dhaka-department-capacity');
    const joinRows = scenario.stages[1].rows;
    const peopleJoin = joinRows.find((row) => row.department_name === 'People');

    expect(scenario.joinLabel).toBe('LEFT JOIN');
    expect(joinRows).toHaveLength(9);
    expect(peopleJoin).toMatchObject({ employee_id: null, employee_name: null, salary: null });
    expect(scenario.stages.map((stage) => stage.rows.length)).toEqual([4, 9, 6, 3, 2, 2, 2, 1]);
    expect(scenario.stages[3].rows.find((row) => row.department_name === 'People')).toMatchObject({
      staff_count: 0,
      total_salary: null,
      average_salary: null
    });
    expect(scenario.stages.at(-1)?.rows).toEqual([
      {
        department: 'Engineering',
        staff_count: 3,
        total_salary: 300000,
        average_salary: 100000
      }
    ]);
  });

  it('separates logical teaching order from an explicitly illustrative physical plan', () => {
    const scenario = createQueryScenario();

    expect(scenario.stages[0].operation).toBe('FROM');
    expect(scenario.stages[2].operation).toBe('WHERE');
    expect(scenario.physicalPlan[0].operator).toBe('Filtered employee scan');
    expect(scenario.physicalPlanCaveat).toContain('not output captured from a database optimizer');
  });

  it('classifies WHERE versus HAVING predictions deterministically', () => {
    expect(evaluateClausePrediction(' having ')).toEqual({
      correct: true,
      answer: 'HAVING',
      correctAnswer: 'HAVING',
      misconception: null,
      feedback: 'Correct. HAVING evaluates aggregate groups after GROUP BY.'
    });
    expect(evaluateClausePrediction('WHERE')).toMatchObject({
      correct: false,
      answer: 'WHERE',
      correctAnswer: 'HAVING',
      misconception: 'where-vs-having'
    });
  });

  it('returns fresh rows so a learner trace cannot mutate another scenario run', () => {
    const first = createQueryScenario();
    first.stages[0].rows[0].employee_name = 'Changed';

    expect(createQueryScenario().stages[0].rows[0].employee_name).toBe('Aisha');
  });
});
